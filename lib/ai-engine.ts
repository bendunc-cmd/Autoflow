import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface LeadAnalysis {
  urgency: "hot" | "warm" | "cold";
  category: string;
  summary: string;
  suggestedResponse: string;
}

interface BusinessContext {
  businessName: string;
  businessDescription: string | null;
  businessServices: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  responseTone: "professional" | "friendly" | "casual" | null;
  industry: string | null;
}

export async function analyseLead(
  leadName: string,
  leadMessage: string,
  business: BusinessContext
): Promise<LeadAnalysis> {
  const tone = business.responseTone || "friendly";
  const businessInfo = [
    business.businessDescription && `Business description: ${business.businessDescription}`,
    business.businessServices && `Services offered: ${business.businessServices}`,
    business.businessPhone && `Phone: ${business.businessPhone}`,
    business.businessAddress && `Address: ${business.businessAddress}`,
    business.industry && `Industry: ${business.industry}`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an AI assistant for "${business.businessName}", a small Australian business. Analyse this incoming lead enquiry and generate a response.

BUSINESS INFO:
${businessInfo || "No additional business info provided."}

INCOMING ENQUIRY:
From: ${leadName}
Message: "${leadMessage}"

Respond with ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "urgency": "hot" or "warm" or "cold",
  "category": "short category label like Repair, Quote Request, General Enquiry, Emergency, Booking, Complaint",
  "summary": "One sentence summary of what the customer needs",
  "suggestedResponse": "A ${tone} email response to send to the customer. Keep it concise (3-5 sentences). Address them by first name. Mention the business name. If it seems urgent, acknowledge the urgency. Don't make specific promises about timing unless the business info suggests availability. Sign off with the business name. Use Australian English spelling."
}

URGENCY GUIDE:
- hot: Emergency, urgent need, time-sensitive, words like "ASAP", "urgent", "emergency", "broken", "leaking", "today"
- warm: Active interest, requesting a quote, scheduling, ready to buy
- cold: General enquiry, browsing, "just wondering", future planning`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text) as LeadAnalysis;

    // Validate urgency value
    if (!["hot", "warm", "cold"].includes(parsed.urgency)) {
      parsed.urgency = "warm";
    }

    return parsed;
  } catch {
    // Fallback if AI response isn't valid JSON
    return {
      urgency: "warm",
      category: "General Enquiry",
      summary: `New enquiry from ${leadName}`,
      suggestedResponse: `Hi ${leadName.split(" ")[0]},\n\nThanks for getting in touch with ${business.businessName}! We've received your enquiry and will get back to you as soon as possible.\n\nCheers,\n${business.businessName}`,
    };
  }
}

export async function generateFollowUp(
  leadName: string,
  originalMessage: string,
  followUpNumber: number,
  business: BusinessContext
): Promise<string> {
  const tone = business.responseTone || "friendly";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an AI assistant for "${business.businessName}", a small Australian business. Generate a follow-up email for a lead who hasn't responded.

BUSINESS: ${business.businessName}
CUSTOMER: ${leadName}
ORIGINAL ENQUIRY: "${originalMessage}"
FOLLOW-UP NUMBER: ${followUpNumber} (1 = first follow-up, 2 = second, etc.)
TONE: ${tone}

Write a short, ${tone} follow-up email (2-4 sentences). Use Australian English. Address them by first name. Don't be pushy. If this is follow-up #2 or higher, keep it very brief and mention you don't want to bother them.

Respond with ONLY the email body text, no subject line, no JSON.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  return (
    text ||
    `Hi ${leadName.split(" ")[0]},\n\nJust following up on your earlier enquiry. We'd love to help if you're still interested.\n\nCheers,\n${business.businessName}`
  );
}
