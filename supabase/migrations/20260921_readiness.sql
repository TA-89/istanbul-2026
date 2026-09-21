-- A non-sensitive readiness probe for the trip period. No favourites or credentials returned.
create or replace function public.istanbul_health()
returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object('ok',exists(select 1 from istanbul_private.room where id=1 and code_hash is not null));
$$;
revoke execute on function public.istanbul_health() from public, anon, authenticated;
grant execute on function public.istanbul_health() to anon, authenticated;
