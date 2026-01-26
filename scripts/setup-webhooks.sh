#!/bin/bash
# Stripe Webhook Setup Script for Mac/Linux
# This script helps set up Stripe CLI and webhook forwarding

echo "========================================"
echo "Stripe Webhooks Setup"
echo "========================================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "[ERROR] Stripe CLI is not installed!"
    echo ""
    echo "Please install it using one of these methods:"
    echo ""
    echo "macOS (using Homebrew):"
    echo "  brew install stripe/stripe-cli/stripe"
    echo ""
    echo "Linux:"
    echo "  wget https://github.com/stripe/stripe-cli/releases/download/v1.19.5/stripe_1.19.5_linux_x86_64.tar.gz"
    echo "  tar -xvf stripe_1.19.5_linux_x86_64.tar.gz"
    echo "  sudo mv stripe /usr/local/bin"
    echo ""
    echo "Or download directly:"
    echo "  https://github.com/stripe/stripe-cli/releases/latest"
    echo ""
    exit 1
fi

echo "[OK] Stripe CLI is installed"
echo ""

# Check if logged in
echo "Checking Stripe CLI login status..."
if ! stripe --version &> /dev/null; then
    echo "[WARNING] You may need to login to Stripe CLI"
    echo "Running: stripe login"
    stripe login
fi

echo ""
echo "========================================"
echo "Starting Webhook Forwarding"
echo "========================================"
echo ""
echo "This will forward Stripe webhook events to:"
echo "  http://localhost:3000/api/stripe/webhook"
echo ""
echo "IMPORTANT: Copy the webhook signing secret (whsec_...)"
echo "and add it to your .env file as STRIPE_WEBHOOK_SECRET"
echo ""
echo "Press Ctrl+C to stop forwarding"
echo ""

stripe listen --forward-to localhost:3000/api/stripe/webhook
