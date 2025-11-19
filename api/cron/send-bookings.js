import { supabase } from '../../lib/supabase.js';
import { sendWhatsAppMessage, sendWhatsAppTemplateMessage } from '../../lib/twilio.js';
import { formatGroupConfirmation } from '../../lib/parser.js';
import { parseReservations } from '../../lib/openai.js';
import { sendAutoReply } from '../../lib/mailgun.js';

/**
 * Cron job to send pending reservations to tennis court number
 * Runs on Thursdays (schedule configured in vercel.json)
 * First processes any pending emails, then sends reservations
 */
export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (optional security)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // STEP 1: Process any pending emails first
    console.log('Step 1: Processing pending emails before sending bookings...');
    const { data: pendingEmails } = await supabase
      .from('emails')
      .select('*')
      .eq('status', 'pending')
      .order('received_at', { ascending: true });

    if (pendingEmails && pendingEmails.length > 0) {
      console.log(`Found ${pendingEmails.length} pending emails to process`);
      
      for (const email of pendingEmails) {
        try {
          const parseResult = await parseReservations(email.body, email.from_email, email.from_name);
          
          if (parseResult.success) {
            const reservations = parseResult.reservations || [];
            
            if (reservations.length > 0) {
              const reservationRecords = reservations.map(res => ({
                email_id: email.id,
                sender_name: res.senderName,
                sender_email: res.senderEmail,
                reservation_date: res.date,
                initial_time: res.initial_time,
                end_time: res.end_time,
                parsed_data: parseResult.rawResponse,
                status: 'pending'
              }));

              await supabase.from('reservations').insert(reservationRecords);
            }
            
            await supabase.from('emails').update({ 
              status: 'processed', 
              processed_at: new Date().toISOString() 
            }).eq('id', email.id);
            
            await sendAutoReply(email.from_email, email.from_name, reservations);
          } else {
            await supabase.from('emails').update({ 
              status: 'failed', 
              error_message: parseResult.error,
              processed_at: new Date().toISOString() 
            }).eq('id', email.id);
          }
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          await supabase.from('emails').update({ 
            status: 'failed', 
            error_message: error.message,
            processed_at: new Date().toISOString() 
          }).eq('id', email.id);
        }
      }
      console.log('Finished processing pending emails');
    } else {
      console.log('No pending emails to process');
    }

    // STEP 2: Send reservations to court
    console.log('Step 2: Sending reservations to court...');
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
        // Format date for template
        const formattedDate = new Date(reservation.reservation_date).toLocaleDateString('es-ES', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });

        // Send to court number using template message
        const bookingTemplateSid = process.env.TWILIO_TEMPLATE_BOOKING_SID;
        
        let sendResult;
        
        if (bookingTemplateSid) {
          // Use approved WhatsApp template for booking
          sendResult = await sendWhatsAppTemplateMessage(
            courtNumber,
            bookingTemplateSid,
            {
              '1': formattedDate,
              '2': reservation.initial_time,
              '3': reservation.end_time
            }
          );
        } else {
          // Fallback to regular message (for sandbox or session messages)
          const bookingMessage = `Hola amigos! Quiero reservar una cancha el ${formattedDate} de ${reservation.initial_time} a ${reservation.end_time}`;
          sendResult = await sendWhatsAppMessage(courtNumber, bookingMessage);
        }

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
        const confirmationTemplateSid = process.env.TWILIO_TEMPLATE_CONFIRMATION_SID;
        
        if (confirmationTemplateSid) {
          // Use approved WhatsApp template for confirmation
          await sendWhatsAppTemplateMessage(
            groupNumber,
            confirmationTemplateSid,
            {
              '1': reservation.sender_name || 'Usuario',
              '2': formattedDate,
              '3': reservation.initial_time,
              '4': reservation.end_time
            }
          );
        } else {
          // Fallback to regular message (for sandbox or session messages)
          const confirmationMessage = formatGroupConfirmation(
            reservation.sender_name,
            reservation.reservation_date,
            reservation.initial_time,
            reservation.end_time
          );
          await sendWhatsAppMessage(groupNumber, confirmationMessage);
        }

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

