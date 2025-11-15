# Tennis Court Booking Bot MVP

Automated WhatsApp bot that collects tennis court reservations via email and sends booking messages to a court number.

## Features

- **Weekly Reminder**: Sends WhatsApp message to group on Mondays asking for reservations
- **Email Collection**: Receives reservations via email (Mailgun webhook)
- **AI Parsing**: Uses OpenAI to extract reservation details (date, times) from emails
- **Auto-Reply**: Sends confirmation email when reservation is received
- **Automated Booking**: Sends booking messages to court number on Thursdays
- **Group Confirmation**: Sends confirmation to WhatsApp group for each booking

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

#### 3.1. Set up WhatsApp Template (Recommended for Production)

For production use with WhatsApp Business API, you'll need to create and get approved a message template:

1. Go to **Twilio Console** > **Messaging** > **Content Template Builder**
2. Click **Create new template**
3. Set up the template:
   - **Template name**: `copy_reservation` (or your preferred name)
   - **Language**: Spanish
   - **Body**: `Hola amigos! Quiero reservar una cancha el {{1}} de {{2}} a {{3}}`
   - Variables:
     - `{{1}}` = Date (e.g., "19 de noviembre de 2025")
     - `{{2}}` = Start time (e.g., "18:00")
     - `{{3}}` = End time (e.g., "20:00")
4. **Submit for WhatsApp approval** (usually approved in minutes/hours)
5. Once approved, copy the **Content SID** (e.g., `HX9c1325696ba2847d4b8f78dae5110584`)
6. Add it to your environment variables as `TWILIO_TEMPLATE_SID`

**Note**: 
- If `TWILIO_TEMPLATE_SID` is set, the bot will use template messages (required for first contact)
- If not set, the bot falls back to regular messages (works for sandbox or within 24hr sessions)

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
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `CRON_SECRET` - Random secret for securing cron endpoints (optional but recommended)

**Optional Variables:**
- `TWILIO_TEMPLATE_SID` - Your approved WhatsApp Content Template SID (for production)
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

