# Setup Stripe Webhooks - Simple Instructions

## What You Need to Do

### Option 1: Run the Batch Script (Easiest)

1. **Double-click this file in Windows Explorer:**
   ```
   setup-stripe.bat
   ```

2. **Follow the prompts** - it will:
   - Open your browser to authorize Stripe CLI
   - Start the webhook listener
   - Show you the webhook secret

3. **Copy the webhook secret** that looks like: `whsec_xxxxxxxxxxxxx`

4. **Add it to your `.env` file:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

5. **Restart your backend server:**
   - Stop the current server (Ctrl+C in the terminal running `npm run server`)
   - Start it again: `npm run server`

---

### Option 2: Manual Steps

**Open a NEW Command Prompt or PowerShell window** in your project folder:

```bash
cd "c:\Users\Pamono\Downloads\Project_Bird\fintwit-performance"
```

**Step 1: Login to Stripe**
```bash
.\stripe.exe login
```
- A browser will open
- Click "Allow access" **immediately** (you have 60 seconds)
- Wait for "Done! The Stripe CLI is configured" message

**Step 2: Start Webhook Listener**
```bash
.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
```

**Step 3: Copy the Webhook Secret**

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_abc123xyz...
```

Copy that `whsec_...` value.

**Step 4: Update .env File**

Open `.env` in your project and add/update:
```env
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz...
```

**Step 5: Restart Backend Server**

In the terminal running your server:
- Press `Ctrl+C` to stop
- Run: `npm run server`

---

## Test Everything Works

1. **Keep webhook listener running** (don't close that terminal)
2. **Go to:** http://localhost:8083/pricing
3. **Complete a test payment** with card: `4242 4242 4242 4242`
4. **Watch the webhook terminal** - you should see:
   ```
   --> checkout.session.completed
   --> customer.subscription.created
   --> invoice.payment_succeeded
   ```
5. **Check your backend server logs** - you should see:
   ```
   [Webhook] Event received: checkout.session.completed
   [Webhook] Successfully provisioned subscription for user
   ```
6. **Go to Supabase** - check `entitlements` table has a new row
7. **Refresh pricing page** - buttons should show "Your Plan" or "Upgrade"

---

## Troubleshooting

**"Bestätigungs-Token konnte nicht geladen werden"**
- You took too long to click "Allow access"
- Close the browser tab and run `.\stripe.exe login` again
- Click the link IMMEDIATELY (within 60 seconds)

**"Command not found: stripe"**
- Make sure you're in the project folder
- Use `.\stripe.exe` (with the dot-slash)

**Webhook secret not showing**
- Look for the line: `Your webhook signing secret is whsec_...`
- It appears right after the listener starts

**No events showing in webhook listener**
- Make sure backend server is running on port 3000
- Check the webhook URL: `localhost:3000/api/stripe/webhook`

---

## Quick Reference

**Files you created:**
- `stripe.exe` - The Stripe CLI tool
- `setup-stripe.bat` - Automated setup script
- `.env` - Your environment variables (add webhook secret here)

**Commands:**
- Login: `.\stripe.exe login`
- Listen: `.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook`
- Test card: `4242 4242 4242 4242`

**After setup, for daily development, you need 3 terminals:**
1. `npm run server` (backend)
2. `.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook` (webhooks)
3. `npx expo start --web --port 8083` (frontend)

Or use: `npm run dev:full` to start everything at once (after initial setup)
