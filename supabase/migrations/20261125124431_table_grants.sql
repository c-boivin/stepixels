-- Table privileges for signed-in users.
-- Postgres checks two things, in order: the role's privileges on the table
-- (GRANT), then which rows it may touch (Row Level Security). New Supabase
-- projects no longer grant table privileges to `anon` and `authenticated` by
-- default, so without these grants every request is refused before RLS runs.
-- Each grant matches the RLS policies of the initial schema, nothing more.

-- profiles: read your own row, and change only your reset time (the screen
-- "Changer l'heure" sets next_reset_time, the phone copies it into reset_time
-- at the next reset). The first name and created_at cannot be changed. The
-- handle_new_user trigger creates the row, and delete_account removes it.
grant select on public.profiles to authenticated;
-- A table-wide update grant would allow every column: remove it first (in case
-- it was given before), then grant update on the two columns only.
revoke update on public.profiles from authenticated;
grant update (reset_time, next_reset_time) on public.profiles to authenticated;

-- validations: read and add your own rows. A validation never changes.
grant select, insert on public.validations to authenticated;

-- Guests (`anon`) get no table privilege: they only call community_total().
