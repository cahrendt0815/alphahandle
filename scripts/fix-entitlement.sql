-- Fix Missing Entitlement Script
-- Run this in Supabase SQL Editor if you completed a payment before setting up webhooks

-- Step 1: Find your user ID
-- Replace 'your-email@example.com' with your actual email
SELECT
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE email = 'your-email@example.com';

-- Step 2: Check if you already have records
-- Replace 'YOUR_USER_ID' with the ID from Step 1
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
SELECT * FROM entitlements WHERE user_id = 'YOUR_USER_ID';

-- Step 3: Create the entitlement record
-- Update the values below based on which plan you purchased:
--   Plan: 'ape', 'degen', or 'gigachad'
--   Searches: 5 (ape), 10 (degen), 50 (gigachad)
--   Timeline: 12 (ape), 24 (degen), 999 (gigachad for unlimited)
--   Cycle: 'monthly' or 'yearly'

INSERT INTO entitlements (user_id, plan, searches_quota, timeline_months, refresh_at)
VALUES (
  'YOUR_USER_ID',  -- Replace with your user ID from Step 1
  'degen',         -- Change to your plan: 'ape', 'degen', or 'gigachad'
  10,              -- 5 for ape, 10 for degen, 50 for gigachad
  24,              -- 12 for ape, 24 for degen, 999 for gigachad
  NOW() + INTERVAL '1 month'  -- Change to '1 year' if you bought yearly
)
ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  searches_quota = EXCLUDED.searches_quota,
  timeline_months = EXCLUDED.timeline_months,
  refresh_at = EXCLUDED.refresh_at;

-- Step 4: Create a subscription record (optional, for billing history)
INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  plan,
  cycle,
  status,
  current_period_end
)
VALUES (
  'YOUR_USER_ID',  -- Replace with your user ID from Step 1
  'cus_manual_' || gen_random_uuid(),
  'sub_manual_' || gen_random_uuid(),
  'degen',         -- Match the plan from Step 3
  'monthly',       -- 'monthly' or 'yearly'
  'active',
  NOW() + INTERVAL '1 month'  -- Match the interval from Step 3
)
ON CONFLICT (stripe_subscription_id) DO NOTHING;

-- Step 5: Verify the records were created
SELECT * FROM entitlements WHERE user_id = 'YOUR_USER_ID';
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Done! Refresh your app and the pricing buttons should now show correctly.
