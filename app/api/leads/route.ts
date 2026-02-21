import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lead_id, status } = body;

    if (!lead_id || !status) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error } = await supabase
      .from("leads")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(["converted", "lost"].includes(status) ? { next_follow_up_at: null } : {}),
      })
      .eq("id", lead_id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("lead_activities").insert({
      lead_id,
      user_id: user.id,
      type: "status_change",
      description: `Status changed to ${status}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, message } = body;

    if (!name || (!phone && !email)) {
      return NextResponse.json(
        { error: "Name and at least one contact method required" },
        { status: 400 }
      );
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,
        name,
        phone: phone || null,
        email: email || null,
        message: message || "Manual lead entry",
        source: "manual",
        urgency: "warm",
        category: "Manual Entry",
        ai_summary: message || "Manually entered lead.",
        status: "new",
      })
      .select()
      .single();

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      user_id: user.id,
      type: "note",
      description: "Lead created manually from dashboard",
    });

    return NextResponse.json({ success: true, lead });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
