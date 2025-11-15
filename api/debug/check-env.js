import twilio from 'twilio';

// Debug endpoint - SECURED with auth
export default async function handler(req, res) {
  // Require authorization
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
        body: '🧪 Debug test - checking which number is used'
      });

      testResult = {
        success: true,
        sid: message.sid,
        from: message.from,
        to: message.to,
        status: message.status,
        configuredFrom: fromNumber,
        actualFrom: message.from
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

  return res.status(200).json(testResult);
}

