import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  businessName: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  body,
  businessName,
  replyTo,
}: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${businessName} via AutoFlow <onboarding@resend.dev>`,
      to: [to],
      subject,
      replyTo: replyTo,
      html: generateEmailHtml(body, businessName),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Email send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function generateEmailHtml(body: string, businessName: string): string {
  // Convert newlines to <br> tags
  const htmlBody = body.replace(/\n/g, "<br>");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#338bfc,#1555de);padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;">${businessName}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">
              ${htmlBody}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
              Sent via <a href="https://autoflow-rust.vercel.app" style="color:#338bfc;text-decoration:none;">AutoFlow AI</a> — Smart automation for small business
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendLeadNotification({
  to,
  leadName,
  leadEmail,
  leadMessage,
  urgency,
  category,
  aiSummary,
  businessName,
}: {
  to: string;
  leadName: string;
  leadEmail: string;
  leadMessage: string;
  urgency: string;
  category: string;
  aiSummary: string;
  businessName: string;
}): Promise<{ success: boolean }> {
  const urgencyEmoji =
    urgency === "hot" ? "🔴" : urgency === "warm" ? "🟡" : "🟢";
  const urgencyLabel = urgency.charAt(0).toUpperCase() + urgency.slice(1);

  try {
    await resend.emails.send({
      from: `AutoFlow AI <onboarding@resend.dev>`,
      to: [to],
      subject: `${urgencyEmoji} New ${urgencyLabel} Lead: ${leadName} — ${category}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#338bfc,#1555de);padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;">⚡ AutoFlow AI</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 16px;font-size:17px;font-weight:600;">New Lead for ${businessName}</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:20px;">
                <tr><td style="padding:4px 16px;"><strong>Name:</strong> ${leadName}</td></tr>
                <tr><td style="padding:4px 16px;"><strong>Email:</strong> <a href="mailto:${leadEmail}" style="color:#338bfc;">${leadEmail}</a></td></tr>
                <tr><td style="padding:4px 16px;"><strong>Urgency:</strong> ${urgencyEmoji} ${urgencyLabel}</td></tr>
                <tr><td style="padding:4px 16px;"><strong>Category:</strong> ${category}</td></tr>
              </table>

              <p style="margin:0 0 8px;font-weight:600;">AI Summary:</p>
              <p style="margin:0 0 16px;color:#475569;">${aiSummary}</p>
              
              <p style="margin:0 0 8px;font-weight:600;">Original Message:</p>
              <p style="margin:0;padding:12px 16px;background:#f8fafc;border-left:3px solid #338bfc;border-radius:4px;color:#475569;font-style:italic;">${leadMessage}</p>

              <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">An AI-generated response has been automatically sent to the customer. View and manage this lead in your <a href="https://autoflow-rust.vercel.app/dashboard/leads" style="color:#338bfc;">AutoFlow dashboard</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}
