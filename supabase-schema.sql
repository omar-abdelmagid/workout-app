-- Run once in Supabase SQL Editor. Only authenticated owners can read/write their rows.
create table if not exists public.workout_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.workout_sessions enable row level security;
revoke all on public.workout_sessions from anon;
grant select, insert on public.workout_sessions to authenticated;
drop policy if exists "read own workouts" on public.workout_sessions;
create policy "read own workouts" on public.workout_sessions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own workouts" on public.workout_sessions;
create policy "insert own workouts" on public.workout_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
-- No update/delete permission is granted to the app.
