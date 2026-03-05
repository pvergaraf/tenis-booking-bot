import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  const { status } = req.query;

  let query = supabase
    .from('reservations')
    .select('*')
    .order('reservation_date', { ascending: true })
    .order('initial_time', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}

async function handlePost(req, res) {
  const { reservation_date, initial_time, end_time, sender_name } = req.body;

  if (!reservation_date || !initial_time || !end_time) {
    return res.status(400).json({ error: 'reservation_date, initial_time, and end_time are required' });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reservation_date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  // Validate time format
  if (!/^\d{2}:\d{2}$/.test(initial_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
    return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      reservation_date,
      initial_time,
      end_time,
      sender_name: sender_name || null,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
}

async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const { data, error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
