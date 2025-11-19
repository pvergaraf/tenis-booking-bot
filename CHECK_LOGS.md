# How to Check Logs

## 1. Supabase Database (See Email Status)

**Check emails table:**
```sql
SELECT id, from_email, from_name, status, error_message, received_at, processed_at
FROM emails
ORDER BY received_at DESC
LIMIT 10;
```

**Check pending emails:**
```sql
SELECT * FROM emails WHERE status = 'pending';
```

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor

## 2. Vercel Function Logs

**Via Dashboard:**
1. Go to: https://vercel.com/pablo-vergaras-projects-964a86f2/tenis/logs
2. Filter by function: `api/process-email`
3. Check for errors

**Via CLI:**
```bash
vercel logs https://tenis-3e7eit1vm-pablo-vergaras-projects-964a86f2.vercel.app
```

## 3. Manually Trigger Processing

If an email is stuck as pending:

```bash
curl -X POST "https://tenis-3e7eit1vm-pablo-vergaras-projects-964a86f2.vercel.app/api/process-email" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This will process all pending emails immediately.

