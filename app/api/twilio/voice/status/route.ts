import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendSMS } from "@/lib/twilio-client";

// Twilio sends form-encoded data to voice webhooks
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const callerNumber = formData.get("From") as string || formData.get("Caller") as string;
    const calledNumber = formData.get("To") as string || formData.get("Called") as string;

    // Recording callback fields (sent when <Record> action fires)
    const recordingUrl = formData.get("RecordingUrl") as string | null;
    const recordingDuration = formData.get("RecordingDuration") as string | null;

    console.log(`📞 Call status update: ${callSid} - dialCallStatus: ${dialCallStatus}, recordingUrl: ${recordingUrl ? "yes" : "no"}`);

    const supabase = createAdminClient();

    // Look up the business profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("twilio_phone_number", calledNumber)
      .single();

    if (!profile) {
      console.error("❌ No profile found for number:", calledNumber);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry, this number is not currently configured.</Say><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Check if call was missed (not answered) — DIRECT CALL flow
    const missedStatuses = ["no-answer", "busy", "failed", "cancelled"];
    const isMissed = missedStatuses.includes(dialCallStatus);

    // Check if this is a FORWARDED CALL that completed voicemail recording
    // When a forwarded call hits <Record action="...voice/status">, Twilio sends
    // the recording data here but dialCallStatus will be null/undefined
    const isForwardedVoicemail = !dialCallStatus && recordingUrl;

    // Also check: look up the original call_event to see if it was forwarded
    let isForwardedCall = false;
    if (!isMissed && !isForwardedVoicemail) {
      const { data: callEvent } = await supabase
        .from("call_events")
        .select("forwarded_from")
        .eq("twilio_call_sid", callSid)
        .single();
      if (callEvent?.forwarded_from) {
        isForwardedCall = true;
      }
    }

    const shouldProcessAsMissed = isMissed || isForwardedVoicemail || isForwardedCall;

    if (shouldProcessAsMissed) {
      const reason = isMissed ? "direct missed call" : isForwardedVoicemail ? "forwarded call voicemail" : "forwarded call";
      console.log(`📵 Processing as missed call (${reason}) from ${callerNumber} to ${profile.business_name}`);

      // ============================================
      // STEP 1: Check if a lead already exists for this call
      // (The recording callback might have already created one)
      // ============================================
      let lead: any = null;

      // First check if a lead was already created for this caller recently (within last 5 min)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingLead } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", profile.id)
        .eq("phone", callerNumber)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingLead) {
        lead = existingLead;
        console.log("✅ Found existing lead:", lead.id);
      } else {
        // Create new lead
        try {
          const { data: leadData, error: leadError } = await supabase
            .from("leads")
            .insert({
              user_id: profile.id,
              name: callerNumber,
              phone: callerNumber,
              message: `Missed call from ${callerNumber}`,
              source: "missed_call",
              urgency: "hot",
              category: "Missed Call",
              ai_summary: "Customer called but nobody answered. Automatic text-back sent.",
              status: "new",
            })
            .select()
            .single();

          if (leadError) {
            console.error("❌ Lead insert error:", JSON.stringify(leadError));
          } else {
            lead = leadData;
            console.log("✅ Lead created:", lead.id);
          }
        } catch (leadCatchError) {
          console.error("❌ Lead insert exception:", leadCatchError);
        }
      }

      // ============================================
      // STEP 2: Log the call event — wrapped in its OWN try/catch
      // ============================================
      try {
        const { error: callEventError } = await supabase
          .from("call_events")
          .update({
            lead_id: lead?.id,
            status: "missed",
            text_back_sent: false, // Will update after SMS attempt
          })
          .eq("twilio_call_sid", callSid);

        if (callEventError) {
          // If update fails (no existing row), try insert
          await supabase
            .from("call_events")
            .insert({
              user_id: profile.id,
              lead_id: lead?.id,
              status: "missed",
              caller_number: callerNumber,
              text_back_sent: false,
              twilio_call_sid: callSid,
            });
        }
        console.log("✅ Call event logged");
      } catch (callEventCatchError) {
        console.error("❌ Call event insert exception:", callEventCatchError);
      }

      // ============================================
      // STEP 3: Send the instant text-back SMS
      // ============================================
      const tone = profile.response_tone || "friendly";
      const businessName = profile.business_name || "us";

      let textBackMessage: string;
      if (tone === "professional") {
        textBackMessage = `Hi, Thanks for calling ${businessName}. We missed your call but want to help. Could you let us know what you need?`;
      } else if (tone === "casual") {
        textBackMessage = `Hey! Sorry we missed your call to ${businessName}. We're probably on a job right now. What can we help you with?`;
      } else {
        textBackMessage = `Hi, Thanks for calling ${businessName}. Sorry we couldn't get to the phone - we're likely on a job. How can we help?`;
      }

      let smsSent = false;
      let messageId: string | null = null;
      try {
        messageId = await sendSMS(callerNumber, textBackMessage);
        smsSent = true;
        console.log("✅ Text-back SMS sent:", messageId);
      } catch (smsError) {
        console.error("❌ Failed to send text-back SMS:", smsError);
      }

      // ============================================
      // STEP 4: Create SMS conversation for follow-up (only if SMS sent)
      // ============================================
      if (smsSent) {
        try {
          const { data: conversation } = await supabase
            .from("sms_conversations")
            .insert({
              user_id: profile.id,
              lead_id: lead?.id,
              customer_number: callerNumber,
              business_number: calledNumber,
              status: "active",
              stage: "greeting",
              message_count: 1,
            })
            .select()
            .single();

          if (conversation) {
            await supabase.from("sms_messages").insert({
              conversation_id: conversation.id,
              direction: "outbound",
              body: textBackMessage,
              twilio_message_sid: messageId,
              sender: "ai",
            });
          }
        } catch (convError) {
          console.error("❌ SMS conversation creation error:", convError);
        }
      }

      // ============================================
      // STEP 5: Log activity on the lead
      // ============================================
      if (lead) {
        try {
          await supabase.from("lead_activities").insert({
            lead_id: lead.id,
            user_id: profile.id,
            type: "auto_reply",
            description: `Missed call detected. Instant text-back ${smsSent ? "sent" : "failed"}: "${textBackMessage.substring(0, 80)}..."`,
          });
        } catch (activityError) {
          console.error("❌ Lead activity insert error:", activityError);
        }
      }

      // ============================================
      // STEP 6: Notify the business owner via email
      // ============================================
      try {
        const { sendEmail } = await import("@/lib/email-service");
        await sendEmail({
          to: profile.email,
          subject: `📞 Missed call from ${callerNumber}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="color: #ef4444;">🔴 Missed Call Alert</h2>
              <p>You missed a call from <strong>${callerNumber}</strong>.</p>
              <p>An automatic text-back was ${smsSent ? 'sent' : 'attempted but failed'} on your behalf.</p>
              ${smsSent ? `<blockquote style="background: #f0fdf4; padding: 12px; border-left: 3px solid #22c55e;">${textBackMessage}</blockquote>` : ''}
              <p>If they reply, the AI will continue the conversation. Check your CRM: <a href="https://autoflow-puce.vercel.app/dashboard/leads">Dashboard</a></p>
            </div>`,
          fromName: "AutoFlow AI",
        });
        console.log("✅ Owner notification email sent");
      } catch (emailError) {
        console.error("❌ Failed to send owner notification email:", emailError);
      }

      console.log(`✅ Text-back sent to ${callerNumber}: ${smsSent}`);

      // Update call_events with text_back_sent status
      try {
        await supabase
          .from("call_events")
          .update({ text_back_sent: smsSent })
          .eq("twilio_call_sid", callSid);
      } catch (updateError) {
        console.error("❌ Call event update error:", updateError);
      }
    }

    // Build TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we can't take your call right now. We've sent you a text message. You can also leave a voicemail after the tone.</Say>
  <Record maxLength="120" action="https://autoflow-puce.vercel.app/api/twilio/recording" transcribe="true" transcribeCallback="https://autoflow-puce.vercel.app/api/twilio/recording"/>
  <Say voice="alice">We didn't receive a recording. Goodbye.</Say>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("❌ Call status webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry, we're experiencing technical difficulties.</Say><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
