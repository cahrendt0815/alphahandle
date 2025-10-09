# Quick Start Guide

## First-Time Setup

### 1. Install Stripe CLI

**Windows:**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

### 2. Login to Stripe
```bash
stripe login
```

### 3. Fix Your Current Account (One-Time)

Your user ID: `4c7ff2ab-97f7-43df-a3c2-f94fd2aba67b`

Run this SQL in Supabase SQL Editor:

```sql
-- Create entitlement for Degen plan (monthly)
INSERT INTO entitlements (user_id, plan, searches_quota, timeline_months, refresh_at)
VALUES (
  '4c7ff2ab-97f7-43df-a3c2-f94fd2aba67b',
  'degen',
  10,
  24,
  NOW() + INTERVAL '1 month'
)
ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  searches_quota = EXCLUDED.searches_quota,
  timeline_months = EXCLUDED.timeline_months,
  refresh_at = EXCLUDED.refresh_at;
```

After running this, **refresh your browser** and the pricing page buttons will show correctly!

## Daily Development

### Option A: Run Everything Together (Recommended)
```bash
npm run dev:full
```

This starts:
- Backend server (port 3000)
- Stripe webhook forwarding
- Frontend web app (port 8083)

**Important:** On first run, the Stripe CLI will print a webhook signing secret. Copy it and add to your `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx
```

Then restart the servers.

### Option B: Run Separately (Manual Control)

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Stripe Webhooks:**
```bash
npm run webhooks
# Copy the webhook secret and add to .env
# Then restart Terminal 1
```

**Terminal 3 - Frontend:**
```bash
npx expo start --web --port 8083
```

## Testing Payments

1. Make sure all three services are running (backend, webhooks, frontend)
2. Go to http://localhost:8083/pricing
3. Click "Continue" on any plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any future expiry date, any CVC, any ZIP code
6. Watch the webhook terminal - you should see events being processed
7. Check Supabase - you should see new records in `subscriptions` and `entitlements` tables
8. The pricing page buttons should now show "Your Plan" or "Upgrade"

## Troubleshooting

### Buttons still showing "Continue"
- Check browser console for `[Entitlements] Query result` - is data null?
- If yes, run the SQL fix from Step 3 above
- If still null after SQL, check Supabase RLS policies

### Webhooks not working
- Is Stripe CLI running? Check Terminal 2
- Did you copy the webhook secret to `.env`?
- Did you restart the backend server after updating `.env`?

### "No customer ID found"
- This means the webhook didn't create the subscription
- Manually run the SQL fix from Step 3
- For future payments, make sure webhooks are running first

## File Reference

- Setup guide: [STRIPE_WEBHOOKS.md](STRIPE_WEBHOOKS.md)
- SQL fix: [scripts/fix-entitlement.sql](scripts/fix-entitlement.sql)
- Windows webhook script: [scripts/setup-webhooks.bat](scripts/setup-webhooks.bat)
- Mac/Linux webhook script: [scripts/setup-webhooks.sh](scripts/setup-webhooks.sh)
