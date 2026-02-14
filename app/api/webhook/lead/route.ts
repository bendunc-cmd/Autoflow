import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { analyseLead } from "@/lib/ai-engine";
import { sendEmail, sendLeadNotification } from "@/lib/email-service";

// Allow CORS for external form submissions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message, api_key } = body;

    // Validate required fields
    if (!name || !email || !message || !api_key) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, message, api_key" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createAdminClient();

    // Look up the user by API key (stored in profiles table)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("api_key", api_key)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if auto-reply is enabled
    const autoReplyEnabled = profile.auto_reply_enabled !== false;

    // Analyse the lead with AI
    const analysis = await analyseLead(name, message, {
      businessName: profile.business_name || "Business",
      businessDescription: profile.business_description,
      businessServices: profile.business_services,
      businessPhone: profile.business_phone,
      businessAddress: profile.business_address,
      responseTone: profile.response_tone,
      industry: profile.industry,
    });

    // Calculate follow-up time based on urgency
    const followUpHours = analysis.urgency === "hot" ? 2 : analysis.urgency === "warm" ? 24 : 48;
    const nextFollowUp = new Date();
    nextFollowUp.setHours(nextFollowUp.getHours() + followUpHours);

    // Save the lead to database
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        user_id: profile.id,
        name,
        email,
        phone: phone || null,
        message,
        source: body.source || "website_form",
        urgency: analysis.urgency,
        category: analysis.category,
        ai_summary: analysis.summary,
        status: "new",
        follow_up_count: 0,
        next_follow_up_at: nextFollowUp.toISOString(),
      })
      .select()
      .single();

    if (leadError) {
      console.error("Lead insert error:", leadError);
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Send auto-reply to customer if enabled
    let autoReplySent = false;
    if (autoReplyEnabled) {
      const emailResult = await sendEmail({
        to: email,
        subject: `Re: Your enquiry to ${profile.business_name || "us"}`,
        body: analysis.suggestedResponse,
        businessName: profile.business_name || "Business",
        replyTo: profile.email,
      });

      if (emailResult.success) {
        autoReplySent = true;

        // Update lead with sent response
        await supabase
          .from("leads")
          .update({ ai_response_sent: analysis.suggestedResponse })
          .eq("id", lead.id);

        // Log the auto-reply activity
        await supabase.from("lead_activities").insert({
          lead_id: lead.id,
          user_id: profile.id,
          type: "auto_reply",
          description: `AI auto-reply sent to ${email}`,
          metadata: {
            email_id: emailResult.id,
            response_preview: analysis.suggestedResponse.substring(0, 200),
          },
        });
      }
    }

    // Send notification to business owner
    await sendLeadNotification({
      to: profile.email,
      leadName: name,
      leadEmail: email,
      leadMessage: message,
      urgency: analysis.urgency,
      category: analysis.category,
      aiSummary: analysis.summary,
      businessName: profile.business_name || "Business",
    });

    // Log notification activity
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      user_id: profile.id,
      type: "note",
      description: `Lead notification sent to ${profile.email}`,
    });

    return NextResponse.json(
      {
        success: true,
        lead_id: lead.id,
        urgency: analysis.urgency,
        category: analysis.category,
        auto_reply_sent: autoReplySent,
        message: "Lead received and processed successfully",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
