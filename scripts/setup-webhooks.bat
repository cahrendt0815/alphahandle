@echo off
REM Stripe Webhook Setup Script for Windows
REM This script helps set up Stripe CLI and webhook forwarding

echo ========================================
echo Stripe Webhooks Setup
echo ========================================
echo.

REM Check if Stripe CLI is installed
where stripe >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Stripe CLI is not installed!
    echo.
    echo Please install it using one of these methods:
    echo.
    echo 1. Using Scoop (recommended):
    echo    scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
    echo    scoop install stripe
    echo.
    echo 2. Download directly:
    echo    https://github.com/stripe/stripe-cli/releases/latest
    echo.
    pause
    exit /b 1
)

echo [OK] Stripe CLI is installed
echo.

REM Check if logged in
echo Checking Stripe CLI login status...
stripe --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] You may need to login to Stripe CLI
    echo Running: stripe login
    stripe login
)

echo.
echo ========================================
echo Starting Webhook Forwarding
echo ========================================
echo.
echo This will forward Stripe webhook events to:
echo   http://localhost:3000/api/stripe/webhook
echo.
echo IMPORTANT: Copy the webhook signing secret (whsec_...)
echo and add it to your .env file as STRIPE_WEBHOOK_SECRET
echo.
echo Press Ctrl+C to stop forwarding
echo.

stripe listen --forward-to localhost:3000/api/stripe/webhook
