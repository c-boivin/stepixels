-- Table privileges for signed-in users.
-- Postgres checks two things, in order: the role's privileges on the table
-- (GRANT), then which rows it may touch (Row Level Security). New Supabase
-- projects no longer grant table privileges to `anon` and `authenticated` by
-- default, so without these grants every request is refused before RLS runs.
-- Each grant matches the RLS policies of the initial schema, nothing more.

-- profiles: read and update your own row. The handle_new_user trigger creates
-- it, and delete_account removes it.
grant select, update on public.profiles to authenticated;

-- validations: read and add your own rows. A validation never changes.
grant select, insert on public.validations to authenticated;

-- Guests (`anon`) get no table privilege: they only call community_total().
