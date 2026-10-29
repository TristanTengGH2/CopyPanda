-- CopyPanda network API. Run once as the database owner in Supabase SQL Editor.
-- All storage and privileged functions live outside the exposed public schema.
begin;
create schema if not exists cp_private;
revoke all on schema cp_private from public, anon, authenticated;

create table if not exists cp_private.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"notes":"","bookmark":null,"challenge":null}',
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists cp_private.records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  active_ms bigint not null,
  manual boolean not null default false,
  earned integer not null default 0,
  body jsonb not null,
  primary key(user_id,id)
);
create index if not exists cp_history on cp_private.records(user_id,ended_at desc,id);
create table if not exists cp_private.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check(mode in ('online','inperson')),
  code_hash bytea not null,
  token_hash bytea not null,
  invitation_expires timestamptz not null,
  expires_at timestamptz not null,
  closed_at timestamptz
);
create table if not exists cp_private.members (
  room_id uuid not null references cp_private.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_id uuid not null default gen_random_uuid(),
  alias text not null,
  status text not null default 'idle' check(status in ('idle','focus','paused','break','away')),
  remaining_ms bigint not null default 0,
  seen_at timestamptz not null default now(),
  left_at timestamptz,
  sync_id uuid,
  primary key(room_id,user_id)
);
create unique index if not exists cp_one_room on cp_private.members(user_id) where left_at is null;
alter table cp_private.members add column if not exists device_id text not null default '';
create table if not exists cp_private.intervals (
  id bigint generated always as identity primary key,
  room_id uuid not null references cp_private.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  open boolean not null default true
);
create index if not exists cp_overlap on cp_private.intervals(room_id,user_id,start_at,end_at);
create unique index if not exists cp_one_interval on cp_private.intervals(user_id) where open;
create table if not exists cp_private.shared_timers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references cp_private.rooms(id) on delete cascade,
  proposer uuid not null,
  minutes integer not null check(minutes between 1 and 120),
  starts_at timestamptz not null,
  pause_id uuid,
  pause_expires timestamptz,
  pause_applied timestamptz,
  pause_votes uuid[] not null default '{}'
);
create table if not exists cp_private.limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_at timestamptz not null default now(),
  count integer not null default 1,
  primary key(user_id,action)
);
alter table cp_private.profiles enable row level security;
alter table cp_private.records enable row level security;
alter table cp_private.rooms enable row level security;
alter table cp_private.members enable row level security;
alter table cp_private.intervals enable row level security;
alter table cp_private.shared_timers enable row level security;
alter table cp_private.limits enable row level security;
revoke all on all tables in schema cp_private from public,anon,authenticated;

create or replace function cp_private.fail(code text,message text) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('ok',false,'code',code,'message',message)
$$;

create or replace function cp_private.allowed(actor uuid,operation text,maximum integer,seconds integer) returns boolean
language plpgsql set search_path='' as $$
declare hits integer;
begin
 insert into cp_private.limits(user_id,action) values(actor,operation)
 on conflict(user_id,action) do update set
 count=case when cp_private.limits.window_at<clock_timestamp()-make_interval(secs=>seconds) then 1 else cp_private.limits.count+1 end,
 window_at=case when cp_private.limits.window_at<clock_timestamp()-make_interval(secs=>seconds) then clock_timestamp() else cp_private.limits.window_at end
 returning count into hits;
 return hits<=maximum;
end $$;

create or replace function cp_private.room_view(room uuid,actor uuid) returns jsonb
language plpgsql set search_path='' as $$
declare r cp_private.rooms; s cp_private.shared_timers; members jsonb;
begin
 select * into r from cp_private.rooms where id=room and closed_at is null and expires_at>clock_timestamp();
 if not found or not exists(select 1 from cp_private.members where room_id=room and user_id=actor and left_at is null) then
   return cp_private.fail('room_closed','This room is closed or you are no longer a member.');
 end if;
 select jsonb_agg(jsonb_build_object('id',m.public_id,'self',m.user_id=actor,'name',m.alias,
 'status',case when m.seen_at<clock_timestamp()-interval '30 seconds' then 'away' else m.status end,
 'remainingMs',m.remaining_ms,'joinedSync',m.sync_id,'host',m.user_id=r.host_id) order by m.public_id)
 into members from cp_private.members m where m.room_id=room and m.left_at is null;
 select * into s from cp_private.shared_timers where room_id=room order by starts_at desc limit 1;
 return jsonb_build_object('ok',true,'serverNow',clock_timestamp(),'roomId',r.id,'mode',r.mode,'host',r.host_id=actor,
 'expiresAt',r.expires_at,'invitationExpiresAt',r.invitation_expires,'members',coalesce(members,'[]'::jsonb),
 'sync',case when s.id is null then null else jsonb_build_object('id',s.id,'minutes',s.minutes,'startsAt',s.starts_at,
 'pauseId',s.pause_id,'pauseExpiresAt',s.pause_expires,'pauseAppliedAt',s.pause_applied,
 'pauseVotes',(select coalesce(jsonb_agg(m.public_id),'[]'::jsonb) from cp_private.members m where m.room_id=room and m.user_id=any(s.pause_votes))) end);
end $$;

create or replace function cp_private.dispatch(operation text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); t timestamptz:=clock_timestamp(); p jsonb:=coalesce(payload,'{}');
 r cp_private.rooms; m cp_private.members; st cp_private.shared_timers; profile cp_private.profiles;
 record jsonb; existing jsonb; record_id text; ending timestamptz; starting timestamptz;
 active bigint; planned bigint; manual boolean; demo boolean; complete boolean;
 base integer; bonus integer; social integer:=0; physical integer:=0; earned integer;
 overlap_ms bigint:=0; physical_ms bigint:=0; balance bigint; new_data jsonb;
 rid uuid; code text; token text; invitation jsonb; alias_name text; status_name text;
 expected bigint; timer_id uuid; minute_count integer; result jsonb; prior cp_private.intervals;
begin
 if actor is null then return cp_private.fail('unauthorized','Please sign in or continue as a guest.'); end if;
 -- Serialize per-user accounting, revisions, and rate limits across devices.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if octet_length(p::text)>262144 then return cp_private.fail('too_large','This update is too large.'); end if;
 if not cp_private.allowed(actor,operation,case when operation='room.join' then 6 when operation='room.create' then 3 else 180 end,
 case when operation='room.create' then 3600 else 60 end) then
   return cp_private.fail('rate_limited','Too many requests. Please wait before trying again.');
 end if;
 insert into cp_private.profiles(user_id) values(actor) on conflict do nothing;
 -- Input failures are caught inside this block, preserving the rate-limit write.
 begin
 if operation in ('bootstrap','history.list') then
   select * into profile from cp_private.profiles where user_id=actor;
   select coalesce(sum(x.earned),0) into balance from cp_private.records x where x.user_id=actor;
   select coalesce(jsonb_agg(q.body order by q.ended_at desc,q.id desc),'[]'::jsonb) into result from
   (select x.body,x.ended_at,x.id from cp_private.records x where x.user_id=actor
    and (not(p?'cursor') or (x.ended_at,x.id)<((p->'cursor'->>'endedAt')::timestamptz,p->'cursor'->>'id'))
    order by x.ended_at desc,x.id desc limit 250) q;
   select room_id into rid from cp_private.members where user_id=actor and left_at is null;
   return jsonb_build_object('ok',true,'userId',actor,'balance',balance,'data',profile.data,'revision',profile.revision,
   'records',result,'serverNow',t,'roomId',rid,'hasMore',jsonb_array_length(result)=250);
 elsif operation='state.put' then
   expected:=(p->>'revision')::bigint;
   select * into profile from cp_private.profiles where user_id=actor for update;
   if expected is null or expected<>profile.revision then
     return jsonb_build_object('ok',false,'code','conflict','message','Your notes or goals changed on another device.','data',profile.data,'revision',profile.revision);
   end if;
   new_data:=jsonb_build_object('notes',left(coalesce(p->'data'->>'notes',''),16000),'bookmark',p->'data'->'bookmark','challenge',p->'data'->'challenge');
   if octet_length(new_data::text)>32000 then return cp_private.fail('too_large','Notes or bookmark is too long.'); end if;
   update cp_private.profiles set data=new_data,revision=revision+1,updated_at=t where user_id=actor returning * into profile;
   return jsonb_build_object('ok',true,'revision',profile.revision,'data',profile.data);
 elsif operation='record.import' then
   record:=p->'record'; record_id:=record->>'id';
   if record_id is null or record_id!~'^[A-Za-z0-9_:-]{1,128}$' then return cp_private.fail('invalid_record','A stable study record ID is required.'); end if;
   select body into existing from cp_private.records where user_id=actor and id=record_id;
   if found then
     return jsonb_build_object('ok',true,'duplicate',true,'record',existing,'balance',(select coalesce(sum(x.earned),0) from cp_private.records x where x.user_id=actor));
   end if;
   active:=(record->>'activeMs')::bigint; planned:=(record->>'plannedMs')::bigint;
   ending:=(record->>'endedAt')::timestamptz; manual:=coalesce((record->>'manual')::boolean,false); demo:=coalesce((record->>'demo')::boolean,false);
   complete:=coalesce((record->>'completed')::boolean,false) and active>=planned;
   starting:=coalesce((record->>'startedAt')::timestamptz,ending-make_interval(secs=>active/1000.0));
   if active is null or planned is null or ending is null or starting is null or active<0 or active>43200000
     or ending>t+interval '5 minutes' or ending<t-interval '5 years' or starting>ending
     or active>extract(epoch from (ending-starting))*1000+2000
     or (not manual and (planned<10000 or planned>7200000 or active>planned)) then
       return cp_private.fail('invalid_record','The study duration or dates are invalid.');
   end if;
   base:=case when manual or demo then 0 else floor(active/60000.0)::integer end;
   bonus:=case when complete and not manual and not demo then ceil(base*0.1)::integer else 0 end;
   if base>0 and exists(select 1 from cp_private.records x where x.user_id=actor and not x.manual
      and x.earned>0 and tstzrange(x.started_at,x.ended_at,'[)')&&tstzrange(starting,ending,'[)')) then
     base:=0; bonus:=0;
   end if;
   if base>0 then
     -- Union overlapping peers so a larger group never multiplies the bonus.
     select coalesce(sum(extract(epoch from(upper(v)-lower(v)))*1000),0)::bigint into overlap_ms from
     (select unnest(range_agg(tstzrange(greatest(a.start_at,b.start_at,starting),least(a.end_at,b.end_at,ending),'[)'))) v
      from cp_private.intervals a join cp_private.intervals b on a.room_id=b.room_id and a.user_id<>b.user_id
      where a.user_id=actor and greatest(a.start_at,b.start_at,starting)<least(a.end_at,b.end_at,ending)) q;
     select coalesce(sum(extract(epoch from(upper(v)-lower(v)))*1000),0)::bigint into physical_ms from
     (select unnest(range_agg(tstzrange(greatest(a.start_at,b.start_at,starting),least(a.end_at,b.end_at,ending),'[)'))) v
      from cp_private.intervals a join cp_private.intervals b on a.room_id=b.room_id and a.user_id<>b.user_id
      join cp_private.rooms rr on rr.id=a.room_id and rr.mode='inperson'
      where a.user_id=actor and greatest(a.start_at,b.start_at,starting)<least(a.end_at,b.end_at,ending)) q;
     social:=floor(floor(least(active,overlap_ms)/60000.0)*0.10)::integer;
     physical:=floor(floor(least(active,physical_ms)/60000.0)*0.05)::integer;
   end if;
   earned:=base+bonus+social+physical;
   record:=jsonb_build_object('id',record_id,'day',coalesce(record->>'day',to_char(ending,'YYYY-MM-DD')),
   'startedAt',starting,'endedAt',ending,'activeMs',active,'plannedMs',planned,'completed',complete and not demo,
   'manual',manual,'demo',demo,'intention',left(coalesce(record->>'intention',''),180),'earned',earned,
   'kind',case when physical>0 then 'inperson' when social>0 then 'online' else 'solo' end,
   'reward',jsonb_build_object('base',base,'completion',bonus,'online',social,'inperson',physical),
   'selfReported',true,'cloudSynced',true);
   insert into cp_private.records(user_id,id,started_at,ended_at,active_ms,manual,earned,body)
   values(actor,record_id,starting,ending,active,manual,earned,record);
   return jsonb_build_object('ok',true,'record',record,'balance',(select coalesce(sum(x.earned),0) from cp_private.records x where x.user_id=actor));
 elsif operation in ('room.create','room.join') then
   select * into m from cp_private.members where user_id=actor and left_at is null;
   if found then
     select * into r from cp_private.rooms where id=m.room_id;
     if r.closed_at is null and r.expires_at>t then return cp_private.fail('already_joined','Leave your current room before joining another.'); end if;
     update cp_private.members set left_at=t where user_id=actor and left_at is null;
   end if;
   alias_name:=left(trim(coalesce(p->>'name','Study panda')),24);
   if alias_name='' then alias_name:='Study panda'; end if;
   if operation='room.create' then
     if coalesce(p->>'mode','online') not in ('online','inperson') then return cp_private.fail('invalid_mode','Choose online or in-person study.'); end if;
     token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); code:='';
     for minute_count in 0..7 loop code:=code||substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ',get_byte(uuid_send(gen_random_uuid()),0)%32+1,1); end loop;
     insert into cp_private.rooms(host_id,mode,code_hash,token_hash,invitation_expires,expires_at)
     values(actor,coalesce(p->>'mode','online'),sha256(convert_to(code,'UTF8')),sha256(convert_to(token,'UTF8')),t+interval '10 minutes',t+interval '6 hours') returning * into r;
     invitation:=jsonb_build_object('code',code,'token',token,'expiresAt',r.invitation_expires);
   else
     code:=upper(regexp_replace(coalesce(p->>'code',''),'[^A-Za-z0-9]','','g')); token:=lower(coalesce(p->>'token',''));
     select * into r from cp_private.rooms where closed_at is null and expires_at>t and invitation_expires>t
       and ((length(code)=8 and code_hash=sha256(convert_to(code,'UTF8'))) or (length(token)=64 and token_hash=sha256(convert_to(token,'UTF8')))) for update;
     if not found then return cp_private.fail('invalid_invite','This invitation is invalid or expired. Ask the host for a new one.'); end if;
     if (select count(*) from cp_private.members where room_id=r.id and left_at is null)>=8 then return cp_private.fail('room_full','This room has reached its eight-person limit.'); end if;
   end if;
   insert into cp_private.members(room_id,user_id,alias,seen_at) values(r.id,actor,alias_name,t)
   on conflict(room_id,user_id) do update set alias=excluded.alias,seen_at=t,left_at=null,status='idle',sync_id=null;
   return cp_private.room_view(r.id,actor)||jsonb_build_object('invitation',invitation);
 elsif operation like 'room.%' or operation like 'sync.%' then
   rid:=(p->>'roomId')::uuid;
   select * into r from cp_private.rooms where id=rid for update;
   select * into m from cp_private.members where room_id=rid and user_id=actor and left_at is null;
   if r.id is null or m.user_id is null or r.closed_at is not null or r.expires_at<=t then
     return cp_private.fail('room_closed','This room is closed or you are no longer a member.');
   end if;
   if operation='room.leave' then
     update cp_private.intervals set open=false where user_id=actor and open;
     update cp_private.members set left_at=t,status='away',sync_id=null where room_id=rid and user_id=actor;
     if r.host_id=actor then
       update cp_private.rooms set closed_at=t where id=rid;
       update cp_private.members set left_at=t,status='away',sync_id=null where room_id=rid;
       update cp_private.intervals set open=false where room_id=rid;
     end if;
     return jsonb_build_object('ok',true);
   elsif operation='room.rotate' then
     if r.host_id<>actor then return cp_private.fail('forbidden','Only the host can renew an invitation.'); end if;
     token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); code:='';
     for minute_count in 0..7 loop code:=code||substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ',get_byte(uuid_send(gen_random_uuid()),0)%32+1,1); end loop;
     update cp_private.rooms set code_hash=sha256(convert_to(code,'UTF8')),token_hash=sha256(convert_to(token,'UTF8')),invitation_expires=least(expires_at,t+interval '10 minutes') where id=rid returning * into r;
     return cp_private.room_view(rid,actor)||jsonb_build_object('invitation',jsonb_build_object('code',code,'token',token,'expiresAt',r.invitation_expires));
   elsif operation='room.heartbeat' then
     status_name:=coalesce(p->>'status','idle');
     if status_name not in ('idle','focus','paused','break','away') then return cp_private.fail('invalid_status','Unknown study status.'); end if;
     if m.device_id<>'' and m.device_id<>coalesce(p->>'deviceId','') and m.status='focus' and m.seen_at>t-interval '30 seconds' then
       return cp_private.room_view(rid,actor)||jsonb_build_object('presenceReadOnly',true);
     end if;
     select * into prior from cp_private.intervals where user_id=actor and open for update;
     if status_name='focus' then
       if prior.id is not null and m.seen_at>=t-interval '30 seconds' then
         update cp_private.intervals set end_at=t where id=prior.id;
       else
         update cp_private.intervals set open=false where user_id=actor and open;
         insert into cp_private.intervals(room_id,user_id,start_at,end_at) values(rid,actor,t,t);
       end if;
     else
       if prior.id is not null and m.seen_at>=t-interval '30 seconds' then update cp_private.intervals set end_at=t,open=false where id=prior.id;
       else update cp_private.intervals set open=false where user_id=actor and open; end if;
     end if;
     update cp_private.members set status=status_name,remaining_ms=greatest(0,least(7200000,coalesce((p->>'remainingMs')::bigint,0))),seen_at=t,device_id=left(coalesce(p->>'deviceId',''),128) where room_id=rid and user_id=actor;
   elsif operation='sync.propose' then
     minute_count:=(p->>'minutes')::integer;
     if minute_count is null or minute_count not between 1 and 120 then return cp_private.fail('invalid_duration','Choose 1 to 120 minutes.'); end if;
     if exists(select 1 from cp_private.shared_timers where room_id=rid and starts_at+minutes*interval '1 minute'>t) then
       return cp_private.fail('sync_exists','A shared timer is already proposed. Use it or continue independently.');
     end if;
     insert into cp_private.shared_timers(room_id,proposer,minutes,starts_at) values(rid,actor,minute_count,t+interval '30 seconds');
   elsif operation='sync.accept' then
     timer_id:=(p->>'syncId')::uuid;
     select * into st from cp_private.shared_timers where id=timer_id and room_id=rid;
     if not found or st.starts_at<=t then return cp_private.fail('sync_started','This shared start has passed. You can still study independently.'); end if;
     if m.status='focus' then return cp_private.fail('timer_active','Finish your current timer before joining a shared start.'); end if;
     update cp_private.members set sync_id=timer_id,seen_at=t where room_id=rid and user_id=actor;
   elsif operation='sync.leave' then
     update cp_private.members set sync_id=null where room_id=rid and user_id=actor;
   elsif operation in ('sync.pause_request','sync.pause_vote') then
     select * into st from cp_private.shared_timers where id=m.sync_id and room_id=rid for update;
     if not found then return cp_private.fail('not_synced','Join the shared timer first.'); end if;
     if operation='sync.pause_request' then
       if st.pause_expires>t and st.pause_applied is null then return cp_private.fail('pause_pending','A group-pause request is already pending.'); end if;
       update cp_private.shared_timers set pause_id=gen_random_uuid(),pause_expires=t+interval '30 seconds',pause_applied=null,pause_votes=array[actor] where id=st.id returning * into st;
     else
       if st.pause_id is null or st.pause_id::text<>p->>'pauseId' or st.pause_expires<=t or st.pause_applied is not null then return cp_private.fail('pause_expired','This pause request is no longer active.'); end if;
       if not actor=any(st.pause_votes) then update cp_private.shared_timers set pause_votes=array_append(pause_votes,actor) where id=st.id returning * into st; end if;
     end if;
     if not exists(select 1 from cp_private.members mm where mm.room_id=rid and mm.sync_id=st.id and mm.left_at is null and mm.seen_at>t-interval '30 seconds' and not mm.user_id=any(st.pause_votes)) then
       update cp_private.shared_timers set pause_applied=t where id=st.id;
       update cp_private.intervals set end_at=least(t,end_at+interval '30 seconds'),open=false where room_id=rid and open
         and user_id in(select user_id from cp_private.members where room_id=rid and sync_id=st.id and left_at is null);
       update cp_private.members set status='paused' where room_id=rid and sync_id=st.id and left_at is null;
     end if;
   elsif operation<>'room.get' then return cp_private.fail('unknown_operation','Unknown room action.'); end if;
   return cp_private.room_view(rid,actor);
 end if;
 return cp_private.fail('unknown_operation','Unknown action.');
 exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
   return cp_private.fail('invalid_input','Please check the supplied dates, IDs, or numbers.');
 end;
end $$;

revoke all on all functions in schema cp_private from public,anon,authenticated;
grant usage on schema cp_private to authenticated;
grant execute on function cp_private.dispatch(text,jsonb) to authenticated;
create or replace function public.cp_api(operation text,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select cp_private.dispatch(operation,payload) $$;
revoke all on function public.cp_api(text,jsonb) from public,anon;
grant execute on function public.cp_api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
