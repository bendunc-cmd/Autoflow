import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface SendEmailParams {
  to: string;
  subject: string;
  body?: string;
  businessName?: string;
  replyTo?: string;
  html?: string;
  fromName?: string;
}

export async function sendEmail({
  to,
  subject,
  body,
  businessName,
  replyTo,
  html,
  fromName,
}: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Determine the from name
    const senderName = fromName || (businessName ? `${businessName} via AutoFlow` : "AutoFlow AI");
    
    // Use raw html if provided, otherwise wrap body in template
    const emailHtml = html || generateEmailHtml(body || "", businessName || "AutoFlow AI");

    const { data, error } = await resend.emails.send({
      from: `${senderName} <noreply@autoflowai.app>`,
      to: [to],
      subject,
      replyTo,
      html: emailHtml,
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
    <body style="margin:0;padding:0;background-color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
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
              <span>Sent via <a href="https://autoflowai.app" style="color:#338bfc;text-decoration:none;">AutoFlow AI</a> — Smart lead management</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    </table>
    </body>
    </html>`;
}
