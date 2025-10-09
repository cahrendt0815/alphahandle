# Stripe Webhooks Setup Guide

This guide explains how to set up Stripe webhooks for local development so that subscription events (checkout completed, subscription updates, etc.) are properly synced to your database.

## Problem

When you complete a test payment in Stripe Checkout, the webhook events need to be sent to your local server at `http://localhost:3000/api/stripe/webhook`. However, Stripe can't reach your localhost directly.

## Solution: Stripe CLI

The Stripe CLI forwards webhook events from Stripe to your local server.

### Step 1: Install Stripe CLI

**Windows (using Scoop):**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**macOS (using Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download the latest release
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.5/stripe_1.19.5_linux_x86_64.tar.gz
tar -xvf stripe_1.19.5_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

**Or download directly:**
Visit https://github.com/stripe/stripe-cli/releases/latest

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser and ask you to authorize the CLI.

### Step 3: Forward Webhooks to Local Server

Run this command in a new terminal (keep it running):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This command will:
1. Print a webhook signing secret (starts with `whsec_`)
2. Forward all Stripe events to your local server

### Step 4: Update Environment Variables

Copy the webhook signing secret from the CLI output and update your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

**Important:** Restart your backend server after updating the `.env` file:
```bash
npm run server
```

### Step 5: Test It

1. Make sure both servers are running:
   - Backend: `npm run server` (port 3000)
   - Frontend: `npx expo start --web --port 8083` (port 8083)
   - Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

2. Complete a test payment at http://localhost:8083/pricing

3. Watch the Stripe CLI terminal - you should see events being forwarded:
   ```
   2024-01-15 12:34:56  --> checkout.session.completed [evt_xxx]
   2024-01-15 12:34:57  --> customer.subscription.created [evt_xxx]
   2024-01-15 12:34:58  --> invoice.payment_succeeded [evt_xxx]
   ```

4. Check your backend server logs - you should see:
   ```
   [Webhook] Event received: checkout.session.completed evt_xxx
   [Webhook] Processing checkout.session.completed: cs_test_xxx
   [Webhook] Successfully provisioned subscription for user: <user-id>
   ```

5. Check your Supabase database - you should now have records in:
   - `subscriptions` table
   - `entitlements` table

## Using the Helper Script

Instead of running commands manually, use the helper script:

```bash
npm run dev:webhooks
```

This will start all three services in parallel:
- Backend server
- Stripe webhook listener
- Logs from both

## Troubleshooting

### Webhook signature verification failed
- Make sure you copied the correct `STRIPE_WEBHOOK_SECRET` from `stripe listen` output
- Restart the backend server after updating `.env`

### Events not appearing in CLI
- Check that Stripe CLI is logged in: `stripe login`
- Make sure the CLI is still running

### Webhook processed but no database records
- Check backend server logs for errors
- Verify Supabase credentials in `.env`
- Check that tables exist in Supabase dashboard

### No customer ID found in database
- This means the webhook wasn't processed successfully
- Check that user email in Stripe matches the email in your Supabase auth users

## Manual Database Fix (One-Time)

If you already completed a test payment before setting up webhooks, run this SQL in Supabase to manually create your entitlement:

```sql
-- Check your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Create entitlement (replace user_id with your actual user ID)
INSERT INTO entitlements (user_id, plan, searches_quota, timeline_months, refresh_at)
VALUES (
  'your-user-id-here',
  'degen',  -- or 'ape' or 'gigachad'
  10,       -- 5 for ape, 10 for degen, 50 for gigachad
  24,       -- 12 for ape, 24 for degen, 999 for gigachad
  NOW() + INTERVAL '1 month'
)
ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  searches_quota = EXCLUDED.searches_quota,
  timeline_months = EXCLUDED.timeline_months,
  refresh_at = EXCLUDED.refresh_at;

-- Create subscription record
INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, cycle, status, current_period_end)
VALUES (
  'your-user-id-here',
  'cus_manual_' || gen_random_uuid(),
  'sub_manual_' || gen_random_uuid(),
  'degen',
  'monthly',
  'active',
  NOW() + INTERVAL '1 month'
);
```

## Production Setup

For production, you'll configure webhooks directly in the Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your production webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the signing secret and add to production environment variables

## Reference

- Stripe CLI docs: https://stripe.com/docs/stripe-cli
- Webhook testing: https://stripe.com/docs/webhooks/test
