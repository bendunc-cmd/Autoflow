import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// GET - fetch bookings with optional date range
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  let query = supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (startDate) query = query.gte("booking_date", startDate);
  if (endDate) query = query.lte("booking_date", endDate);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data });
}

// POST - create a new booking
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_email,
      title,
      description,
      booking_date,
      start_time,
      end_time,
      notes,
      lead_id,
      source,
    } = body;

    if (!customer_name || !booking_date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: customer_name, booking_date, start_time, end_time" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        customer_name,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        title: title || `Job: ${customer_name}`,
        description: description || null,
        booking_date,
        start_time,
        end_time,
        notes: notes || null,
        lead_id: lead_id || null,
        source: source || "manual",
        status: "confirmed",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// PATCH - update a booking (status, details, etc)
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { booking_id, ...updates } = body;

    if (!booking_id) {
      return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", booking_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// DELETE - remove a booking
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("id");

  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
