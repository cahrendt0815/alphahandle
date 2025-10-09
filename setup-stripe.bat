@echo off
echo ========================================
echo Stripe CLI Setup - Step by Step
echo ========================================
echo.
echo STEP 1: Login to Stripe CLI
echo ----------------------------
echo.
echo A browser window will open asking you to authorize Stripe CLI.
echo Click "Allow access" when prompted.
echo.
pause

.\stripe.exe login

echo.
echo ========================================
echo STEP 2: Start Webhook Listener
echo ========================================
echo.
echo This will forward Stripe webhooks to your local server.
echo.
echo IMPORTANT: Look for this line in the output:
echo   "Your webhook signing secret is whsec_..."
echo.
echo Copy that secret and add it to your .env file as:
echo   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
echo.
echo Then restart your backend server (npm run server)
echo.
echo Press Ctrl+C to stop the webhook listener when done.
echo.
pause

.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
