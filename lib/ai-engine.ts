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
        content: `You are an AI assistant for "${business.businessName}", a small Australian business. Analyse this incoming lead enquiry.

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
  "suggestedResponse": "A ${tone} email response to send to the customer. Keep it concise (3-5 sentences). Address them by first name. Mention the business name."
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
    
    // Strip markdown code fences if present
    const cleanText = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    
    const parsed = JSON.parse(cleanText) as LeadAnalysis;
    return parsed;
  } catch (parseError) {
    console.error("❌ AI response parse error:", parseError);
    console.error("Raw AI response:", message.content);
    throw new Error("Failed to parse AI response as JSON");
  }
}
