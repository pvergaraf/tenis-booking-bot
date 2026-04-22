import { sendWhatsAppMessage } from '../../lib/twilio.js';

/**
 * Twilio Inbound WhatsApp Webhook
 * Relay bidireccional entre la cancha y el WhatsApp personal del operador.
 *
 * - Mensaje desde TENNIS_COURT_NUMBER -> reenvía a WHATSAPP_GROUP_NUMBER con prefijo
 * - Mensaje desde WHATSAPP_GROUP_NUMBER -> reenvía a TENNIS_COURT_NUMBER tal cual
 * - Cualquier otro origen se ignora
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const courtNumber = process.env.TENNIS_COURT_NUMBER;
  const groupNumber = process.env.WHATSAPP_GROUP_NUMBER;

  if (!courtNumber || !groupNumber) {
    console.error('Missing TENNIS_COURT_NUMBER or WHATSAPP_GROUP_NUMBER');
    return res.status(500).send('Server not configured');
  }

  const from = (req.body?.From || '').replace(/^whatsapp:/, '');
  const body = req.body?.Body || '';
  const numMedia = parseInt(req.body?.NumMedia || '0', 10);

  const mediaUrls = [];
  for (let i = 0; i < numMedia; i++) {
    const url = req.body?.[`MediaUrl${i}`];
    if (url) mediaUrls.push(url);
  }

  let target = null;
  let outgoingBody = body;

  if (from === courtNumber) {
    target = groupNumber;
    outgoingBody = `🎾 Cancha: ${body}`.trim();
  } else if (from === groupNumber) {
    target = courtNumber;
    outgoingBody = body;
  } else {
    console.log(`Ignoring message from unknown sender: ${from}`);
    return res.status(204).end();
  }

  if (!outgoingBody && mediaUrls.length === 0) {
    return res.status(204).end();
  }

  const result = await sendWhatsAppMessage(target, outgoingBody || ' ', mediaUrls);

  if (!result.success) {
    console.error('Failed to relay message:', result.error);
    return res.status(500).send('Failed to relay');
  }

  console.log(`Relayed ${from} -> ${target} (sid: ${result.sid})`);
  return res.status(204).end();
}
