import { supabase } from '../../lib/supabase.js';
import { sendWhatsAppMessage } from '../../lib/twilio.js';
import { formatBookingMessage, formatGroupConfirmation } from '../../lib/parser.js';

/**
 * Cron job to send pending reservations to tennis court number
 * Runs on Thursdays (schedule configured in vercel.json)
 * Sends one WhatsApp message per reservation and confirms to group
 */
export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (optional security)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const courtNumber = process.env.TENNIS_COURT_NUMBER;
    const groupNumber = process.env.WHATSAPP_GROUP_NUMBER;

    if (!courtNumber) {
      return res.status(500).json({ error: 'TENNIS_COURT_NUMBER not configured' });
    }

    if (!groupNumber) {
      return res.status(500).json({ error: 'WHATSAPP_GROUP_NUMBER not configured' });
    }

    // Find all pending reservations
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'pending')
      .order('reservation_date', { ascending: true })
      .order('initial_time', { ascending: true });

    if (fetchError) {
      console.error('Error fetching reservations:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch reservations' });
    }

    if (!reservations || reservations.length === 0) {
      return res.status(200).json({
        message: 'No pending reservations to send',
        sent: 0
      });
    }

    const results = [];

    for (const reservation of reservations) {
      try {
        // Format booking message
        const bookingMessage = formatBookingMessage(
          reservation.reservation_date,
          reservation.initial_time,
          reservation.end_time
        );

        // Send to court number
        const sendResult = await sendWhatsAppMessage(courtNumber, bookingMessage);

        if (!sendResult.success) {
          // Mark as failed
          await supabase
            .from('reservations')
            .update({
              status: 'failed',
              error_message: sendResult.error
            })
            .eq('id', reservation.id);

          results.push({
            reservationId: reservation.id,
            status: 'failed',
            error: sendResult.error
          });
          continue;
        }

        // Update reservation status
        await supabase
          .from('reservations')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            twilio_sid: sendResult.sid
          })
          .eq('id', reservation.id);

        // Send confirmation to group
        const confirmationMessage = formatGroupConfirmation(
          reservation.sender_name,
          reservation.reservation_date,
          reservation.initial_time,
          reservation.end_time
        );

        await sendWhatsAppMessage(groupNumber, confirmationMessage);

        results.push({
          reservationId: reservation.id,
          status: 'sent',
          twilioSid: sendResult.sid
        });
      } catch (error) {
        console.error(`Error processing reservation ${reservation.id}:`, error);
        
        await supabase
          .from('reservations')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', reservation.id);

        results.push({
          reservationId: reservation.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: 'Booking processing completed',
      total: reservations.length,
      results
    });
  } catch (error) {
    console.error('Error in send-bookings cron:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

