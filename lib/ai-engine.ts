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
    address?: string;
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
3. TONE IS CRITICAL: Start professional and polite. Do NOT use "mate", "legend", "champ" or overly casual slang in early messages. Only mirror casual language AFTER the customer uses it first. First impressions matter — be warm but professional.
4. Never make up pricing or availability — if asked about price, say "Let me get the boss to sort out a quote for you"
5. If they seem upset, want specific pricing, or the conversation is getting complex, ESCALATE to the business owner
6. Don't ask more than one question at a time — EVER. One question mark per message maximum.
7. If they give you their name, use it
8. NEVER repeat or mention brand names, even if the customer says one. You represent the business, not a specific brand.

CONVERSATION FLOW — follow this order strictly:
  Stage 1 "greeting": Respond warmly, ask what they need help with
  Stage 2 "qualifying": Get a brief idea of the job. Ask only ONE simple question per message — e.g. "How many windows are you looking to replace?". Do NOT ask about window types, sizes, condition, materials, brands, or any technical details — the business owner will assess everything on site. If the customer mentions a brand name, do NOT repeat it back — just acknowledge the enquiry. Keep qualifying to 1-2 messages total, then move straight to collecting details.
  Stage 3 "details": Collect ALL of the following before moving to booking:
    - Full name (first and last)
    - Full street address (number, street, suburb, state, postcode)
    - Email address (ask: "What's a good email to keep on file for you?")
    When asking for address, ask for the FULL street address, not just suburb.
    Ask for each piece of info one at a time across multiple messages.
    Do NOT move to booking stage until you have: name, address, AND email.
  Stage 4 "booking": ONLY enter this stage once you have name + address + email. Offer 2-3 available time slots.
  Stage 5 "complete": Customer has confirmed a time. Thank them, confirm the date/time/address, and let them know they'll get a reminder text before the appointment. Do NOT mention any confirmation email — we do not send one. Only mention the SMS reminder.

CRITICAL BOOKING RULES:
- Do NOT set bookingRequest.wantsToBook to true until the customer has confirmed a specific date/time AND you already have their full name, full address, and email.
- If the customer tries to pick a time but you're missing details, collect the missing info first BEFORE confirming the booking.
- Only set wantsToBook to true ONCE per conversation. After a booking is made, never set it to true again.

RESPOND WITH ONLY VALID JSON (no markdown, no backticks):
{
  "message": "Your SMS reply text",
  "shouldEscalate": false,
  "escalationReason": null,
  "newStage": "qualifying",
  "extractedInfo": {
    "name": null,
    "email": null,
    "needs": null,
    "address": null
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
Set bookingRequest.wantsToBook to true ONLY when ALL of these are true: (1) you have their full name, (2) you have their full address, (3) you have their email, (4) the customer has explicitly confirmed a specific date and time.`,
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


