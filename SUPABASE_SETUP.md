# Workout App — Supabase setup

The app continues to use the existing `workout_tracker_phase1_v1` localStorage key and IndexedDB mirror. No local history is deleted.

1. Create a Supabase project at https://supabase.com/dashboard.
2. Open **SQL Editor**, paste `supabase-schema.sql`, and run it.
3. In **Authentication → Providers → Email**, enable email sign-in / magic links. Configure the email template to use a magic link (not a six-digit OTP) if needed.
4. In **Authentication → URL Configuration**, add `https://omar-abdelmagid.github.io/workout-app/` to the Redirect URLs list. Set the Site URL to the same address.
5. In **Project Settings → API Keys**, copy the **publishable** key (or legacy anon key), NOT the secret/service_role key. Copy the Project URL from the API settings.
6. Open the workout app → **History → Supabase sync → One-time Supabase setup**. Enter Project URL and publishable key, and then your email. Tap **Email me a sign-in link**.
7. Open the email link on the same iPhone. Return to the app and confirm **Cloud backup up to date ✓**.

Supabase may use an email OTP instead of a link if the email template is configured for a code. This implementation expects a magic-link redirect containing an access token. Auth tokens are stored locally and refreshed automatically, but reauthentication may occasionally be required.

**Security:** The URL and publishable key are public configuration, not secrets. Never paste a service_role/secret key into the app. Row-level security limits each signed-in user to their own workouts.

**Scope:** Completed sessions sync and restore. Active workouts and program selection remain local. Existing Google Sheets data is not imported automatically; the app imports completed sessions already present on this device.
