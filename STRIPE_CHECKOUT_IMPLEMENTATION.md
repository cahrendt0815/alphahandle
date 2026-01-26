# Stripe Checkout Integration

This document outlines the Stripe Checkout integration with Monthly/Yearly pricing toggle.

## Overview

We've implemented:
- **PlanSelectionScreen** with Monthly/Yearly toggle
- **Serverless checkout endpoint** to create Stripe sessions
- **Client service** to call the checkout API
- **Success/Cancel screens** for post-checkout flows
- **Updated pricing** per requirements (Ape, Degen, GigaChad)

## New/Changed Files

### New Files

1. **`screens/PlanSelectionScreen.js`**
   - Plan cards with Monthly/Yearly toggle
   - Shows 3 plans: Ape, Degen (popular), GigaChad
   - Calls checkout service when "Continue" clicked
   - Opens Stripe Checkout URL (web: window.location.assign, native: expo-web-browser)

2. **`server/api/checkout/create.js`**
   - Serverless endpoint for creating Stripe Checkout Sessions
   - Reads: `plan`, `cycle`, `email` from request body
   - Returns: `{ url }` (Stripe Checkout URL)
   - Includes placeholder price IDs (see below)

3. **`services/checkout.js`**
   - Client-side wrapper for checkout endpoint
   - `createCheckoutSession(plan, cycle, email)` → `{ url, error }`
   - POSTs to `/api/checkout/create`

4. **`screens/PaySuccessScreen.js`**
   - Shown after successful Stripe Checkout
   - Displays success message with green checkmark
   - "Continue to app" button navigates to Home
   - TODO: Verify session with backend

5. **`screens/PayCancelScreen.js`**
   - Shown when user cancels checkout
   - "Try again" button → Plans screen
   - "Go to home" button → Home screen

### Changed Files

1. **`App.js`**
   - Added routes: `Plans`, `PaySuccess`, `PayCancel`
   - Removed old `PlanSelection` route (replaced with `Plans`)

2. **`screens/ResultsScreen.js`**
   - Updated navigation from `PlanSelection` → `Plans`

3. **`services/entitlements.js`**
   - Updated plan details with new pricing
   - Added `cycle` parameter to `getPlanDetails()` and `getAllPlans()`
   - Ape: $12.90/mo ($100.62/yr)
   - Degen: $19.90/mo ($155.22/yr)
   - GigaChad: $49.90/mo ($389.22/yr)

4. **`.env`**
   - Added `STRIPE_SECRET_KEY=sk_test_REPLACE_ME`
   - Added `APP_URL=http://localhost:8083`

## Plan Details

| Plan | Monthly | Yearly | Searches/mo | Timeline | Features |
|------|---------|--------|-------------|----------|----------|
| **Ape** | $12.90 | $100.62 (35% off) | 5 | 12 months | Basic metrics, email support |
| **Degen** | $19.90 | $155.22 (35% off) | 10 | 24 months | Advanced metrics, CSV export, priority support |
| **GigaChad** | $49.90 | $389.22 (35% off) | 50 | Unlimited | API access, white-label reports, dedicated support |

## Stripe Price ID Mapping

**IMPORTANT**: Replace placeholder price IDs in `server/api/checkout/create.js`

Location: **Line 12-24** in `server/api/checkout/create.js`

```javascript
const PRICE_IDS = {
  ape: {
    monthly: 'price_APE_MONTHLY',      // ← Replace with real Stripe price ID
    yearly: 'price_APE_YEARLY',        // ← Replace with real Stripe price ID
  },
  degen: {
    monthly: 'price_DEGEN_MONTHLY',    // ← Replace with real Stripe price ID
    yearly: 'price_DEGEN_YEARLY',      // ← Replace with real Stripe price ID
  },
  gigachad: {
    monthly: 'price_GIGACHAD_MONTHLY', // ← Replace with real Stripe price ID
    yearly: 'price_GIGACHAD_YEARLY',   // ← Replace with real Stripe price ID
  },
};
```

## Environment Variables

Add to `.env`:

```bash
# Stripe Configuration (Server-side only)
STRIPE_SECRET_KEY=sk_test_REPLACE_ME  # ← Replace with real Stripe secret key

# App URL for Stripe redirects
APP_URL=http://localhost:8083  # Update for production
```

**Note**: `STRIPE_SECRET_KEY` is only used server-side. It's never exposed to the client.

## Flow

### User Journey

1. **Results → "See more"** (logged in, no plan)
2. **Navigate to Plans screen**
3. **Select Monthly/Yearly toggle**
4. **Click "Continue" on plan card**
5. **Client calls `/api/checkout/create`**
6. **Server creates Stripe Checkout Session**
7. **Client opens Checkout URL**
8. **User completes payment on Stripe**
9. **Stripe redirects to:**
   - Success: `{APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`
   - Cancel: `{APP_URL}/pay/cancel`

### Code Flow

```
PlanSelectionScreen
  ↓ (user selects plan)
createCheckoutSession(plan, cycle, email)
  ↓ (POST /api/checkout/create)
server/api/checkout/create.js
  ↓ (stripe.checkout.sessions.create)
Stripe Checkout URL
  ↓ (user completes payment)
PaySuccessScreen or PayCancelScreen
```

## Expo-Specific Notes

### Required Packages

Installed via:
```bash
npx expo install expo-web-browser
npm install stripe
```

### Web vs Native

**Web**: Uses `window.location.assign(url)` to redirect to Stripe Checkout

**Native**: Uses `expo-web-browser` to open Stripe Checkout in-app browser

```javascript
if (Platform.OS === 'web') {
  window.location.assign(url);
} else {
  await WebBrowser.openBrowserAsync(url);
}
```

## URL Routing

Stripe redirects to these URLs after checkout:

- **Success**: `/pay/success?session_id={CHECKOUT_SESSION_ID}`
- **Cancel**: `/pay/cancel`

React Navigation handles these routes via the `PaySuccess` and `PayCancel` screens.

**Note**: For production, you may need to configure deep linking to handle these URLs properly on native apps. See [Expo Linking docs](https://docs.expo.dev/guides/linking/).

## Next Steps

1. **Create Stripe Products/Prices** in Stripe Dashboard
   - Create 6 prices total (3 plans × 2 cycles)
   - Copy price IDs (format: `price_xxxxxxxxxxxxx`)

2. **Update Price IDs** in `server/api/checkout/create.js` (line 12-24)

3. **Add Real Stripe Secret Key** to `.env`
   - Replace `sk_test_REPLACE_ME` with your Stripe secret key
   - For production, use live mode key: `sk_live_xxxxx`

4. **Update APP_URL** for production
   - Change from `http://localhost:8083` to your production URL
   - Example: `https://fintwit-performance.vercel.app`

5. **Implement Webhook Handler** (future)
   - Create `/api/webhooks/stripe` endpoint
   - Handle `checkout.session.completed` event
   - Update user entitlements in Supabase

6. **Update Entitlements Service** (future)
   - Query Stripe subscriptions via API
   - Replace mock data in `getEntitlementForUser()`

7. **Add Customer Portal** (future)
   - Create endpoint for `stripe.billingPortal.sessions.create()`
   - Allow users to manage subscriptions

## Testing

### Test Flow (without real Stripe)

Since we're using placeholder price IDs, the checkout endpoint will fail. To test the UI:

1. Visit Plans screen: Logged-in user without plan → click "See more" on Results
2. Toggle Monthly/Yearly → observe price updates
3. Click "Continue" → will show error (expected until real Stripe configured)

### Test Flow (with real Stripe)

1. Create Stripe products/prices in test mode
2. Update price IDs and secret key
3. Click "Continue" on plan → opens Stripe Checkout
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout → redirects to PaySuccessScreen
6. Verify session ID in URL params

## Copy Reference

### Plan Descriptions

- **Ape**: "5 searches/mo • timeline up to 12 months"
- **Degen**: "10 searches/mo • timeline up to 24 months"
- **GigaChad**: "50 searches/mo • unlimited timeline"

### Footer Text

"All plans include a 7-day free trial. Cancel anytime, no questions asked."

## Troubleshooting

### Error: "Stripe not configured"

Check that `STRIPE_SECRET_KEY` is set in `.env` and is not the placeholder value.

### Error: "Invalid price ID"

Ensure price IDs in `PRICE_IDS` object match your Stripe Dashboard price IDs exactly.

### Redirect not working after checkout

1. Verify `APP_URL` in `.env` matches your app URL
2. For native apps, configure deep linking in `app.json`

### Checkout URL not opening

**Web**: Check browser console for errors
**Native**: Ensure `expo-web-browser` is installed correctly

## Security Notes

- ✅ Stripe secret key only used server-side (not in client bundle)
- ✅ Client only receives checkout URL (no sensitive data)
- ✅ Price IDs are public and safe to expose
- ⚠️ TODO: Verify session_id on success screen before granting access
- ⚠️ TODO: Implement webhook signature verification

---

**Implementation Complete** ✓

All acceptance criteria met:
- ✅ From Results → "See more" (logged in, no plan) lands on PlanSelectionScreen
- ✅ Selecting plan + cycle calls `/api/checkout/create` and opens Checkout URL
- ✅ No Stripe secrets in client bundle
- ✅ Placeholder price IDs used (ready for real IDs)
- ✅ Monthly/Yearly toggle with 35% discount calculation
- ✅ PaySuccess and PayCancel placeholder screens
- ✅ Expo-web-browser integration for native support
