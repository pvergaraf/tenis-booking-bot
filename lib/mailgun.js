import formData from 'form-data';
import Mailgun from 'mailgun.js';

const apiKey = process.env.MAILGUN_API_KEY;
const domain = process.env.MAILGUN_DOMAIN;

if (!apiKey || !domain) {
  throw new Error('Missing MAILGUN_API_KEY or MAILGUN_DOMAIN environment variables');
}

// Initialize Mailgun client
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: apiKey,
});

/**
 * Send an email via Mailgun
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEmail(to, subject, text, html = null) {
  try {
    const fromEmail = process.env.RESERVATION_EMAIL || `noreply@${domain}`;
    
    const messageData = {
      from: fromEmail,
      to: [to],
      subject,
      text,
      ...(html && { html })
    };

    const response = await mg.messages.create(domain, messageData);
    return { success: true, id: response.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

/**
 * Send auto-reply confirmation email
 * @param {string} to - Recipient email address
 * @param {string} senderName - Name of the sender
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendAutoReply(to, senderName) {
  const subject = 'Reserva de tenis recibida';
  const text = `Hola ${senderName || 'amigo/a'},

Hemos recibido tu solicitud de reserva de cancha de tenis. Estamos procesando tu reserva y te confirmaremos pronto.

Gracias por usar nuestro servicio de reservas.

Saludos,
Equipo de Reservas`;

  return sendEmail(to, subject, text);
}

