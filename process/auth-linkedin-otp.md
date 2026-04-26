# Auth: LinkedIn OAuth + Email OTP

**Date:** 2026-04-26

## What was done

Replaced the placeholder Google OAuth with two real sign-in methods:

1. **LinkedIn OAuth** via Supabase (`provider: "linkedin_oidc"`)
2. **Email Magic Link / OTP** via `supabase.auth.signInWithOtp({ email })`

## Files changed

| File | Change |
|------|--------|
| `app/components/AuthButton.tsx` | Rewrote sign-in dropdown: email OTP form + LinkedIn button. Removed Google. |
| `app/chat-client.tsx` | Updated auth modal to use LinkedIn instead of Google. Replaced `GoogleIcon` with `LinkedInIcon`. |
| `app/styles.css` | Renamed `auth-google-btn` → `auth-oauth-btn`. Added `.auth-otp-*`, `.auth-or-divider`, `.auth-dropdown--wide` classes. |

## Supabase Dashboard steps required

Before this works in production you must configure both providers in the Supabase dashboard:

### LinkedIn (OIDC)
1. Go to **Authentication → Providers → LinkedIn (OIDC)**
2. Enable it
3. Paste your **Client ID** and **Client Secret**
4. Set the callback URL in your LinkedIn app to:
   `https://<your-project>.supabase.co/auth/v1/callback`

### Email OTP / Magic Link
1. Go to **Authentication → Providers → Email**
2. Ensure **Enable Email provider** is on
3. Enable **"Magic Link"** (no password required)
4. Optionally enable **"Confirm email"** — if on, users click a link; if off, a 6-digit OTP is used

## How the flow works

**Email OTP:**
- User types their email → hits "Send link"
- `signInWithOtp` sends a magic link to their inbox
- Clicking the link redirects back to the app and `onAuthStateChange` picks up the session

**LinkedIn:**
- User clicks "Continue with LinkedIn" → redirected to LinkedIn consent page
- After approval, redirected back to `window.location.origin`
- `onAuthStateChange` picks up the session

## Notes

- `shouldCreateUser: true` in `signInWithOtp` means new users are auto-created on first OTP send.
- LinkedIn OIDC returns `full_name` and `avatar_url` in `user_metadata` (same fields the UI already reads).
