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
      from: `${businessName} via AutoFlow <noreply@autoflowai.app>`,
      to: [to],
      subject,
      replyTo,
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
              <span>Sent via <a href="https://autoflowai.app" style="color:#338bfc;text-decoration:none;">AutoFlow AI</a> — Smart lead management for small business</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
