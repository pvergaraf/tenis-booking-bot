import { supabase } from '../../lib/supabase.js';
import { parseReservations } from '../../lib/openai.js';
import { sendAutoReply } from '../../lib/mailgun.js';

/**
 * Cron job to process any pending emails
 * Runs every 5 minutes to ensure emails don't get stuck
 */
export default async function handler(req, res) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all pending emails
    const { data: emails, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .eq('status', 'pending')
      .order('received_at', { ascending: true })
      .limit(10); // Process max 10 at a time

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch emails' });
    }

    if (!emails || emails.length === 0) {
      return res.status(200).json({ 
        message: 'No pending emails to process',
        processed: 0
      });
    }

    const results = [];

    for (const email of emails) {
      try {
        // Parse email with OpenAI
        const parseResult = await parseReservations(
          email.body,
          email.from_email,
          email.from_name
        );

        if (!parseResult.success) {
          await supabase
            .from('emails')
            .update({
              status: 'failed',
              error_message: parseResult.error,
              processed_at: new Date().toISOString()
            })
            .eq('id', email.id);

          results.push({ emailId: email.id, status: 'failed', error: parseResult.error });
          continue;
        }

        const reservations = parseResult.reservations || [];

        if (reservations.length === 0) {
          await supabase
            .from('emails')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString()
            })
            .eq('id', email.id);

          await sendAutoReply(email.from_email, email.from_name, []);

          results.push({ emailId: email.id, status: 'processed', reservationsFound: 0 });
          continue;
        }

        // Store reservations
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

        const { error: insertError } = await supabase
          .from('reservations')
          .insert(reservationRecords);

        if (insertError) {
          await supabase
            .from('emails')
            .update({
              status: 'failed',
              error_message: insertError.message,
              processed_at: new Date().toISOString()
            })
            .eq('id', email.id);

          results.push({ emailId: email.id, status: 'failed', error: insertError.message });
          continue;
        }

        await supabase
          .from('emails')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', email.id);

        await sendAutoReply(email.from_email, email.from_name, reservations);

        results.push({ emailId: email.id, status: 'processed', reservationsFound: reservations.length });
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        
        await supabase
          .from('emails')
          .update({
            status: 'failed',
            error_message: error.message,
            processed_at: new Date().toISOString()
          })
          .eq('id', email.id);

        results.push({ emailId: email.id, status: 'failed', error: error.message });
      }
    }

    return res.status(200).json({
      message: 'Email processing completed',
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Error in process-pending-emails cron:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

