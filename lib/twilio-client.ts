import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

const client = twilio(accountSid, authToken);

export async function sendSMS(to: string, body: string): Promise<string> {
  try {
    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });
    console.log(`📱 SMS sent to ${to}: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error("❌ Failed to send SMS:", error);
    throw error;
  }
}

export async function getCallDetails(callSid: string) {
  try {
    const call = await client.calls(callSid).fetch();
    return {
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      duration: call.duration,
      direction: call.direction,
    };
  } catch (error) {
    console.error("❌ Failed to fetch call details:", error);
    throw error;
  }
}

export { client as twilioClient, twilioPhoneNumber };
