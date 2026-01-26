# Vercel Deployment Checklist

## ✅ Configuration Complete

All necessary files have been created for Vercel deployment.

## Files Created

1. ✅ `vercel.json` - Vercel configuration
2. ✅ `api/analyze.js` - Analysis endpoint
3. ✅ `api/checkout/create.js` - Stripe checkout
4. ✅ `api/stripe/webhook.js` - Stripe webhooks (Vercel-compatible)
5. ✅ `api/billing/portal.js` - Billing portal
6. ✅ `api/billing/invoices.js` - Invoice listing

## Pre-Deployment Checklist

### 1. Environment Variables in Vercel Dashboard

**Required:**
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `EXPO_PUBLIC_SUPABASE_URL`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `EXPO_PUBLIC_STOCK_ANALYSIS_API_URL` (your analyst API URL)
- [ ] `EXPO_PUBLIC_APP_URL` (your production URL, e.g., https://alphahandle.com)

**Optional:**
- [ ] `STOCK_ANALYSIS_API_TOKEN` or `STOCK_ANALYSIS_API_KEY` (if analyst API requires auth)

**Remove (if present):**
- [ ] `ANALYSIS_BASE_URL`
- [ ] `ANALYSIS_API_URL`
- [ ] `EXPO_PUBLIC_ANALYSIS_API_URL`
- [ ] `MARKET_BASE_URL`
- [ ] `TWITTER_API_KEY`
- [ ] `EODHD_API_TOKEN`
- [ ] `DEEPSEEK_API_KEY`

### 2. Vercel Project Settings

In Vercel Dashboard → Project Settings → General:

- [ ] **Framework Preset**: Other (or blank)
- [ ] **Root Directory**: `.` (repo root)
- [ ] **Build Command**: `npm run build` (should auto-detect from vercel.json)
- [ ] **Output Directory**: `dist` (should auto-detect from vercel.json)
- [ ] **Install Command**: `npm install` (should auto-detect from vercel.json)

### 3. Git Integration

- [ ] Repository connected to Vercel
- [ ] Auto-deploy enabled (deploys on push to main/master)

### 4. Stripe Webhook Configuration

- [ ] Webhook endpoint URL in Stripe: `https://your-app.vercel.app/api/stripe/webhook`
- [ ] Webhook secret copied to Vercel env var: `STRIPE_WEBHOOK_SECRET`
- [ ] Events enabled: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_succeeded`

## Deployment

### Automatic (Recommended):
1. Push to your Git repository
2. Vercel automatically detects and deploys

### Manual:
```bash
npm i -g vercel
vercel --prod
```

## Post-Deployment Testing

### 1. Frontend
- [ ] Visit `https://your-app.vercel.app`
- [ ] App loads correctly
- [ ] Navigation works

### 2. Analysis Endpoint
```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"handle":"@rubicon59","months":6}'
```
- [ ] Returns 200 OK
- [ ] Returns analysis data

### 3. Stripe Checkout
- [ ] Test checkout flow
- [ ] Redirects to Stripe correctly

### 4. Webhook
- [ ] Test webhook in Stripe dashboard
- [ ] Check Vercel function logs for webhook events

## Troubleshooting

### Build Fails:
1. Check Vercel build logs
2. Test locally: `npm run build`
3. Verify `dist/` directory is created

### API Functions Return 500:
1. Check Vercel function logs
2. Verify environment variables are set
3. Check that `server/lib/stripePlans.js` is accessible

### Webhook Signature Fails:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe
2. Check webhook URL in Stripe matches Vercel URL
3. View function logs for detailed error

## Success Criteria

✅ Frontend loads at your Vercel URL
✅ `/api/analyze` endpoint works
✅ Stripe checkout works
✅ Webhooks are received and processed
✅ No errors in Vercel logs

## Next Steps After Deployment

1. Update Stripe webhook URL to point to Vercel
2. Test full user flow (sign up → checkout → analysis)
3. Monitor Vercel function logs for any issues
4. Set up error monitoring (optional)

Your deployment should now work! 🚀
