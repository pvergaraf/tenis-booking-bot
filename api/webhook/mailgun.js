import { supabase } from '../../lib/supabase.js';

/**
 * Mailgun Inbound Webhook Handler
 * Receives emails via Mailgun Routes and stores them in the database
 * Mailgun sends data as form-encoded (application/x-www-form-urlencoded)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mailgun sends email data as form-encoded
    // Parse the form data from request body
    const {
      sender,
      from,
      subject,
      'body-plain': text,
      'body-html': html,
      'recipient': recipient
    } = req.body;

    // Extract sender information
    // Mailgun format: "Name <email@example.com>" or just "email@example.com"
    let fromEmail = '';
    let fromName = null;

    // Use 'sender' field first (Mailgun's parsed version), fallback to 'from'
    const senderField = sender || from || '';
    
    if (senderField) {
      const emailMatch = senderField.match(/<(.+)>/);
      if (emailMatch) {
        fromEmail = emailMatch[1];
        fromName = senderField.split('<')[0].trim() || null;
      } else {
        fromEmail = senderField.trim();
      }
    }

    const emailBody = text || html || '';

    if (!fromEmail || !emailBody) {
      return res.status(400).json({ error: 'Missing required email data' });
    }

    // Store email in database
    const { data: email, error } = await supabase
      .from('emails')
      .insert({
        from_email: fromEmail,
        from_name: fromName,
        subject: subject || null,
        body: emailBody,
        html_body: html || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing email:', error);
      return res.status(500).json({ error: 'Failed to store email' });
    }

    // Trigger email processing asynchronously (fire and forget)
    // This processes the email in the background
    // Note: In production, consider using a queue system for better reliability
    if (typeof fetch !== 'undefined') {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : (process.env.VERCEL ? `https://${req.headers.host}` : 'http://localhost:3000');
      
      fetch(`${baseUrl}/api/process-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'internal'}`
        }
      }).catch(err => {
        console.error('Error triggering email processing:', err);
        // Non-critical error, email will be processed later via manual trigger or cron
      });
    }

    return res.status(200).json({ 
      success: true, 
      emailId: email.id,
      message: 'Email received and stored' 
    });
  } catch (error) {
    console.error('Error processing Mailgun webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

