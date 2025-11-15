import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({ apiKey });

/**
 * Parse email content to extract tennis court reservations
 * Handles multiple reservations per email
 * @param {string} emailBody - Email content to parse
 * @param {string} senderEmail - Email address of sender
 * @param {string} senderName - Name of sender (optional)
 * @returns {Promise<{success: boolean, reservations?: Array, error?: string}>}
 */
export async function parseReservations(emailBody, senderEmail, senderName = null) {
  try {
    // Get current date for context
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const todayISO = today.toISOString().split('T')[0];
    
    const prompt = `Eres un asistente que extrae información de reservas de canchas de tenis de emails.

HOY ES: ${todayStr} (${todayISO})

Analiza el siguiente email y extrae todas las reservas de canchas de tenis mencionadas. Para cada reserva, identifica:
- Fecha de la reserva (formato: YYYY-MM-DD)
- Hora de inicio (formato: HH:MM en 24 horas)
- Hora de fin (formato: HH:MM en 24 horas)

El email puede contener múltiples reservas. Si no hay reservas claras, devuelve un array vacío.

IMPORTANTE:
- Usa SIEMPRE el año actual (${today.getFullYear()}) a menos que se especifique otro año
- "Próximo miércoles" = el próximo día miércoles después de hoy
- "Mañana" = ${todayISO} + 1 día
- Si la fecha no está especificada, asume que es para la próxima semana
- Si solo hay hora de inicio, asume que la reserva dura 1 hora
- Si hay ambigüedad, usa el contexto del email para inferir
- Calcula correctamente fechas relativas basándote en la fecha de HOY

Responde SOLO con un JSON válido en este formato:
{
  "reservations": [
    {
      "date": "2025-11-20",
      "initial_time": "18:00",
      "end_time": "19:00"
    }
  ]
}

Email a analizar:
${emailBody}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente especializado en extraer información estructurada de emails. Siempre respondes con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(responseText);
    
    if (!parsed.reservations || !Array.isArray(parsed.reservations)) {
      return { success: true, reservations: [] };
    }

    // Add sender info to each reservation
    const reservations = parsed.reservations.map(res => ({
      ...res,
      senderEmail,
      senderName
    }));

    return { 
      success: true, 
      reservations,
      rawResponse: parsed
    };
  } catch (error) {
    console.error('Error parsing reservations with OpenAI:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      reservations: []
    };
  }
}

