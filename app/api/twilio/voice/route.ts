import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Twilio sends form-encoded data to voice webhooks
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callerNumber = formData.get("From") as string;
    const calledNumber = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;

    // Forwarded call detection fields
    const sipHeader = formData.get("SipHeader_X-Forwarded") as string | null;
    const forwardedFrom = formData.get("ForwardedFrom") as string | null;

    console.log(`📞 Incoming call from ${callerNumber} to ${calledNumber} (${callSid})`);
    if (forwardedFrom) console.log(`↪️ Forwarded from: ${forwardedFrom}`);

    // Look up business by Twilio phone number
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("twilio_phone_number", calledNumber)
      .single();

    if (!profile) {
      console.error("❌ No profile found for number:", calledNumber);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, this number is not currently configured. Please try again later.</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Log the incoming call event
    await supabase.from("call_events").insert({
      user_id: profile.id,
      twilio_call_sid: callSid,
      caller_number: callerNumber,
      called_number: calledNumber,
      forwarded_from: forwardedFrom || null,
      status: "ringing",
    });

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "https://autoflow-puce.vercel.app"
      : "https://autoflow-puce.vercel.app";

    // ── Determine call flow ──────────────────────────────────
    // Check if this is a forwarded call from the business owner's number
    // Twilio sends ForwardedFrom when a carrier forwards the call
    // If forwarded, the owner already didn't answer — go straight to voicemail
    const isForwarded = !!forwardedFrom;

    if (isForwarded) {
      // ── FORWARDED CALL FLOW ────────────────────────────────
      // The business owner already missed this call on their personal phone
      // Go straight to voicemail prompt + recording
      console.log(`📱 Forwarded call detected — going straight to voicemail`);

      const businessName = profile.business_name || "us";
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hi, thanks for calling ${businessName}. We're sorry we missed your call. Please leave a message after the tone and we'll get back to you shortly. Or just hang up and we'll send you a text message.</Say>
  <Record maxLength="120" action="${baseUrl}/api/twilio/voice/status" transcribe="true" transcribeCallback="${baseUrl}/api/twilio/recording" playBeep="true" />
  <Say voice="alice">We didn't receive a recording. We'll send you a text message shortly. Goodbye.</Say>
</Response>`;

      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // ── DIRECT CALL FLOW ───────────────────────────────────
    // Someone called the Twilio number directly (e.g. from the website)
    // Try to connect them to the business owner first
    console.log(`📞 Direct call — forwarding to ${profile.forwarding_number}`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="15" action="${baseUrl}/api/twilio/voice/status" method="POST">
    <Number statusCallbackEvent="completed" statusCallback="${baseUrl}/api/twilio/voice/status">${profile.forwarding_number}</Number>
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("❌ Voice webhook error:", error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
