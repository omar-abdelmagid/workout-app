# Workout App — Project Context & Maintenance Guide
Updated: 2026-11-15. Source of truth: current repository and connected Supabase project.

## Purpose and working agreement
Personal iPhone-first workout tracking progressive web app (PWA), installed from Safari/Home Screen, not distributed through App Store. User expects ChatGPT to **implement, commit, and deploy** requested code changes via the connected GitHub tools, and use the connected Supabase tools for approved database/API changes. Do not merely provide code to paste when tools are available. Prefer small, tested changes, maintain the native iOS feel, and report commit/deployment status truthfully.

**Critical:** Preserve all existing workout sessions, unfinished workouts, selected program, program versions, cloud backups, and private device-key authentication. Do not reset localStorage, drop/overwrite sessions, delete old program versions, replace authentication with OAuth/magic links, or expose keys/secrets. Before destructive or program-wide changes, confirm intent. User previously declined backfilling workout history from old ChatGPT checkbox chats; do not invent/import historical sessions.

## Live systems
- GitHub repository: https://github.com/omar-abdelmagid/workout-app
- Branch: `main`; GitHub Actions deploys GitHub Pages.
- App: https://omar-abdelmagid.github.io/workout-app/
- Supabase project ID: `yipexqnkvwlvprhzstfr`
- Supabase project URL: `https://yipexqnkvwlvprhzstfr.supabase.co`
- Backend Edge Function: `workout-backup` (at last verified, version 5; `verify_jwt:false` by design because it validates a private device key itself).
- Allowed web origin: `https://omar-abdelmagid.github.io` (not the path).
- Last inspected frontend service worker cache: `workout-ios-v25` (inspect latest before changing).

## Architecture and important files
Static HTML/CSS/JavaScript PWA, no frontend build step required for ordinary edits.
- `index.html`: app layout, screens, controls, stylesheet and script tags.
- `app.js`: default programs, workout state, active workout, History, program selection, rendering and navigation orchestration.
- `native-ui.js`: Framework7 iOS-style navigation, tab routing, modal sheets, native dialogs; exposes `window.WorkoutUI`. Framework7 owns navigation; `app.js` owns workout data.
- `native-ui.css`: iPhone native-feeling layout, tab bar, workout cards and sheets.
- `vendor/framework7/`: locally bundled Framework7 JS/CSS; preserve offline availability.
- `progress.js`: Phase 5 read-only progress calculations and dashboard.
- `supabase-sync.js`: device-key connection, cloud session/program/app-state sync, queued archives and deletions.
- `sw.js`: service worker, offline shell and versioned cache.
- `manifest.webmanifest`, `icon.svg`: PWA metadata/assets.
- `PHASE4_PROGRAMS.md`: versioned programs and cloud migration guide.
- `README.md`: **outdated Phase 0 Google Sheets experiment**; do not mistake its old OAuth instructions for the current app.
- `.github/workflows/`: Pages deployment.

Frontend uses Framework7 (iOS theme) with tabs Today, Programs, History, Progress. Workouts and exercises use name-to-photo lookup from `yuhonas/free-exercise-db`; remote photos may be unavailable offline. Warm-up photos are mapped by normalized names; `photoUrl` must use the resolved ID rather than accidentally constructing an `undefined` URL. Preserve iOS safe-area behavior and avoid duplicated IDs/route state.

## Data model and security
Private device key stored **only locally** as `localStorage['workout_device_key_v1']`. The Edge Function checks the `x-workout-key` header against SHA-256 `key_hash` in `public.workout_device_access`, resolves owner `user_id`, and uses server-side Supabase credentials. Never commit the key or server secret. Supabase tables are owner-scoped; RLS enabled, no direct anon/authenticated access for private workout tables.

Local storage:
- `workout_tracker_phase1_v1`: primary state, sessions, active workout, program ID, next-day indices.
- `workout_programs_cache_v1`: cached cloud programs.
- `workout_cloud_state_at_v1`, `workout_cloud_state_dirty_v1`: sync state.
- `workout_pending_archives_v1`: offline archive queue.
- `workout_pending_session_deletions_v1`: offline delete queue.
- `workout_device_key_v1`: private bearer key; never inspect/share it.

Supabase tables:
- `workout_device_access`: private device-key ownership.
- `workout_sessions`: immutable historical workout JSON `payload`, `id`, `user_id`, nullable program/version/day links.
- `workout_programs`: program IDs/names/descriptions/archive flags.
- `workout_program_versions`: versioned program definitions.
- `workout_program_days`: ordered days, legacy `warmup` text.
- `workout_program_exercises`: ordered exercises, `name`, `sets`, `reps`, `alternative`, `rest_seconds`, `exercise_group` (`warmup` or `main`).
- `workout_app_state`: selected program, next-day indices, unfinished active workout.
- `workout_session_deletions`: owner-scoped deletion tombstones, prevents deleted sessions from reappearing after sync.

`workout-backup` API:
- GET: sessions, programs (highest version, warm-up and main exercises separated), app state, deleted session IDs.
- POST `{sessions:[...]}`: append completed sessions (ignore duplicate IDs).
- POST `{sessions:[],appState:{selectedProgramId,next,active}}`: sync selection, next-day state, unfinished workout.
- POST `{sessions:[],archive:{id,archived}}`: archive/restore.
- POST `{sessions:[],deleteSessionId:id}`: tombstone then delete owner-scoped session.
- Key validation applies to every request. No client service-role key.
- Sync uses local/offline-first state, restores cloud sessions, queues changes, and uses last-write-wins for some app state; avoid concurrent active workout editing on two devices.

## Programs and workout semantics
Original 4-day and 5-day hypertrophy programs: stable IDs `four` and `five`. Initial versions 1 remain intact. Version 2 incorporated warm-ups as explicit `exercise_group='warmup'` exercise rows; 38 warm-up rows across nine days, preserving 54 original main exercises. The app supports program switching, browsing days, archiving/restoring non-active programs, and program creation/update through ChatGPT plus Supabase.

To update an existing program: create a **new integer version** with its own days/exercises. Do not mutate old versions; sessions refer to them. Warm-up rows first with contiguous `exercise_index`, then main rows. Preserve active workouts' snapshots and `programVersion`. Only change selected program if requested. `PHASE4_PROGRAMS.md` has the insertion workflow.

Active workout: starts with warm-up checkbox exercises and then main checkbox exercises. Main exercises support an optional *maximum weight* in pounds and alternative swaps. The app does **not** currently record actual set-by-set reps/weights. Finishing saves the session, advances next day, returns Home and shows a completion-success banner. Finish button is large/full-width; Discard is smaller and separated to avoid accidental presses and requires confirmation. History shows details and confirmed Delete; deletions remove from Progress and sync to cloud with tombstones. All changes should remain compatible with old saved sessions.

## Phase 5 Progress dashboard
`progress.js` reads completed sessions; no database schema changes for analytics:
- Total completed workouts, past 28 days, current week.
- 12-week workout-frequency chart.
- Exercise-specific max-weight trend for completed non-warm-up exercises with recorded weight.
- Personal records = heaviest logged weight per exercise (not estimated 1RM).
- **Estimated** volume only: logged maximum weight × prescribed sets × lower end of prescribed reps for compatible completed exercises. This is *not actual lifted volume*. Exclude warm-ups, missing weight, and incompatible rep formats. Never label estimates as measured set-by-set volume.
- Dashboard updates on local completion, cloud restore and deletion.

## Recent development timeline
- Phase 4: Supabase program migration/versioning, device-key sync, program switching/archive.
- Warm-ups made first-class checked exercises; exercise images added and repaired.
- Workout start preview made more prominent without listing all exercises.
- Phase 5 dashboard added: commit `8cb9ec4`.
- Finish/Discard layout and Home success message: commit `0549de6`.
- History delete with cloud tombstones: commit `2cf1591`; Edge Function v5.
- Subsequent native iOS Framework7 UI work is present in current `main`; latest files use cache `workout-ios-v25`. Always inspect latest `main` before modifying; earlier commit hashes are historical, not necessarily HEAD.

## How to work on this project
1. Read relevant files from current `main` via GitHub connector; do not rely on an older chat summary alone. For Supabase tasks, read installed `skills://plugins/supabase/supabase/skill.md` and inspect current Edge Function/schema.
2. Plan compatibility: active workout, historical JSON payloads, offline data, synced state, tombstones, program version references, iPhone navigation.
3. Implement changes in GitHub; commit atomically on `main` when user asks to make/merge them. For database changes, use Supabase tools, maintain owner scope and RLS, and verify results.
4. Bump script query versions in `index.html` and the service worker cache/asset list in `sw.js` together. Include new assets in offline precache. Never silently reset storage.
5. Validate syntax and key logic (especially sync reconciliation, deletion, navigation and completion). Check GitHub Actions deployment; do not claim live deployment until success. Avoid claiming device-level testing without actually testing on iPhone.
6. Give concise summary, commit SHA, deployment status and what user should check. If an issue is unverified, say so.
7. Avoid implementing unrelated features without request; preserve existing visual style.

## Remaining opportunities (not yet guaranteed implemented)
- In-app full program editor (today program creation/versioning is mainly through ChatGPT/Supabase).
- Set-by-set weight/reps logging and rest timers, enabling true volume.
- More comprehensive offline exercise images and real-device testing.
- Multi-device conflict resolution, robust end-to-end backup/restore tests.
- Progression recommendations and workout intelligence.

## User's workout preferences (general, not a medical record)
Intermediate, primarily 5 gym days per week, muscle gain/hypertrophy focus; include mobility, core, hips on leg day, and endurance thoughtfully. Adapt programming to comfort and avoid assuming painful movements are safe. Discuss program modifications before writing new program versions.
