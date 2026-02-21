import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendSMS } from "@/lib/twilio-client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const callerNumber = formData.get("From") as string || formData.get("Caller") as string;
    const calledNumber = formData.get("To") as string || formData.get("Called") as string;

    console.log(`📞 Call status update: ${callSid} → ${dialCallStatus}`);

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
        `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Check if call was missed (not answered)
    const missedStatuses = ["no-answer", "busy", "failed", "canceled"];
    const isMissed = missedStatuses.includes(dialCallStatus);

    if (isMissed) {
      console.log(`📵 Missed call from ${callerNumber} to ${profile.business_name}`);

      // Create a lead for the missed call
      const { data: lead } = await supabase
        .from("leads")
        .insert({
          user_id: profile.id,
          name: callerNumber,
          phone: callerNumber,
          message: `Missed call from ${callerNumber}`,
          source: "missed_call",
          urgency: "hot",
          category: "Missed Call",
          ai_summary: `Customer called but nobody answered. Automatic text-back sent.`,
          status: "new",
        })
        .select()
        .single();

      // Log the call event
      await supabase
        .from("call_events")
        .update({
          status: "missed",
          text_back_sent: true,
          lead_id: lead?.id,
        })
        .eq("twilio_call_sid", callSid);

      // Send the instant text-back SMS
      const tone = profile.response_tone || "friendly";
      const businessName = profile.business_name || "us";
      
      let textBackMessage: string;
      if (tone === "professional") {
        textBackMessage = `Hi, thanks for calling ${businessName}. We missed your call but want to help. Could you let us know what you need and we'll get back to you shortly?`;
      } else if (tone === "casual") {
        textBackMessage = `Hey! Sorry we missed your call to ${businessName}. We're probably on a job right now. What can we help you with? Just reply here and we'll sort you out 👍`;
      } else {
        textBackMessage = `Hi, thanks for calling ${businessName}. Sorry we couldn't get to the phone — we're likely on a job. How can we help? Just reply to this text and we'll get back to you ASAP.`;
      }

      try {
        const messageSid = await sendSMS(callerNumber, textBackMessage);

        // Create SMS conversation for follow-up
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

        // Log the outbound text-back message
        if (conversation) {
          await supabase.from("sms_messages").insert({
            conversation_id: conversation.id,
            direction: "outbound",
            body: textBackMessage,
            twilio_message_sid: messageSid,
            sender: "ai",
          });
        }

        // Log activity on the lead
        if (lead) {
          await supabase.from("lead_activities").insert({
            lead_id: lead.id,
            user_id: profile.id,
            type: "auto_reply",
            description: `Missed call detected. Instant text-back sent: "${textBackMessage.substring(0, 80)}..."`,
          });
        }

        // Notify the business owner via email
        try {
          const { sendEmail } = await import("@/lib/email-service");
          await sendEmail({
            to: profile.email,
            subject: `📵 Missed call from ${callerNumber}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px;">
                <h2 style="color: #ef4444;">📵 Missed Call Alert</h2>
                <p>You missed a call from <strong>${callerNumber}</strong>.</p>
                <p>Don't worry — AutoFlow sent an instant text-back:</p>
                <blockquote style="background: #f1f5f9; padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                  ${textBackMessage}
                </blockquote>
                <p>If they reply, the AI will continue the conversation. Check your <a href="https://autoflow-puce.vercel.app/dashboard/leads">dashboard</a> for updates.</p>
              </div>
            `,
            fromName: "AutoFlow AI",
          });
        } catch (emailError) {
          console.error("Failed to send owner notification email:", emailError);
        }

        console.log(`✅ Text-back sent to ${callerNumber}: ${messageSid}`);
      } catch (smsError) {
        console.error("❌ Failed to send text-back SMS:", smsError);
        // Update call event to reflect failure
        await supabase
          .from("call_events")
          .update({ text_back_sent: false })
          .eq("twilio_call_sid", callSid);
      }

      // Return TwiML for voicemail option
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we can't take your call right now. We've sent you a text message. You can also leave a voicemail after the beep.</Say>
  <Record maxLength="120" action="https://autoflow-puce.vercel.app/api/twilio/recording" transcribe="true" transcribeCallback="https://autoflow-puce.vercel.app/api/twilio/recording"/>
  <Say voice="alice">We didn't receive a recording. Goodbye.</Say>
</Response>`;

      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Call was answered — update the call event
    await supabase
      .from("call_events")
      .update({ status: "answered" })
      .eq("twilio_call_sid", callSid);

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("❌ Call status webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
