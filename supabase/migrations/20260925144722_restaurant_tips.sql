-- Extend the place allowlist only; sessions, grants and existing trip data are unchanged.
create or replace function istanbul_private.valid_place(place text)
returns boolean language sql immutable security invoker set search_path='' as $$
  select (place ~ '^ep([0-9]|[1-8][0-9]|9[0-4])$' and place not in ('ep4','ep12','ep25'))
    or place in ('grandbazaar','galatawalk','karakoy','kadikoy','moda','gulhane','sehzade',
                 'demeti','sevic','ciya','jash','iskelebalik');
$$;
revoke all on function istanbul_private.valid_place(text) from public, anon, authenticated;
