# Phase 4: Cloud programs and ChatGPT program creation

## Current architecture

The iPhone GitHub Pages PWA uses the existing private device key and calls the Supabase `workout-backup` Edge Function. The device key is never checked into this repository. The Edge Function uses its server-side secret key and associates the device with a single Supabase `user_id`.

Read/write client operations are scoped by this owner. The public Data API is not granted access to the program tables. The existing offline localStorage key `workout_tracker_phase1_v1` remains unchanged.

## Relational schema

- `workout_programs` — PK (`user_id`,`id`), name, description, archived.
- `workout_program_versions` — PK (`user_id`,`program_id`,`version`); each revision is immutable after creation.
- `workout_program_days` — FK to program version, unique `day_index` per version.
- `workout_program_exercises` — FK to day, unique `exercise_index` per day; name, sets, reps, alternative, optional rest_seconds.
- `workout_sessions` — historical JSON payload retained unchanged; relational nullable `program_id` and `program_version` with composite owner-scoped foreign key to a version.
- `workout_app_state` — selected_program_id, next_days JSON, active_workout JSON, updated_at.

Original program IDs `four` and `five` were migrated as version 1. Completed legacy sessions are associated with version 1 when their `programId` matches; unknown program IDs stay in JSON rather than being falsely linked.

## How ChatGPT should add a new program

Use the connected Supabase project `yipexqnkvwlvprhzstfr`. Do not ask the user to expose their device key. Compose the plan with the user and get approval before inserting it.

1. Resolve the owner from `workout_device_access` (one user in this personal app). For a future multi-user project use an explicit authorized user ID instead; never take one from arbitrary client input.
2. Choose a unique stable program ID, e.g. `upper-lower-2027`, and insert a `workout_programs` row for that owner. Never reuse `four` or `five` for a new plan.
3. Insert version 1 into `workout_program_versions`, with source `chatgpt`.
4. Insert ordered days into `workout_program_days` with `day_index` starting at zero.
5. Insert prescribed exercises into `workout_program_exercises` using each day UUID, with `exercise_index` starting at zero. A day must include at least one exercise.
6. Verify the resulting row counts and ordering; do not update `workout_app_state` unless the user explicitly asks to make the program active.
7. On the iPhone, reopening the app or returning to it while connected fetches the new program and caches it. Old offline cache remains available when disconnected.

For modifications to an existing plan, insert a **new** integer version and its days/exercises, leaving the old version unchanged. The app loads the highest version; workouts started before updating keep the version number in their active-workout snapshot. Never delete old versions: workout sessions can refer to them.

## Compatibility and safety

- Existing local sessions, current workout and program selection are not cleared during upgrade.
- The GET endpoint returns `sessions`, `programs`, and `appState`.
- POST continues to accept `{sessions:[]}` from older PWA clients. New clients can also post `{appState:{selectedProgramId,next,active}}` and `{archive:{id,archived}}`.
- The app initially prioritizes previously used local data over the default empty cloud selection, and restores cloud state on a new empty device.
- Concurrent edits from multiple devices use last-write-wins for selected program and active workout; use one device at a time while an active workout is in progress.
- Archiving a program hides it from the ordinary library but retains all versions and recorded sessions. The currently selected program cannot be archived from the app.
- Exercise imagery is a bundled name-to-image lookup, so newly created exercises without known images display the fallback.
- Device-key security is bearer-token based: keep the key private. Authentication is verified server-side, not by the repository.
