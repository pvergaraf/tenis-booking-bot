import { sendWhatsAppMessage, sendWhatsAppTemplateMessage } from '../../lib/twilio.js';

/**
 * Cron job to send periodic reminder to WhatsApp group
 * Runs on Wednesdays (schedule configured in vercel.json)
 */
export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (optional security)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const groupNumber = process.env.WHATSAPP_GROUP_NUMBER;
    const reservationEmail = process.env.RESERVATION_EMAIL;

    if (!groupNumber) {
      return res.status(500).json({ error: 'WHATSAPP_GROUP_NUMBER not configured' });
    }

    if (!reservationEmail) {
      return res.status(500).json({ error: 'RESERVATION_EMAIL not configured' });
    }

    // Try to use template message first, fallback to regular message
    const templateSid = process.env.TWILIO_TEMPLATE_REMINDER_SID;
    
    let result;
    
    if (templateSid) {
      // Use approved WhatsApp template for reminder
      result = await sendWhatsAppTemplateMessage(
        groupNumber,
        templateSid,
        {
          '1': reservationEmail
        }
      );
    } else {
      // Fallback to regular message (for sandbox or session messages)
      const message = `Escríbeme tu reserva de tenis a ${reservationEmail}`;
      result = await sendWhatsAppMessage(groupNumber, message);
    }

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to send reminder',
        details: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reminder sent successfully',
      twilioSid: result.sid
    });
  } catch (error) {
    console.error('Error in send-reminder cron:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

