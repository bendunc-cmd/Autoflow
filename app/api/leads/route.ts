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
      return NextResponse.json({ error: "Missing lead_id or status" }, { status: 400 });
    }

    const validStatuses = ["new", "contacted", "qualified", "converted", "lost"];
    if (!validStatuses.includes(status)) {
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
