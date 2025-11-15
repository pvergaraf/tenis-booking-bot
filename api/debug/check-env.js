import twilio from 'twilio';

// Debug endpoint to check environment variables AND test Twilio
export default async function handler(req, res) {
  const envVars = {
    TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || 'NOT SET',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET (hidden)' : 'NOT SET',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET',
    WHATSAPP_GROUP_NUMBER: process.env.WHATSAPP_GROUP_NUMBER || 'NOT SET',
    TENNIS_COURT_NUMBER: process.env.TENNIS_COURT_NUMBER || 'NOT SET'
  };

  // Try to send a test message
  let testResult = null;
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    const toNumber = process.env.WHATSAPP_GROUP_NUMBER;

    if (accountSid && authToken && fromNumber && toNumber) {
      const client = twilio(accountSid, authToken);
      
      const message = await client.messages.create({
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${toNumber}`,
        body: '🧪 Debug test from Vercel - checking which number is used'
      });

      testResult = {
        success: true,
        sid: message.sid,
        from: message.from,
        to: message.to,
        status: message.status
      };
    } else {
      testResult = { success: false, error: 'Missing credentials' };
    }
  } catch (error) {
    testResult = { 
      success: false, 
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo
    };
  }

  return res.status(200).json({
    environmentVariables: envVars,
    testMessage: testResult
  });
}

