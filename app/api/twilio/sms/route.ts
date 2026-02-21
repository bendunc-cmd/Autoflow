import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendSMS } from "@/lib/twilio-client";
import { generateSMSResponse } from "@/lib/ai-engine";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const customerNumber = formData.get("From") as string;
    const businessNumber = formData.get("To") as string;
    const messageBody = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    console.log(`💬 Incoming SMS from ${customerNumber}: "${messageBody}"`);

    const supabase = createAdminClient();

    // Look up the business profile by Twilio number
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("twilio_phone_number", businessNumber)
      .single();

    if (!profile) {
      console.error("❌ No profile found for number:", businessNumber);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find or create an SMS conversation
    let { data: conversation } = await supabase
      .from("sms_conversations")
      .select("*")
      .eq("customer_number", customerNumber)
      .eq("business_number", businessNumber)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let lead;

    if (!conversation) {
      // New conversation — create lead and conversation
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          user_id: profile.id,
          name: customerNumber,
          phone: customerNumber,
          message: messageBody,
          source: "sms",
          urgency: "warm",
          category: "SMS Enquiry",
          ai_summary: `Customer initiated SMS conversation: "${messageBody.substring(0, 100)}"`,
          status: "new",
        })
        .select()
        .single();

      lead = newLead;

      const { data: newConversation } = await supabase
        .from("sms_conversations")
        .insert({
          user_id: profile.id,
          lead_id: newLead?.id,
          customer_number: customerNumber,
          business_number: businessNumber,
          status: "active",
          stage: "greeting",
          message_count: 1,
        })
        .select()
        .single();

      conversation = newConversation;
    } else {
      // Existing conversation — update message count
      await supabase
        .from("sms_conversations")
        .update({
          message_count: (conversation.message_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      // Get the linked lead
      if (conversation.lead_id) {
        const { data: existingLead } = await supabase
          .from("leads")
          .select("*")
          .eq("id", conversation.lead_id)
          .single();
        lead = existingLead;
      }
    }

    // Save the inbound message
    if (conversation) {
      await supabase.from("sms_messages").insert({
        conversation_id: conversation.id,
        direction: "inbound",
        body: messageBody,
        twilio_message_sid: messageSid,
        sender: "customer",
      });
    }

    // Check if conversation is escalated — don't auto-reply
    if (conversation?.status === "escalated") {
      console.log("⚠️ Conversation escalated — skipping AI reply, notifying owner");
      // Notify owner of new message in escalated conversation
      try {
        const { sendEmail } = await import("@/lib/email-service");
        await sendEmail({
          to: profile.email,
          subject: `💬 New message from ${customerNumber} (escalated)`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px;">
              <h2 style="color: #f59e0b;">💬 Escalated Conversation Update</h2>
              <p><strong>${customerNumber}</strong> replied:</p>
              <blockquote style="background: #f1f5f9; padding: 12px; border-radius: 8px;">${messageBody}</blockquote>
              <p>This conversation was escalated to you. Reply directly or via your <a href="https://autoflow-puce.vercel.app/dashboard/leads">dashboard</a>.</p>
            </div>
          `,
          fromName: "AutoFlow AI",
        });
      } catch (emailError) {
        console.error("Failed to send escalation notification:", emailError);
      }
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Get conversation history for context
    const { data: messageHistory } = await supabase
      .from("sms_messages")
      .select("*")
      .eq("conversation_id", conversation?.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Generate AI response
    const businessContext = {
      businessName: profile.business_name || "",
      businessDescription: profile.business_description || null,
      businessServices: profile.business_services || null,
      businessPhone: profile.business_phone || null,
      businessAddress: profile.business_address || null,
      responseTone: profile.response_tone || "friendly",
      industry: profile.industry || null,
    };

    const conversationHistory = (messageHistory || []).map((msg) => ({
      role: msg.sender === "customer" ? "customer" : "assistant",
      content: msg.body,
    }));

    const aiResponse = await generateSMSResponse(
      messageBody,
      conversationHistory,
      businessContext,
      conversation?.stage || "greeting"
    );

    // Check if AI wants to escalate
    if (aiResponse.shouldEscalate) {
      console.log("🚨 AI recommends escalation to business owner");

      // Update conversation status
      await supabase
        .from("sms_conversations")
        .update({ status: "escalated", updated_at: new Date().toISOString() })
        .eq("id", conversation?.id);

      // Update lead urgency to hot
      if (lead) {
        await supabase
          .from("leads")
          .update({ urgency: "hot", updated_at: new Date().toISOString() })
          .eq("id", lead.id);
      }

      // Notify owner
      try {
        const { sendEmail } = await import("@/lib/email-service");
        await sendEmail({
          to: profile.email,
          subject: `🚨 Lead needs your attention — ${customerNumber}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px;">
              <h2 style="color: #ef4444;">🚨 Escalated Lead</h2>
              <p>The AI thinks this customer needs to speak with you directly.</p>
              <p><strong>Customer:</strong> ${customerNumber}</p>
              <p><strong>Reason:</strong> ${aiResponse.escalationReason || "Customer needs personal attention"}</p>
              <p><strong>Their last message:</strong></p>
              <blockquote style="background: #f1f5f9; padding: 12px; border-radius: 8px;">${messageBody}</blockquote>
              <p>Check your <a href="https://autoflow-puce.vercel.app/dashboard/leads">dashboard</a> to respond.</p>
            </div>
          `,
          fromName: "AutoFlow AI",
        });
      } catch (emailError) {
        console.error("Failed to send escalation email:", emailError);
      }
    }

    // Send the AI response via SMS
    const replySid = await sendSMS(customerNumber, aiResponse.message);

    // Save the outbound message
    if (conversation) {
      await supabase.from("sms_messages").insert({
        conversation_id: conversation.id,
        direction: "outbound",
        body: aiResponse.message,
        twilio_message_sid: replySid,
        sender: "ai",
      });

      // Update conversation stage if AI suggests it
      if (aiResponse.newStage) {
        await supabase
          .from("sms_conversations")
          .update({ stage: aiResponse.newStage, updated_at: new Date().toISOString() })
          .eq("id", conversation.id);
      }
    }

    // Update lead with extracted info
    if (lead && aiResponse.extractedInfo) {
      const updates: Record<string, string> = {};
      if (aiResponse.extractedInfo.name) updates.name = aiResponse.extractedInfo.name;
      if (aiResponse.extractedInfo.email) updates.email = aiResponse.extractedInfo.email;
      if (aiResponse.extractedInfo.needs) updates.ai_summary = aiResponse.extractedInfo.needs;
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase.from("leads").update(updates).eq("id", lead.id);
      }
    }

    // Log activity
    if (lead) {
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        user_id: profile.id,
        type: "auto_reply",
        description: `AI SMS reply: "${aiResponse.message.substring(0, 80)}..."`,
      });
    }

    console.log(`✅ AI replied to ${customerNumber}: "${aiResponse.message}"`);

    // Return empty TwiML — we handle responses via the API, not inline TwiML
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("❌ SMS webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
