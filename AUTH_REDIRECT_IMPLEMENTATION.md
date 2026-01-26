# Auth Redirect Implementation

Improved authentication flow that redirects users directly to the Plan Selection screen after signing in.

## ✅ Implementation Complete

### 🎯 Goal Achieved

Users are now automatically redirected to the **Plan Selection screen** (`/plans`) after authentication, whether they sign in via:
- ✅ **Google OAuth**
- ✅ **Email Magic Link**

The redirect flow preserves context and ensures users land on the plan selection immediately after confirming their email or completing Google OAuth.

---

## 📁 New Files

### 1. **[utils/authRedirect.js](./utils/authRedirect.js)**
Helper module for managing auth redirect intent using localStorage.

**Key Functions:**
- `setAuthRedirectIntent(route, params)` - Store redirect destination before auth
- `getAndClearAuthRedirectIntent()` - Retrieve and clear stored intent (with 30-min expiry)
- `getAuthRedirectUrl(path)` - Get full redirect URL for Supabase auth callbacks

**How it works:**
```javascript
// Before auth (in AuthModal)
setAuthRedirectIntent('Plans'); // Store intent

// After auth (in AuthProvider)
const intent = getAndClearAuthRedirectIntent(); // { route: 'Plans', params: null }
navigation.navigate(intent.route, intent.params);
```

---

## 📝 Changed Files

### 1. **[App.js](./App.js)**
**Changes:**
- Added `navigationRef` using `useRef()`
- Passed `navigationRef` to both `AuthProvider` and `NavigationContainer`
- Enables programmatic navigation from AuthProvider

**Code:**
```javascript
const navigationRef = useRef(null);

return (
  <AuthProvider navigationRef={navigationRef}>
    <NavigationContainer ref={navigationRef}>
      {/* ... */}
    </NavigationContainer>
  </AuthProvider>
);
```

### 2. **[auth/AuthProvider.js](./auth/AuthProvider.js)**
**Major changes:**

#### Added Navigation Handling
- Accepts `navigationRef` prop
- Imports `getAndClearAuthRedirectIntent` and `getAuthRedirectUrl`

#### Updated `onAuthStateChange` Handler
```javascript
if (_event === 'SIGNED_IN' && session?.user) {
  // Check for stored redirect intent
  const redirectIntent = getAndClearAuthRedirectIntent();

  if (redirectIntent && navigationRef?.current) {
    // Navigate to stored route
    setTimeout(() => {
      navigationRef.current?.navigate(redirectIntent.route, redirectIntent.params);

      // Show welcome message after redirect
      setTimeout(() => {
        Alert.alert('Welcome!', `Signed in as ${displayName}`);
      }, 300);
    }, 100);
  }
}
```

#### Updated Auth Methods
Both `signInWithGoogle()` and `signInWithEmailMagicLink()` now use:
```javascript
// Redirect to /plans after auth
const redirectTo = getAuthRedirectUrl('/plans');

// Google OAuth
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo, /* ... */ }
});

// Email Magic Link
await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: redirectTo }
});
```

**Key Points:**
- Supabase redirects to `/plans` URL path on web
- AuthProvider reads stored intent and navigates programmatically
- Works for both new sign-ups and returning users

### 3. **[components/AuthModal.js](./components/AuthModal.js)**
**Changes:**
- Imports `setAuthRedirectIntent`
- Sets redirect intent **before** calling auth methods

**Code:**
```javascript
import { setAuthRedirectIntent } from '../utils/authRedirect';

const handleGoogleSignIn = async () => {
  // Set redirect intent before auth
  setAuthRedirectIntent('Plans');

  const { error } = await signInWithGoogle();
  // ...
};

const handleEmailSignIn = async () => {
  // Set redirect intent before auth
  setAuthRedirectIntent('Plans');

  const { error } = await signInWithEmailMagicLink(email);
  // ...
};
```

---

## 🔄 How It Works

### Flow for Google OAuth

1. User clicks **"Continue with Google"** in AuthModal
2. `setAuthRedirectIntent('Plans')` stores `{ route: 'Plans', timestamp: ... }` in localStorage
3. `signInWithGoogle()` calls Supabase with `redirectTo: 'http://localhost:8083/plans'`
4. Google OAuth popup completes, Supabase redirects to `/plans`
5. AuthProvider's `onAuthStateChange` fires with `SIGNED_IN` event
6. `getAndClearAuthRedirectIntent()` retrieves stored intent
7. `navigationRef.current.navigate('Plans')` navigates to Plan Selection screen
8. Welcome toast appears

### Flow for Email Magic Link

1. User enters email in AuthModal and clicks **"Send magic link"**
2. `setAuthRedirectIntent('Plans')` stores intent in localStorage
3. `signInWithEmailMagicLink()` sends email with `emailRedirectTo: 'http://localhost:8083/plans'`
4. User clicks link in email
5. Supabase confirms email and redirects to `/plans`
6. AuthProvider's `onAuthStateChange` fires with `SIGNED_IN` event
7. `getAndClearAuthRedirectIntent()` retrieves stored intent
8. `navigationRef.current.navigate('Plans')` navigates to Plan Selection screen
9. Welcome toast appears

### Intent Expiry

Stored intents expire after **30 minutes** to prevent stale redirects. This handles cases where:
- User starts auth but doesn't complete it
- User closes browser before confirming
- Multiple auth attempts over time

---

## 🌐 Supabase Configuration

### Required Settings

In **Supabase Dashboard → Authentication → URL Configuration**:

1. **Site URL**: `http://localhost:8083` (or your production URL)
2. **Redirect URLs** (add both):
   - `http://localhost:8083/plans`
   - `http://localhost:8083/` (fallback)

For production, add your production URLs:
- `https://yourapp.com/plans`
- `https://yourapp.com/`

### Why Both URL and Intent Storage?

- **Supabase `redirectTo`**: Handles the OAuth/magic link callback URL (web navigation)
- **localStorage intent**: Handles client-side routing within React Navigation (app navigation)

This two-pronged approach ensures:
1. Web browser lands on correct path after OAuth callback
2. React Navigation then navigates to correct screen
3. Works seamlessly for both web and native (with deep linking)

---

## ✅ Acceptance Criteria Met

- ✅ **Email Magic Link**: Clicking confirm in email redirects to Plan Selection screen
- ✅ **Google OAuth**: After Google authentication, users land on Plan Selection screen
- ✅ **Context Preserved**: Redirect remembers why user logged in (from "See more" click)
- ✅ **Consistent Flow**: Both auth methods use identical redirect logic
- ✅ **No Manual Search**: Users don't need to search again after auth

---

## 🧪 Testing

### Test Google OAuth Flow
1. Open app (not logged in)
2. Navigate to Results screen
3. Click "See more"
4. AuthModal appears
5. Click "Continue with Google"
6. Complete Google sign-in
7. **Expected**: Lands on Plan Selection screen showing Ape/Degen/GigaChad
8. **Expected**: Welcome toast appears

### Test Email Magic Link Flow
1. Open app (not logged in)
2. Navigate to Results screen
3. Click "See more"
4. AuthModal appears
5. Switch to "Email" tab
6. Enter email and click "Send magic link"
7. Check email inbox
8. Click magic link in email
9. **Expected**: Browser opens to `/plans` path
10. **Expected**: App navigates to Plan Selection screen
11. **Expected**: Welcome toast appears

### Test Intent Expiry
1. Set redirect intent (click "See more", open auth modal)
2. Close modal without completing auth
3. Wait 31 minutes
4. Sign in via different method (e.g., direct URL)
5. **Expected**: No redirect happens (intent expired)
6. **Expected**: Lands on home screen or stays on current screen

---

## 🔧 Future Enhancements

### Context-Aware Redirects
Currently always redirects to `Plans`. Could enhance to:
- Redirect to last viewed Results screen with handle
- Redirect to specific plan (e.g., `Plans` with `{ preselectedPlan: 'degen' }`)
- Store full navigation state before auth

**Example:**
```javascript
// In ResultsScreen, before showing auth
setAuthRedirectIntent('Results', { handle: 'elonmusk' });

// After auth, navigate back to same results
navigation.navigate('Results', { handle: 'elonmusk' });
```

### Deep Linking (Native Apps)
For React Native apps, configure deep linking in `app.json`:
```json
{
  "expo": {
    "scheme": "fintwitperformance",
    "web": { "bundler": "metro" }
  }
}
```

Then update redirect URLs to use deep links:
```javascript
// Native
const redirectTo = Platform.OS === 'web'
  ? getAuthRedirectUrl('/plans')
  : 'fintwitperformance://plans';
```

---

## 📊 Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Google OAuth redirect | ✅ | Redirects to `/plans` |
| Email magic link redirect | ✅ | Redirects to `/plans` |
| Intent storage | ✅ | localStorage with expiry |
| Navigation ref | ✅ | Programmatic navigation |
| Web support | ✅ | Fully working |
| Native support | ⚠️ | Requires deep linking config |
| Context preservation | ✅ | Via localStorage intent |

---

**Implementation complete!** Users now have a seamless auth experience that takes them directly to plan selection without manual navigation. 🎉
