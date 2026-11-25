-- Initial schema: accounts' profiles and validations (ADR-003, ADR-004).
-- The phone computes, the server saves: progress is never stored as a counter,
-- it is computed from the validations.

-- ---------------------------------------------------------------------------
-- profiles: one row per account
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Not empty, and not only spaces.
  first_name text not null check (btrim(first_name) <> ''),
  -- Daily reset of the step counter: 00:00 to 23:30, in 30-minute steps.
  reset_time time not null default '20:00'
    check (extract(minute from reset_time) in (0, 30) and extract(second from reset_time) = 0),
  -- A changed reset time applies from the next reset: the phone copies it
  -- into reset_time at that moment, then clears it.
  next_reset_time time
    check (extract(minute from next_reset_time) in (0, 30) and extract(second from next_reset_time) = 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- No insert policy: the profile is created by the handle_new_user trigger below.

create policy "profiles: update own row"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: a profile is deleted with its account (delete_account).

-- ---------------------------------------------------------------------------
-- handle_new_user: creates the profile when an account is created, from the
-- metadata the app passes to signUp (first_name, reset_time). It works even
-- before the e-mail is confirmed, when the app has no session yet.
-- Writing on behalf of a new user needs to bypass Row Level Security, hence
-- security definer. It only ever inserts the row of the new account.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A missing first_name makes the insert fail, and so the sign-up.
  insert into public.profiles (id, first_name, reset_time)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    coalesce((new.raw_user_meta_data ->> 'reset_time')::time, '20:00')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- validations: one row per image touched by a validation
-- ---------------------------------------------------------------------------

create table public.validations (
  -- Created on the phone: a resent validation has the same id and is ignored.
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Number of the image in the app's catalog (01, 02…).
  image_number integer not null,
  pixels integer not null check (pixels > 0),
  steps integer not null check (steps = pixels * 100),
  -- Phone time: a validation made offline is sent later but keeps its own time.
  validated_at timestamptz not null
);

create index validations_user_id_idx on public.validations (user_id);

alter table public.validations enable row level security;

create policy "validations: read own rows"
  on public.validations for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "validations: create own rows"
  on public.validations for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- No update or delete policy: a validation never changes. Rows are deleted
-- with their account (delete_account).

-- ---------------------------------------------------------------------------
-- delete_account: deletes the signed-in account and, by cascade, its rows.
-- Deleting from auth.users needs admin rights, hence security definer.
-- It must only ever touch auth.uid() (ADR-003).
-- ---------------------------------------------------------------------------

create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- ---------------------------------------------------------------------------
-- community_total: total steps revealed by everyone, shown in the onboarding.
-- Row Level Security hides other accounts' rows, hence security definer.
-- It returns one anonymous number, never personal data.
-- ---------------------------------------------------------------------------

create function public.community_total()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(steps), 0)::bigint from public.validations;
$$;

revoke execute on function public.community_total() from public;
-- The onboarding shows it before any account exists.
grant execute on function public.community_total() to anon, authenticated;
