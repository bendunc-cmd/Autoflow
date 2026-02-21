import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { analyseLead } from "@/lib/ai-engine";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingSid = formData.get("RecordingSid") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;
    const callerNumber = formData.get("From") as string || formData.get("Caller") as string;
    const calledNumber = formData.get("To") as string || formData.get("Called") as string;

    // Twilio transcription callback fields
    const transcriptionText = formData.get("TranscriptionText") as string;
    const transcriptionStatus = formData.get("TranscriptionStatus") as string;

    console.log(`🎙️ Recording received from ${callerNumber} (${recordingSid})`);

    const supabase = createAdminClient();

    // Look up business profile
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

    // Update the call event with recording info
    await supabase
      .from("call_events")
      .update({
        status: "voicemail",
        recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
        duration_seconds: parseInt(recordingDuration || "0"),
        transcription: transcriptionText || null,
      })
      .eq("twilio_call_sid", callSid);

    // If we have a transcription, run it through AI analysis
    if (transcriptionText && transcriptionText.trim().length > 0) {
      const businessContext = {
        businessName: profile.business_name || "",
        businessDescription: profile.business_description || null,
        businessServices: profile.business_services || null,
        businessPhone: profile.business_phone || null,
        businessAddress: profile.business_address || null,
        responseTone: profile.response_tone || "friendly",
        industry: profile.industry || null,
      };

      try {
        const analysis = await analyseLead(
          callerNumber,
          `[Voicemail transcription]: ${transcriptionText}`,
          businessContext
        );

        // Check if a lead already exists for this call (from the missed call handler)
        const { data: existingLead } = await supabase
          .from("leads")
          .select("*")
          .eq("user_id", profile.id)
          .eq("phone", callerNumber)
          .eq("source", "missed_call")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingLead) {
          // Update the existing missed_call lead with voicemail info
          await supabase
            .from("leads")
            .update({
              source: "voicemail",
              message: transcriptionText,
              urgency: analysis.urgency,
              category: analysis.category,
              ai_summary: analysis.summary,
              ai_response_sent: analysis.suggestedResponse,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingLead.id);

          // Log activity
          await supabase.from("lead_activities").insert({
            lead_id: existingLead.id,
            user_id: profile.id,
            type: "note",
            description: `Voicemail received and transcribed: "${transcriptionText.substring(0, 100)}..."`,
            metadata: {
              recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
              duration: recordingDuration,
            },
          });
        } else {
          // Create new lead from voicemail
          const { data: newLead } = await supabase
            .from("leads")
            .insert({
              user_id: profile.id,
              name: callerNumber,
              phone: callerNumber,
              message: transcriptionText,
              source: "voicemail",
              urgency: analysis.urgency,
              category: analysis.category,
              ai_summary: analysis.summary,
              ai_response_sent: analysis.suggestedResponse,
              status: "new",
            })
            .select()
            .single();

          // Update call event with lead_id
          if (newLead) {
            await supabase
              .from("call_events")
              .update({ lead_id: newLead.id })
              .eq("twilio_call_sid", callSid);
          }
        }

        // Notify business owner about voicemail
        try {
          const { sendEmail } = await import("@/lib/email-service");
          await sendEmail({
            to: profile.email,
            subject: `🎙️ New voicemail from ${callerNumber} — ${analysis.urgency.toUpperCase()}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px;">
                <h2 style="color: #8b5cf6;">🎙️ Voicemail Received</h2>
                <p><strong>From:</strong> ${callerNumber}</p>
                <p><strong>Urgency:</strong> ${analysis.urgency.toUpperCase()}</p>
                <p><strong>Category:</strong> ${analysis.category}</p>
                <p><strong>Transcription:</strong></p>
                <blockquote style="background: #f1f5f9; padding: 12px; border-radius: 8px;">${transcriptionText}</blockquote>
                <p><strong>AI Summary:</strong> ${analysis.summary}</p>
                ${recordingUrl ? `<p><a href="${recordingUrl}.mp3">Listen to voicemail</a></p>` : ""}
                <p>View in your <a href="https://autoflow-puce.vercel.app/dashboard/leads">dashboard</a>.</p>
              </div>
            `,
            fromName: "AutoFlow AI",
          });
        } catch (emailError) {
          console.error("Failed to send voicemail notification:", emailError);
        }
      } catch (aiError) {
        console.error("❌ Failed to analyse voicemail:", aiError);
      }
    }

    console.log(`✅ Voicemail processed for ${callerNumber}`);

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("❌ Recording webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
