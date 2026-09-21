-- No travel code or elevated key belongs in this file or in the public website.
create schema if not exists istanbul_private;
revoke all on schema istanbul_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;

create table if not exists istanbul_private.room (
  id integer primary key check(id=1), code_hash text,
  state jsonb not null, seen_ops jsonb not null default '[]',
  login_window timestamptz not null default now(), login_attempts integer not null default 0
);
create table if not exists istanbul_private.sessions (
  token_hash text primary key, expires_at timestamptz not null
);
alter table istanbul_private.room enable row level security;
alter table istanbul_private.sessions enable row level security;
revoke all on all tables in schema istanbul_private from public, anon, authenticated;
insert into istanbul_private.room(id,state) values(1,
  '{"revision":0,"planRevision":0,"favorites":["ep32","ep11","ep0","ep56","ep2","ep92","ep45","ep5","ep1"],"activePlan":null,"history":[],"updatedAt":null}'
) on conflict(id) do nothing;

create or replace function istanbul_private.valid_session(token text)
returns boolean language sql security definer set search_path='' as $$
  select length(token)=64 and exists(select 1 from istanbul_private.sessions
    where token_hash=encode(extensions.digest(token,'sha256'),'hex') and expires_at>now());
$$;
create or replace function istanbul_private.valid_place(place text)
returns boolean language sql immutable set search_path='' as $$
  select (place ~ '^ep([0-9]|[1-8][0-9]|9[0-4])$' and place not in ('ep4','ep12','ep25'))
    or place in ('grandbazaar','galatawalk','karakoy','kadikoy','moda','gulhane','sehzade');
$$;
revoke all on all functions in schema istanbul_private from public, anon, authenticated;

create or replace function public.istanbul_login(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r istanbul_private.room; session_token text;
begin
  select * into r from istanbul_private.room where id=1 for update;
  if r.code_hash is null then return jsonb_build_object('ok',false,'error','not-configured'); end if;
  if r.login_window<now()-interval '1 minute' then
    r.login_attempts=0; r.login_window=now();
  end if;
  if r.login_attempts>=20 then return jsonb_build_object('ok',false,'error','rate-limit'); end if;
  update istanbul_private.room set login_attempts=r.login_attempts+1,login_window=r.login_window where id=1;
  if p_code is null or length(p_code)>128 or extensions.crypt(p_code,r.code_hash)<>r.code_hash then
    return jsonb_build_object('ok',false,'error','auth');
  end if;
  session_token=encode(extensions.gen_random_bytes(32),'hex');
  delete from istanbul_private.sessions where expires_at<now();
  insert into istanbul_private.sessions values(encode(extensions.digest(session_token,'sha256'),'hex'),now()+interval '30 days');
  return jsonb_build_object('ok',true,'token',session_token,'state',r.state);
end;
$$;

create or replace function public.istanbul_state(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not coalesce(istanbul_private.valid_session(p_token),false) then return jsonb_build_object('ok',false,'error','auth'); end if;
  return jsonb_build_object('ok',true,'state',(select state from istanbul_private.room where id=1));
end;
$$;

create or replace function public.istanbul_change(p_token text,p_operation jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r istanbul_private.room; s jsonb; op text; opid text; place text; favs jsonb; history jsonb; previous jsonb;
begin
  if not coalesce(istanbul_private.valid_session(p_token),false) then return jsonb_build_object('ok',false,'error','auth'); end if;
  if jsonb_typeof(p_operation) is distinct from 'object' or octet_length(p_operation::text)>4096 then return jsonb_build_object('ok',false,'error','invalid-operation'); end if;
  op=p_operation->>'kind'; opid=p_operation->>'operationId';
  if opid is null or opid !~ '^[a-f0-9-]{36}$' then return jsonb_build_object('ok',false,'error','invalid-operation'); end if;
  select * into r from istanbul_private.room where id=1 for update;
  s=r.state;
  if r.seen_ops ? opid then return jsonb_build_object('ok',true,'state',s); end if;
  if op='favorite' then
    place=p_operation->>'id';
    if not coalesce(istanbul_private.valid_place(place),false) or jsonb_typeof(p_operation->'value') is distinct from 'boolean' then return jsonb_build_object('ok',false,'error','invalid-operation'); end if;
    select coalesce(jsonb_agg(value),'[]') into favs from jsonb_array_elements(s->'favorites') where value<>to_jsonb(place);
    if (p_operation->>'value')::boolean then favs=favs||jsonb_build_array(place); end if;
    s=jsonb_set(s,'{favorites}',favs);
  elsif op='apply' then
    if p_operation->'expectedRevision' is distinct from s->'revision' then return jsonb_build_object('ok',false,'error','conflict'); end if;
    history=(s->'history')||jsonb_build_array(s->'activePlan');
    if jsonb_array_length(history)>10 then history=history-0; end if;
    s=jsonb_set(s,'{history}',history);
    s=jsonb_set(s,'{activePlan}',jsonb_build_object('favorites',s->'favorites','version',1));
    s=jsonb_set(s,'{planRevision}',to_jsonb((s->>'planRevision')::integer+1));
  elsif op='undo' then
    if p_operation->'expectedPlanRevision' is distinct from s->'planRevision' then return jsonb_build_object('ok',false,'error','conflict'); end if;
    history=s->'history';
    if jsonb_array_length(history)=0 then return jsonb_build_object('ok',false,'error','no-history'); end if;
    previous=history->(jsonb_array_length(history)-1);
    s=jsonb_set(s,'{activePlan}',previous);
    s=jsonb_set(s,'{history}',history-(jsonb_array_length(history)-1));
    s=jsonb_set(s,'{planRevision}',to_jsonb((s->>'planRevision')::integer+1));
  else return jsonb_build_object('ok',false,'error','invalid-operation');
  end if;
  s=jsonb_set(s,'{revision}',to_jsonb((s->>'revision')::integer+1));
  s=jsonb_set(s,'{updatedAt}',to_jsonb(now()));
  r.seen_ops=r.seen_ops||jsonb_build_array(opid);
  if jsonb_array_length(r.seen_ops)>128 then r.seen_ops=r.seen_ops-0; end if;
  update istanbul_private.room set state=s,seen_ops=r.seen_ops where id=1;
  return jsonb_build_object('ok',true,'state',s);
end;
$$;

revoke execute on function public.istanbul_login(text) from public, anon, authenticated;
revoke execute on function public.istanbul_state(text) from public, anon, authenticated;
revoke execute on function public.istanbul_change(text,jsonb) from public, anon, authenticated;
grant execute on function public.istanbul_login(text) to anon, authenticated;
grant execute on function public.istanbul_state(text) to anon, authenticated;
grant execute on function public.istanbul_change(text,jsonb) to anon, authenticated;
