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

interface SMSResponse {
  message: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  newStage?: string;
  extractedInfo?: {
    name?: string;
    email?: string;
    needs?: string;
  };
  bookingRequest?: {
    wantsToBook: boolean;
    preferredDate?: string;
    preferredTime?: string;
    jobDescription?: string;
  };
}

export async function analyseLead(
  leadName: string,
  leadMessage: string,
  business: BusinessContext
): Promise<LeadAnalysis> {
  const tone = business.responseTone || "friendly";

  const businessInfo = [
    business.businessDescription &&
      `Business description: ${business.businessDescription}`,
    business.businessServices &&
      `Services offered: ${business.businessServices}`,
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
        content: `You are an AI assistant for "${business.businessName}", a small Australian business.
Analyse this incoming lead enquiry and generate a response.

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
    const cleanText = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const parsed = JSON.parse(cleanText) as LeadAnalysis;

    if (!["hot", "warm", "cold"].includes(parsed.urgency)) {
      parsed.urgency = "warm";
    }

    return parsed;
  } catch (parseError) {
    console.error("❌ AI response parse error:", parseError);
    console.error("Raw AI response:", message.content);
    throw new Error("Failed to parse AI response as JSON");
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
        content: `You are an AI assistant for "${business.businessName}", a small Australian business.
Generate a follow-up email for a lead who hasn't responded.

BUSINESS: ${business.businessName}
CUSTOMER: ${leadName}
ORIGINAL ENQUIRY: "${originalMessage}"
FOLLOW-UP NUMBER: ${followUpNumber} (1 = first follow-up, 2 = second, etc.)
TONE: ${tone}

Write a short, ${tone} follow-up email (2-4 sentences). Use Australian English. Address them by first name. Don't be pushy. If this is follow-up #2 or higher, keep it very brief and mention you don't want to bother them. Respond with ONLY the email body text, no subject line, no JSON.`,
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

export async function generateSMSResponse(
  customerMessage: string,
  conversationHistory: { role: string; content: string }[],
  business: BusinessContext,
  currentStage: string,
  availableSlots?: string
): Promise<SMSResponse> {
  const tone = business.responseTone || "friendly";

  const businessInfo = [
    business.businessDescription &&
      `Business: ${business.businessDescription}`,
    business.businessServices && `Services: ${business.businessServices}`,
    business.businessPhone && `Phone: ${business.businessPhone}`,
    business.businessAddress && `Address: ${business.businessAddress}`,
    business.industry && `Industry: ${business.industry}`,
  ]
    .filter(Boolean)
    .join("\n");

  const historyText = conversationHistory
    .map(
      (msg) =>
        `${msg.role === "customer" ? "Customer" : "You"}: ${msg.content}`
    )
    .join("\n");

  const bookingContext = availableSlots
    ? `\n\nAVAILABLE BOOKING SLOTS (you can offer these to the customer):\n${availableSlots}\nWhen offering times, present 2-3 options naturally. Use Australian date format (e.g. "Tuesday 25th Feb"). If the customer picks a time, set bookingRequest.wantsToBook to true with their chosen date and time.`
    : "";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an AI SMS assistant for "${business.businessName}", a small Australian business. You're texting with a potential customer. Your job is to be helpful, qualify the lead, collect details, and help them book an appointment when ready.

BUSINESS INFO:
${businessInfo || "No additional business info provided."}

TONE: ${tone} (keep it natural, like a real person texting — not robotic)

CURRENT CONVERSATION STAGE: ${currentStage}
${bookingContext}

CONVERSATION SO FAR:
${historyText || "This is the start of the conversation."}

CUSTOMER'S LATEST MESSAGE: "${customerMessage}"

RULES:
1. Keep your reply SHORT — under 160 characters if possible, max 300 characters
2. Sound like a real person, not a chatbot. Use Australian English
3. Never make up pricing or availability — if asked about price, say "Let me get the boss to sort out a quote for you"
4. Try to collect: their name, what they need, when they need it, their location
5. If they seem upset, want specific pricing, or the conversation is getting complex, ESCALATE to the business owner
6. Move through stages naturally: greeting → qualifying (what do they need?) → details (when/where?) → booking → complete
7. Don't ask more than one question at a time
8. If they give you their name, use it
9. When the customer seems ready to book (they've told you what they need and roughly when), move to the "booking" stage and offer available times
10. If you're in the "booking" stage and have available slots, offer 2-3 time options
11. When the customer confirms a time, set bookingRequest.wantsToBook to true with the date (YYYY-MM-DD) and time (HH:MM)
12. After booking is confirmed, thank them and let them know they'll get a reminder

RESPOND WITH ONLY VALID JSON (no markdown, no backticks):
{
  "message": "Your SMS reply text",
  "shouldEscalate": false,
  "escalationReason": null,
  "newStage": "qualifying",
  "extractedInfo": {
    "name": null,
    "email": null,
    "needs": null
  },
  "bookingRequest": {
    "wantsToBook": false,
    "preferredDate": null,
    "preferredTime": null,
    "jobDescription": null
  }
}

For newStage, use: "greeting", "qualifying", "details", "booking", "complete"
Set shouldEscalate to true ONLY if: customer asks about pricing, is upset/angry, wants to speak to someone, conversation is too complex.
Set bookingRequest.wantsToBook to true ONLY when the customer has explicitly confirmed a specific date and time.`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const cleanText = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const parsed = JSON.parse(cleanText) as SMSResponse;

    if (parsed.message.length > 320) {
      parsed.message = parsed.message.substring(0, 317) + "...";
    }

    return parsed;
  } catch (parseError) {
    console.error("❌ SMS AI response parse error:", parseError);
    console.error("Raw AI response:", message.content);
    return {
      message: `Thanks for your message! Let me get someone from ${business.businessName} to help you out. They'll be in touch shortly.`,
      shouldEscalate: true,
      escalationReason: "AI failed to generate response",
      newStage: currentStage,
    };
  }
}
