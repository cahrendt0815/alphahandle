# Localhost Redirect Fix

## Problem
When logging in, users were being redirected to the production URL (alphahandle.com) instead of localhost during local development.

## Solution
Updated `utils/authRedirect.js` to automatically detect development environment and use localhost for redirects.

## How It Works

The `getAuthRedirectUrl()` function now:

1. **Checks for environment variable first**: If `EXPO_PUBLIC_APP_URL` is set, it uses that
2. **Detects development environment**: Checks if hostname is:
   - `localhost`
   - `127.0.0.1`
   - Starts with `192.168.` (local network)
   - Starts with `10.` (local network)
   - Contains `.local` (local domain)
3. **Uses appropriate URL**:
   - **Development**: `http://localhost:8083` (or current port)
   - **Production**: Current host URL

## Usage

### Option 1: Automatic Detection (Recommended)
Just access your app from `http://localhost:8083` and the redirect will automatically use localhost.

### Option 2: Environment Variable Override
Add to your `.env` file:
```
EXPO_PUBLIC_APP_URL=http://localhost:8083
```

This will force all redirects to use localhost, even if accessed from a different URL.

## Testing

1. Start your local dev server:
   ```bash
   npm run dev:web
   ```

2. Access the app at `http://localhost:8083`

3. Try logging in with Google OAuth or email magic link

4. After authentication, you should be redirected back to `http://localhost:8083/portal` (or your configured path)

## Important Notes

- Make sure you're accessing the app from `localhost:8083` when developing locally
- If you access from `alphahandle.com`, redirects will go to `alphahandle.com` (this is expected behavior)
- Supabase redirect URLs must be configured in Supabase Dashboard:
  - Development: `http://localhost:8083/portal`
  - Production: `https://alphahandle.com/portal`

## Supabase Configuration

In your Supabase Dashboard → Authentication → URL Configuration:

**Redirect URLs** (add both for development):
- `http://localhost:8083/portal`
- `http://localhost:8083/*` (wildcard for all paths)

**Site URL**:
- Development: `http://localhost:8083`
- Production: `https://alphahandle.com`
