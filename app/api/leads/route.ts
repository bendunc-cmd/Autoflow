import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// ── PATCH: Update lead status ───────────────────────────────
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

// ── POST: Create a new lead manually ────────────────────────
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
        { error: "Name and at least one contact method (phone or email) required" },
        { status: 400 }
      );
    }

    // ── Get business profile for AI context ──────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, business_services, industry")
      .eq("id", user.id)
      .single();

    // ── AI Analysis (if message provided) ────────────────
    let urgency = "warm";
    let category = "Manual Entry";
    let ai_summary = "Manually entered lead.";

    if (message && message.trim().length > 10) {
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const anthropic = new Anthropic();

        const aiResponse = await anthropic.messages.create({
