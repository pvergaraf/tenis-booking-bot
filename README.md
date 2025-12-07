# Tennis Court Booking Bot MVP

Automated WhatsApp bot that collects tennis court reservations via email and sends booking messages to a court number.

## Features

- **Weekly Reminder**: Sends WhatsApp message to group on Mondays asking for reservations
- **Email Collection**: Receives reservations via email (Mailgun webhook)
- **AI Parsing**: Uses OpenAI to extract reservation details (date, times) from emails
- **Auto-Reply**: Sends confirmation email when reservation is received
- **Automated Booking**: Sends booking messages to court number on Thursdays
- **Group Confirmation**: Sends confirmation to WhatsApp group for each booking
- **Email Management**: Admins can list or delete pending reservations directly via email commands

## Architecture

- **Vercel**: Serverless hosting with cron jobs
- **Twilio**: WhatsApp messaging
- **Mailgun**: Email receiving and sending
- **OpenAI**: Email content parsing
- **Supabase**: Database storage

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project
2. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor
3. Get your Supabase URL and Service Role Key from project settings

### 3. Set up Twilio

1. Create a Twilio account
2. Get WhatsApp sandbox number or approved WhatsApp Business number
3. Get Account SID and Auth Token from Twilio Console

#### 3.1. Set up WhatsApp Templates (Recommended for Production)

For production use with WhatsApp Business API, you'll need to create and get approved **3 message templates**:

**Template 1: Weekly Reminder** (`weekly_reminder`)

1. Go to **Twilio Console** > **Messaging** > **Content Template Builder**
2. Click **Create new template**
3. Set up:
   - **Template name**: `weekly_reminder`
   - **Language**: Spanish
   - **Category**: UTILITY
   - **Body**: 
   ```
   Recordatorio: Sistema de Reservas

   Período de reservas abierto para esta semana.

   Envíe su solicitud a: {{1}}

   Incluya fecha y horario preferido.
   ```
   - Variables: `{{1}}` = Email address
4. **Submit for WhatsApp approval**
5. Copy the **Content SID** → `TWILIO_TEMPLATE_REMINDER_SID`

**Template 2: Court Booking** (`court_booking_request`)

1. Create new template
2. Set up:
   - **Template name**: `court_booking_request`
   - **Language**: Spanish
   - **Category**: UTILITY
   - **Body**:
   ```
   Solicitud de reserva de cancha de tenis

   Fecha: {{1}}
   Horario: {{2}} - {{3}}

   Por favor confirmar disponibilidad.

   Gracias
   ```
   - Variables:
     - `{{1}}` = Date (e.g., "20 de noviembre de 2025")
     - `{{2}}` = Start time (e.g., "18:00")
     - `{{3}}` = End time (e.g., "20:00")
3. **Submit for WhatsApp approval**
4. Copy the **Content SID** → `TWILIO_TEMPLATE_BOOKING_SID`

**Template 3: Booking Confirmation** (`booking_confirmation`)

1. Create new template
2. Set up:
   - **Template name**: `booking_confirmation`
   - **Language**: Spanish
   - **Category**: UTILITY
   - **Body**:
   ```
   Reserva Confirmada

   Solicitante: {{1}}
   Fecha: {{2}}
   Horario: {{3}} - {{4}}

   La reserva ha sido enviada al club.
   ```
   - Variables:
     - `{{1}}` = Name (e.g., "Pablo")
     - `{{2}}` = Date (e.g., "20 de noviembre de 2025")
     - `{{3}}` = Start time (e.g., "18:00")
     - `{{4}}` = End time (e.g., "20:00")
3. **Submit for WhatsApp approval**
4. Copy the **Content SID** → `TWILIO_TEMPLATE_CONFIRMATION_SID`

**Note**: 
- If template SIDs are set, the bot uses template messages (required for WhatsApp Business API)
- If not set, falls back to regular messages (works with sandbox or within 24hr sessions)
- Templates typically get approved in 15 minutes to 2 hours

### 4. Set up Mailgun

1. Create a Mailgun account (free tier: 100 emails/day)
2. Verify your domain or use Mailgun's sandbox domain for testing
3. Generate an API key from Settings > API Keys
4. Set up Inbound Routes:
   - Go to Sending > Inbound Routes
   - Click "Create Route"
   - Set the webhook URL to: `https://your-app.vercel.app/api/webhook/mailgun`
   - Configure the route to match emails sent to your reservation email (e.g., `reservas-tenis@yourdomain.com`)
   - Save the route

### 5. Set up OpenAI

1. Create an OpenAI account
2. Generate an API key
3. Ensure you have credits available

### 6. Configure Environment Variables

Copy `.env.example` to `.env.local` for local development, then set all variables in Vercel:

**Required Variables:**
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_WHATSAPP_NUMBER` - Your Twilio WhatsApp number (e.g., +14155238886)
- `WHATSAPP_GROUP_NUMBER` - WhatsApp group number to send reminders/confirmations
- `TENNIS_COURT_NUMBER` - Phone number to send booking requests
- `MAILGUN_API_KEY` - Your Mailgun API key
- `MAILGUN_DOMAIN` - Your verified Mailgun domain (e.g., `mg.yourdomain.com` or sandbox domain)
- `RESERVATION_EMAIL` - Email address for reservations (must match Mailgun route)
- `RESERVATION_ADMIN_EMAILS` - Comma separated list of admin emails allowed to manage pending reservations
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `CRON_SECRET` - Random secret for securing cron endpoints (optional but recommended)

**Optional Variables (WhatsApp Templates):**
- `TWILIO_TEMPLATE_REMINDER_SID` - Template for weekly reminder (for production)
- `TWILIO_TEMPLATE_BOOKING_SID` - Template for court booking (for production)
- `TWILIO_TEMPLATE_CONFIRMATION_SID` - Template for booking confirmation (for production)
- `REMINDER_CRON_SCHEDULE` - Cron schedule for reminder (default: "0 12 * * 3" - Wednesdays 9am Santiago)
- `BOOKING_CRON_SCHEDULE` - Cron schedule for booking sender (default: "0 4 * * 4" - Thursdays 1am Santiago)

### 7. Deploy to Vercel

```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 8. Configure Vercel Cron Jobs

The cron jobs are configured in `vercel.json`:
- **Reminder**: Runs every Monday at 9am (sends reminder to group)
- **Booking Sender**: Runs every Thursday at 8am (sends pending reservations)

You can modify the schedules in `vercel.json` or via Vercel dashboard.

### 9. Set up Email Processing

After an email is received via Mailgun webhook, you can either:
- Manually trigger processing: `POST /api/process-email`
- Set up an automatic trigger (e.g., using Vercel's background functions)

## How It Works

1. **Monday**: Cron job sends reminder to WhatsApp group
2. **Users email reservations**: Mailgun receives emails and stores them
3. **Email processing**: System parses emails with OpenAI and extracts reservations
4. **Auto-reply**: Confirmation email sent to user
5. **Thursday**: Cron job sends all pending reservations to court number
6. **Group confirmation**: Confirmation message sent to WhatsApp group for each booking

## Managing Pending Reservations via Email

Admins listed in `RESERVATION_ADMIN_EMAILS` can send commands from their email address to the same inbox handled by Mailgun. Commands are parsed from the email subject or the first non-empty line in the body:

- `LIST` — receives an email with every pending reservation (ID, requester, date & time).
- `DELETE <id>` — removes a pending reservation. You can use the full UUID or just the first 8 characters shown in the LIST response.
- `HELP` — returns the list of available commands and examples.

Example email:

```
Subject: LIST
```

or

```
Subject: Gestion

LIST
```

When a DELETE command succeeds, the bot replies with a summary indicating which reservations were removed and if any IDs were missing or ambiguous.

## API Endpoints

### `POST /api/webhook/mailgun`
- Receives emails from Mailgun
- Stores emails in database

### `POST /api/process-email`
- Processes unprocessed emails
- Extracts reservations using OpenAI
- Sends auto-reply emails

### `GET /api/cron/send-reminder`
- Sends reminder to WhatsApp group
- Runs on Mondays (via Vercel Cron)

### `GET /api/cron/send-bookings`
- Sends pending reservations to court number
- Sends confirmations to group
- Runs on Thursdays (via Vercel Cron)

## Database Schema

- **emails**: Stores received emails
- **reservations**: Stores parsed reservations with status

See `supabase/schema.sql` for full schema.

## Message Templates

- **Reminder**: "Escríbeme tu reserva de tenis a {email}"
- **Booking**: "Hola amigos! Quiero reservar una cancha el {DATE} de {INITIAL_TIME} a {END_TIME}"
- **Group Confirmation**: "{SENDER_NAME} - Reserva confirmada para {DATE} de {INITIAL_TIME} a {END_TIME}"

## Troubleshooting

- **Cron jobs not running**: Check Vercel Cron configuration and ensure CRON_SECRET matches
- **Emails not being received**: Verify Mailgun inbound route configuration and webhook URL
- **Reservations not parsing**: Check OpenAI API key and credits
- **WhatsApp messages failing**: Verify Twilio credentials and WhatsApp number format

## License

MIT

