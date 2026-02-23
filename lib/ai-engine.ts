import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendSMS } from "@/lib/twilio-client";
import { generateSMSResponse } from "@/lib/ai-engine";

// Helper: get available booking slots for the next 5 business days
async function getAvailableSlots(
  supabase: any,
  userId: string
): Promise<string> {
  // Get availability rules
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("is_available", true);

  if (!rules || rules.length === 0) {
    // Default Mon-Fri 7am-5pm if no rules set
    const defaults = [1, 2, 3, 4, 5].map((d) => ({
      day_of_week: d,
      start_time: "07:00",
      end_time: "17:00",
    }));
    rules?.push(...defaults);
  }

  // Get existing bookings for the next 7 days
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("booking_date, start_time, end_time")
    .eq("user_id", userId)
    .gte("booking_date", today.toISOString().split("T")[0])
    .lte("booking_date", endDate.toISOString().split("T")[0])
    .neq("status", "cancelled");

  // Get blocked dates
  const { data: blockedDates } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .eq("user_id", userId)
    .gte("blocked_date", today.toISOString().split("T")[0])
    .lte("blocked_date", endDate.toISOString().split("T")[0]);

  const blockedSet = new Set(
    (blockedDates || []).map((b: any) => b.blocked_date)
  );

  // Build available slots for next 5 business days
  const slots: string[] = [];
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  let daysFound = 0;
  for (let i = 1; i <= 14 && daysFound < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    // Check if this day is available and not blocked
    if (blockedSet.has(dateStr)) continue;
    const rule = (rules || []).find(
      (r: any) => r.day_of_week === dayOfWeek
    );
    if (!rule) continue;

    // Get bookings for this day
    const dayBookings = (existingBookings || []).filter(
      (b: any) => b.booking_date === dateStr
    );

    // Generate 1-hour slots within business hours
    const startHour = parseInt(rule.start_time.split(":")[0]);
    const endHour = parseInt(rule.end_time.split(":")[0]);
    const availableHours: string[] = [];

    for (let h = startHour; h < endHour; h++) {
      const slotStart = `${h.toString().padStart(2, "0")}:00`;
      const slotEnd = `${(h + 1).toString().padStart(2, "0")}:00`;

      // Check if slot conflicts with existing booking
      const hasConflict = dayBookings.some((b: any) => {
        const bStart = b.start_time.substring(0, 5);
        const bEnd = b.end_time.substring(0, 5);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (!hasConflict) {
        availableHours.push(slotStart);
      }
    }

    if (availableHours.length > 0) {
      const dayLabel = `${dayNames[dayOfWeek]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
      // Show a few representative slots, not all
      const sampleSlots =
        availableHours.length <= 4
          ? availableHours
          : [
              availableHours[0],
              availableHours[Math.floor(availableHours.length / 2)],
              availableHours[availableHours.length - 1],
            ];
      slots.push(`${dayLabel} (${dateStr}): ${sampleSlots.join(", ")}`);
      daysFound++;
    }
  }

  return slots.length > 0
    ? slots.join("\n")
    : "No available slots in the next week — escalate to business owner.";
}

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
      console.log(
        "⚠️ Conversation escalated — skipping AI reply, notifying owner"
      );
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

    // Build business context
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

    // If we're in booking or details stage, fetch available slots
    const currentStage = conversation?.stage || "greeting";
    let availableSlots: string | undefined;

    if (
      currentStage === "booking" ||
      currentStage === "details" ||
      messageBody.toLowerCase().match(/book|appointment|schedule|when|available|come out|come over|time/)
    ) {
      availableSlots = await getAvailableSlots(supabase, profile.id);
    }

    // Generate AI response
    const aiResponse = await generateSMSResponse(
      messageBody,
      conversationHistory,
      businessContext,
      currentStage,
      availableSlots
    );

    // ── Handle booking request ──────────────────────────
    if (aiResponse.bookingRequest?.wantsToBook) {
      const br = aiResponse.bookingRequest;
      console.log(`📅 Booking requested: ${br.preferredDate} at ${br.preferredTime}`);

      if (br.preferredDate && br.preferredTime) {
        try {
          // Create the booking
          const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .insert({
              user_id: profile.id,
              lead_id: lead?.id,
              customer_name: lead?.name || customerNumber,
              customer_phone: customerNumber,
              customer_email: lead?.email || null,
              title: br.jobDescription || lead?.ai_summary || `Job: ${lead?.name || customerNumber}`,
              description: br.jobDescription || lead?.message || null,
              booking_date: br.preferredDate,
              start_time: br.preferredTime,
              end_time: `${(parseInt(br.preferredTime.split(":")[0]) + 1).toString().padStart(2, "0")}:${br.preferredTime.split(":")[1]}`,
              source: "ai_sms",
              status: "confirmed",
              notes: `Booked via AI SMS conversation. Customer phone: ${customerNumber}`,
            })
            .select()
            .single();

          if (bookingError) {
            console.error("❌ Booking insert error:", bookingError);
          } else {
            console.log("✅ Booking created via SMS:", booking.id);

            // Update lead status to qualified
            if (lead) {
              await supabase
                .from("leads")
                .update({
                  status: "qualified",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", lead.id);

              // Log booking activity
              await supabase.from("lead_activities").insert({
                lead_id: lead.id,
                user_id: profile.id,
                type: "note",
                description: `📅 Booking created via AI SMS: ${br.preferredDate} at ${br.preferredTime}`,
                metadata: { booking_id: booking.id },
              });
            }

            // Notify business owner about new booking
            try {
              const { sendEmail } = await import("@/lib/email-service");
              const bookingDate = new Date(br.preferredDate);
              const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              const dateLabel = `${dayNames[bookingDate.getDay()]} ${bookingDate.getDate()}/${bookingDate.getMonth() + 1}/${bookingDate.getFullYear()}`;

              await sendEmail({
                to: profile.email,
                subject: `📅 New booking: ${lead?.name || customerNumber} — ${dateLabel} at ${br.preferredTime}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 500px;">
                    <h2 style="color: #22c55e;">📅 New Booking Confirmed</h2>
                    <p>The AI booked a job via SMS conversation:</p>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px; color: #666;">Customer</td><td style="padding: 8px; font-weight: bold;">${lead?.name || customerNumber}</td></tr>
                      <tr><td style="padding: 8px; color: #666;">Phone</td><td style="padding: 8px;"><a href="tel:${customerNumber}">${customerNumber}</a></td></tr>
                      <tr><td style="padding: 8px; color: #666;">Date</td><td style="padding: 8px; font-weight: bold;">${dateLabel}</td></tr>
                      <tr><td style="padding: 8px; color: #666;">Time</td><td style="padding: 8px; font-weight: bold;">${br.preferredTime}</td></tr>
                      <tr><td style="padding: 8px; color: #666;">Job</td><td style="padding: 8px;">${br.jobDescription || lead?.ai_summary || "Not specified"}</td></tr>
                    </table>
                    <p style="margin-top: 16px;">View in your <a href="https://autoflow-puce.vercel.app/dashboard/calendar">calendar</a>.</p>
                  </div>
                `,
                fromName: "AutoFlow AI",
              });
            } catch (emailError) {
              console.error("Failed to send booking notification:", emailError);
            }
          }
        } catch (bookingCatchError) {
          console.error("❌ Booking creation exception:", bookingCatchError);
        }
      }
    }

    // ── Handle escalation ───────────────────────────────
    if (aiResponse.shouldEscalate) {
      console.log("🚨 AI recommends escalation to business owner");

      await supabase
        .from("sms_conversations")
        .update({
          status: "escalated",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation?.id);

      if (lead) {
        await supabase
          .from("leads")
          .update({ urgency: "hot", updated_at: new Date().toISOString() })
          .eq("id", lead.id);
      }

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

      // Update conversation stage
      if (aiResponse.newStage) {
        await supabase
          .from("sms_conversations")
          .update({
            stage: aiResponse.newStage,
            updated_at: new Date().toISOString(),
          })
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
