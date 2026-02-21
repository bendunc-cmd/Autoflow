import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Twilio sends form-encoded data to voice webhooks
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callerNumber = formData.get("From") as string;
    const calledNumber = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;

    console.log(`📞 Incoming call from ${callerNumber} to ${calledNumber} (${callSid})`);

    // Look up business by Twilio phone number
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("twilio_phone_number", calledNumber)
      .single();

    if (!profile || !profile.forwarding_number) {
      // No business found or no forwarding number — play a message
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
      status: "ringing",
    });

    // Build the callback URL for when the call ends
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "https://autoflow-puce.vercel.app"
      : "https://autoflow-puce.vercel.app";

    // Forward call to the business owner's real phone
    // If no answer after 20 seconds, trigger voicemail + text-back
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" action="${baseUrl}/api/twilio/voice/status" method="POST">
    <Number statusCallbackEvent="completed" statusCallback="${baseUrl}/api/twilio/voice/status">${profile.forwarding_number}</Number>
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("❌ Voice webhook error:", error);
    // Return a safe TwiML response on error
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
