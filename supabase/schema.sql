-- Tennis Court Booking Bot Database Schema

-- Emails table: Store received emails from Mailgun webhook
CREATE TABLE IF NOT EXISTS emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  html_body TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservations table: Store parsed reservations from emails
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  sender_name TEXT,
  sender_email TEXT,
  reservation_date DATE NOT NULL,
  initial_time TIME NOT NULL,
  end_time TIME NOT NULL,
  parsed_data JSONB, -- Store full OpenAI response for debugging
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_email_id ON reservations(email_id);

