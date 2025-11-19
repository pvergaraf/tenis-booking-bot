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
 * Send auto-reply confirmation email with parsed reservation details
 * @param {string} to - Recipient email address
 * @param {string} senderName - Name of the sender
 * @param {Array} reservations - Array of parsed reservations
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendAutoReply(to, senderName, reservations = []) {
  const subject = 'Reserva de tenis recibida';
  
  let reservationDetails = '';
  
  if (reservations && reservations.length > 0) {
    reservationDetails = '\n\nHemos procesado tu(s) reserva(s):\n\n';
    reservations.forEach((res, index) => {
      const date = new Date(res.date).toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      reservationDetails += `✅ Reserva ${index + 1}:\n`;
      reservationDetails += `   • Fecha: ${date}\n`;
      reservationDetails += `   • Horario: ${res.initial_time} - ${res.end_time}\n\n`;
    });
    reservationDetails += 'Tu reserva será enviada al club el jueves.';
  } else {
    reservationDetails = '\n\n⚠️ No pudimos detectar fechas/horarios específicos en tu mensaje. Por favor, envía otro email con el formato:\n\n"Quiero reservar el miércoles 20 de noviembre de 18:00 a 20:00"';
  }
  
  const text = `Hola ${senderName || 'amigo/a'},

Hemos recibido tu solicitud de reserva de cancha de tenis.${reservationDetails}

Gracias por usar nuestro servicio de reservas.

Saludos,
Equipo de Reservas`;

  return sendEmail(to, subject, text);
}

