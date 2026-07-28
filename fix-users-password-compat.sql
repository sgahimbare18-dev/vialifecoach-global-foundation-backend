-- Compatibility fix for Supabase users schema-cache errors.
-- Use this if something in Supabase still expects public.users.password.
-- It keeps password_hash as the primary storage column and mirrors it into
-- password for legacy code, triggers, or policies that still reference it.

begin;

-- Keep the modern column in place.
alter table public.users
  add column if not exists password_hash text;

-- Add the legacy compatibility column if it is missing.
alter table public.users
  add column if not exists password text;

-- Backfill existing rows so both columns stay aligned.
update public.users
set password_hash = coalesce(password_hash, password)
where password_hash is null
  and password is not null;

update public.users
set password = coalesce(password, password_hash)
where password is null
  and password_hash is not null;

-- Keep both columns synchronized on insert/update.
create or replace function public.sync_users_password_columns()
returns trigger
language plpgsql
as $$
begin
  if new.password_hash is null and new.password is not null then
    new.password_hash := new.password;
  end if;

  if new.password is null and new.password_hash is not null then
    new.password := new.password_hash;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_users_password_columns on public.users;

create trigger trg_sync_users_password_columns
before insert or update on public.users
for each row
execute function public.sync_users_password_columns();

commit;

-- Refresh the schema cache after structural changes.
notify pgrst, 'reload schema';

