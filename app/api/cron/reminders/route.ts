import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendSMS } from "@/lib/twilio-client";

export const maxDuration = 30; // Allow up to 30s for processing multiple reminders

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const results = { sent24h: 0, sent2h: 0, errors: 0 };

    // Get all users with their timezone
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, business_name, timezone, twilio_phone_number")
      .not("twilio_phone_number", "is", null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No active profiles", ...results });
    }

    for (const profile of profiles) {
      const tz = profile.timezone || "Australia/Adelaide";

      // Get current time in the business owner's timezone
      const nowInTz = new Date(
        new Date().toLocaleString("en-US", { timeZone: tz })
      );

      // Calculate time windows
      // 24h reminder: bookings between 23-25 hours from now
      const h24Start = new Date(nowInTz);
      h24Start.setHours(h24Start.getHours() + 23);
      const h24End = new Date(nowInTz);
      h24End.setHours(h24End.getHours() + 25);

      // 2h reminder: bookings between 1.5-2.5 hours from now
      const h2Start = new Date(nowInTz);
      h2Start.setMinutes(h2Start.getMinutes() + 90);
      const h2End = new Date(nowInTz);
      h2End.setMinutes(h2End.getMinutes() + 150);

      const fmtDate = (d: Date) => {
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      const fmtTime = (d: Date) => {
        const h = d.getHours().toString().padStart(2, "0");
        const m = d.getMinutes().toString().padStart(2, "0");
        return `${h}:${m}`;
      };

      // ── 24-hour reminders ──────────────────────────
      const { data: bookings24h } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", profile.id)
        .eq("status", "confirmed")
        .eq("reminder_sent_24h", false)
        .gte("booking_date", fmtDate(h24Start))
        .lte("booking_date", fmtDate(h24End));

      for (const booking of bookings24h || []) {
        // Check if the booking time falls within the 24h window
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
        const h24StartFull = h24Start;
        const h24EndFull = h24End;

        // Simple check: is the booking date tomorrow?
        if (booking.customer_phone) {
          try {
            const bookingDate = new Date(booking.booking_date);
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const dayLabel = dayNames[bookingDate.getDay()];
            const timeLabel = booking.start_time.substring(0, 5);

            const message = `Hi ${booking.customer_name?.split(" ")[0] || "there"}, just a reminder you have an appointment with ${profile.business_name} tomorrow (${dayLabel}) at ${timeLabel}. See you then! Reply CANCEL if you need to reschedule.`;

            await sendSMS(booking.customer_phone, message);

            await supabase
              .from("bookings")
              .update({ reminder_sent_24h: true })
              .eq("id", booking.id);

            results.sent24h++;
            console.log(`📅 24h reminder sent to ${booking.customer_phone} for ${booking.booking_date}`);
          } catch (err) {
            console.error(`❌ Failed to send 24h reminder for booking ${booking.id}:`, err);
            results.errors++;
          }
        }
      }

      // ── 2-hour reminders ───────────────────────────
      const { data: bookings2h } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", profile.id)
        .eq("status", "confirmed")
        .eq("reminder_sent_2h", false)
        .eq("booking_date", fmtDate(nowInTz)); // Only today's bookings

      for (const booking of bookings2h || []) {
        // Check if booking starts within 1.5–2.5 hours
        const bookingTimeHour = parseInt(booking.start_time.split(":")[0]);
        const bookingTimeMin = parseInt(booking.start_time.split(":")[1]);
        const bookingMinutes = bookingTimeHour * 60 + bookingTimeMin;
        const nowMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
        const diffMinutes = bookingMinutes - nowMinutes;

        if (diffMinutes >= 90 && diffMinutes <= 150 && booking.customer_phone) {
          try {
            const timeLabel = booking.start_time.substring(0, 5);

            const message = `Hi ${booking.customer_name?.split(" ")[0] || "there"}, just a heads up — your appointment with ${profile.business_name} is in about 2 hours at ${timeLabel}. See you soon!`;

            await sendSMS(booking.customer_phone, message);

            await supabase
              .from("bookings")
              .update({ reminder_sent_2h: true })
              .eq("id", booking.id);

            results.sent2h++;
            console.log(`⏰ 2h reminder sent to ${booking.customer_phone} for ${booking.booking_date} at ${timeLabel}`);
          } catch (err) {
            console.error(`❌ Failed to send 2h reminder for booking ${booking.id}:`, err);
            results.errors++;
          }
        }
      }
    }

    console.log(`✅ Reminder run complete: ${results.sent24h} x 24h, ${results.sent2h} x 2h, ${results.errors} errors`);
    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("❌ Reminder cron error:", error);
    return NextResponse.json({ error: "Reminder cron failed" }, { status: 500 });
  }
}
