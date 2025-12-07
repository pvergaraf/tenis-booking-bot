import { supabase } from './supabase.js';
import { sendEmail } from './mailgun.js';
import { formatDate, formatTime } from './parser.js';

const adminEmailList = (process.env.RESERVATION_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

const COMMAND_MAP = new Map([
  ['list', 'list'],
  ['listar', 'list'],
  ['lista', 'list'],
  ['retrieve', 'list'],
  ['obtener', 'list'],
  ['status', 'list'],
  ['delete', 'delete'],
  ['eliminar', 'delete'],
  ['borrar', 'delete'],
  ['remove', 'delete'],
  ['cancel', 'delete'],
  ['cancelar', 'delete'],
  ['help', 'help'],
  ['ayuda', 'help']
]);

export function isAdminEmail(email = '') {
  if (!email) return false;
  return adminEmailList.includes(email.trim().toLowerCase());
}

export function parseAdminCommand(subject, body) {
  const combined = `${subject || ''}\n${body || ''}`;
  const lines = combined
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^(?:[#>@-]?\s*)?(?:command\s*:)?\s*([a-záéíóúñ]+)(.*)$/i);
    if (!match) {
      continue;
    }

    const keyword = COMMAND_MAP.get(match[1].toLowerCase());
    if (!keyword) {
      continue;
    }

    const args = (match[2] || '').trim();

    if (keyword === 'list' || keyword === 'help') {
      return { type: keyword };
    }

    if (keyword === 'delete') {
      const targets = args
        .split(/[\s,]+/)
        .map(token => token.trim())
        .filter(Boolean);
      return { type: 'delete', targets };
    }
  }

  return null;
}

export async function handleAdminCommand(command, email) {
  switch (command.type) {
    case 'help':
      return sendHelpEmail(email);
    case 'list':
      return sendPendingReservations(email);
    case 'delete':
      return deletePendingReservations(command.targets || [], email);
    default:
      throw new Error(`Unsupported admin command: ${command.type}`);
  }
}

async function fetchPendingReservations() {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, sender_name, sender_email, reservation_date, initial_time, end_time, created_at')
    .eq('status', 'pending')
    .order('reservation_date', { ascending: true })
    .order('initial_time', { ascending: true });

  if (error) {
    throw new Error(`Error fetching pending reservations: ${error.message}`);
  }

  return data || [];
}

async function sendPendingReservations(email) {
  const reservations = await fetchPendingReservations();

  const intro = reservations.length
    ? 'Estas son las reservas pendientes por enviar al club:'
    : 'Actualmente no hay reservas pendientes por enviar.';

  let body = `Hola ${email.from_name || 'admin'},\n\n${intro}\n\n`;

  reservations.forEach((reservation, index) => {
    const requester = reservation.sender_name || reservation.sender_email || 'Sin nombre';
    body += `${index + 1}. ${formatReservationLine(reservation)}\n   ID: ${reservation.id}\n   Solicitante: ${requester}\n\n`;
  });

  if (reservations.length) {
    body += 'Para eliminar una reserva responde con:\n';
    body += 'DELETE <primeros-8-caracteres-del-ID>\n';
  }

  body += '\n— Bot de Reservas';

  await sendEmailOrThrow(
    email.from_email,
    'Reservas pendientes',
    body
  );

  return { action: 'list', count: reservations.length };
}

async function deletePendingReservations(targets, email) {
  const trimmedTargets = Array.from(new Set((targets || []).map(t => t.toLowerCase())));

  if (trimmedTargets.length === 0) {
    await sendEmailOrThrow(
      email.from_email,
      'Eliminar reservas: se necesita un ID',
      'Envía el comando como "DELETE <id>" usando los primeros 8 caracteres del ID que aparece en la lista.'
    );
    return { action: 'delete', deleted: 0, missing: trimmedTargets.length };
  }

  const reservations = await fetchPendingReservations();

  const matches = [];
  const missing = [];
  const ambiguous = [];

  for (const target of trimmedTargets) {
    const candidates = reservations.filter(reservation =>
      reservation.id.toLowerCase().startsWith(target)
    );

    if (candidates.length === 0) {
      missing.push(target);
    } else if (candidates.length > 1) {
      ambiguous.push({ target, options: candidates.map(c => c.id) });
    } else {
      matches.push(candidates[0]);
    }
  }

  // Remove duplicates in matches
  const uniqueMatches = [];
  const seen = new Set();
  for (const match of matches) {
    if (!seen.has(match.id)) {
      uniqueMatches.push(match);
      seen.add(match.id);
    }
  }

  if (uniqueMatches.length > 0) {
    const ids = uniqueMatches.map(match => match.id);
    const { error } = await supabase
      .from('reservations')
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Error deleting reservations: ${error.message}`);
    }
  }

  let body = `Hola ${email.from_name || 'admin'},\n\n`;

  if (uniqueMatches.length) {
    body += '✅ Reservas eliminadas:\n';
    uniqueMatches.forEach(match => {
      body += `- ${formatReservationLine(match)} (ID: ${match.id})\n`;
    });
    body += '\n';
  }

  if (missing.length) {
    body += '❌ No encontramos coincidencias para:\n';
    missing.forEach(target => {
      body += `- ${target}\n`;
    });
    body += '\n';
  }

  if (ambiguous.length) {
    body += '⚠️ Coincidencias múltiples, usa más caracteres del ID:\n';
    ambiguous.forEach(entry => {
      body += `- ${entry.target} → ${entry.options.join(', ')}\n`;
    });
    body += '\n';
  }

  if (!uniqueMatches.length && !missing.length && !ambiguous.length) {
    body += 'No hubo cambios: no se encontraron reservas pendientes.\n\n';
  }

  body += '— Bot de Reservas';

  await sendEmailOrThrow(
    email.from_email,
    'Resultado de la eliminación de reservas',
    body
  );

  return {
    action: 'delete',
    deleted: uniqueMatches.length,
    missing: missing.length,
    ambiguous: ambiguous.length
  };
}

async function sendHelpEmail(email) {
  const body = `Hola ${email.from_name || 'admin'},\n\n` +
    'Comandos disponibles:\n' +
    '- LIST: muestra todas las reservas pendientes.\n' +
    '- DELETE <id>: elimina la reserva indicada (puedes usar los primeros 8 caracteres del ID).\n' +
    '- HELP: muestra este mensaje.\n\n' +
    'Ejemplos:\n' +
    'LIST\n' +
    'DELETE 4f2a1b3c\n\n' +
    '— Bot de Reservas';

  await sendEmailOrThrow(
    email.from_email,
    'Ayuda - Gestión de reservas',
    body
  );

  return { action: 'help' };
}

function formatReservationLine(reservation) {
  const date = formatDate(reservation.reservation_date);
  const start = formatTime(reservation.initial_time);
  const end = formatTime(reservation.end_time);
  return `${date} de ${start} a ${end}`;
}

async function sendEmailOrThrow(to, subject, body) {
  const response = await sendEmail(to, subject, body);
  if (!response.success) {
    throw new Error(response.error || 'Error enviando email de administración');
  }
  return response;
}
