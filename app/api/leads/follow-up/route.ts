import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { generateFollowUp } from "@/lib/ai-engine";
import { sendEmail } from "@/lib/email-service";

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find leads due for follow-up
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*, profiles!leads_user_id_fkey(*)")
    .lte("next_follow_up_at", now)
    .in("status", ["new", "contacted"])
    .lt("follow_up_count", 3) // Max 3 follow-ups
    .order("next_follow_up_at", { ascending: true })
    .limit(20);

  if (error || !leads) {
    console.error("Follow-up query error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }

  let processed = 0;
  let sent = 0;

  for (const lead of leads) {
    const profile = lead.profiles;
    if (!profile || !profile.auto_reply_enabled) continue;

    processed++;

    try {
      // Generate AI follow-up
      const followUpBody = await generateFollowUp(
        lead.name,
        lead.message,
        lead.follow_up_count + 1,
        {
          businessName: profile.business_name || "Business",
          businessDescription: profile.business_description,
          businessServices: profile.business_services,
          businessPhone: profile.business_phone,
          businessAddress: profile.business_address,
          responseTone: profile.response_tone,
          industry: profile.industry,
        }
      );

      // Send follow-up email
      const result = await sendEmail({
        to: lead.email,
        subject: `Following up — ${profile.business_name || "Business"}`,
        body: followUpBody,
        businessName: profile.business_name || "Business",
        replyTo: profile.email,
      });

      if (result.success) {
        sent++;

        // Calculate next follow-up (each one waits longer)
        const newFollowUpCount = lead.follow_up_count + 1;
        const hoursUntilNext = newFollowUpCount >= 3 ? null : newFollowUpCount * 48;
        const nextFollowUp = hoursUntilNext
          ? new Date(Date.now() + hoursUntilNext * 60 * 60 * 1000).toISOString()
          : null;

        // Update lead
        await supabase
          .from("leads")
          .update({
            follow_up_count: newFollowUpCount,
            next_follow_up_at: nextFollowUp,
            status: "contacted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id);

        // Log activity
        await supabase.from("lead_activities").insert({
          lead_id: lead.id,
          user_id: lead.user_id,
          type: "follow_up",
          description: `Follow-up #${newFollowUpCount} sent to ${lead.email}`,
          metadata: {
            email_id: result.id,
            follow_up_number: newFollowUpCount,
          },
        });
      }
    } catch (err) {
      console.error(`Follow-up error for lead ${lead.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    sent,
    timestamp: now,
  });
}
