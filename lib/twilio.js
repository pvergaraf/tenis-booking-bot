import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio environment variables');
}

export const twilioClient = twilio(accountSid, authToken);

/**
 * Send a WhatsApp message via Twilio
 * @param {string} to - Phone number in format +1234567890
 * @param {string} message - Message content
 * @returns {Promise<{success: boolean, sid?: string, error?: string}>}
 */
export async function sendWhatsAppMessage(to, message) {
  try {
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!fromNumber) {
      throw new Error('TWILIO_WHATSAPP_NUMBER not configured');
    }

    const result = await twilioClient.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${to}`,
      body: message
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

