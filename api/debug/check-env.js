// Debug endpoint to check environment variables
export default async function handler(req, res) {
  return res.status(200).json({
    TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || 'NOT SET',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET (hidden)' : 'NOT SET',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET',
    WHATSAPP_GROUP_NUMBER: process.env.WHATSAPP_GROUP_NUMBER || 'NOT SET',
    TENNIS_COURT_NUMBER: process.env.TENNIS_COURT_NUMBER || 'NOT SET'
  });
}

