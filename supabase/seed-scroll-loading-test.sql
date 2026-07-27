-- Scroll-loading smoke test
--
-- 1. In Supabase SQL Editor, find the target account:
--    select id, display_name, tag, phone_number from public.profiles order by created_at desc;
-- 2. Replace v_profile_id below with that profile UUID.
-- 3. Run this entire file. Re-running it replaces only this account's previous test huddle.

do $$
declare
  v_profile_id uuid := null; -- Replace with the profile UUID from the query above.
  v_huddle_id uuid;
  v_middle_message_id uuid;
  v_author_name text;
  v_title constant text := 'Scroll loading test (safe to delete)';
begin
  if v_profile_id is null then
    raise exception 'Set v_profile_id before running the scroll-loading seed.';
  end if;

  select coalesce(
    nullif(profile.display_name, ''),
    nullif(profile.tag, ''),
    nullif(profile.phone_number, ''),
    'Test user'
  )
  into v_author_name
  from public.profiles profile
  where profile.id = v_profile_id;

  if v_author_name is null then
    raise exception 'The selected profile does not exist.';
  end if;

  -- The huddle relationship owns its messages, members, pin, and read state, so this is a complete reset.
  delete from public.huddles huddle
  where huddle.owner_id = v_profile_id
    and huddle.title = v_title;

  insert into public.huddles (owner_id, title, icon, created_at)
  values (v_profile_id, v_title, 'message-text', now() - interval '1000 minutes')
  returning id into v_huddle_id;

  insert into public.huddle_members (huddle_id, member_id)
  values (v_huddle_id, v_profile_id);

  -- Messages 1-999 span the previous 999 minutes, oldest to newest.
  insert into public.huddle_messages (
    huddle_id,
    body,
    kind,
    author_id,
    author_name,
    created_at
  )
  select
    v_huddle_id,
    format('Message %s of 1000', message_number),
    'user',
    v_profile_id,
    v_author_name,
    now() - ((1000 - message_number) * interval '1 minute')
  from generate_series(1, 999) as message_number;

  select message.id
  into v_middle_message_id
  from public.huddle_messages message
  where message.huddle_id = v_huddle_id
    and message.body = 'Message 500 of 1000';

  -- The 1,000th and newest message replies to the message pinned in the middle of the history.
  insert into public.huddle_messages (
    huddle_id,
    body,
    kind,
    author_id,
    author_name,
    created_at,
    reply_to_message_id
  )
  values (
    v_huddle_id,
    'Newest message: this replies to the pinned middle message.',
    'user',
    v_profile_id,
    v_author_name,
    now(),
    v_middle_message_id
  );

  update public.huddles huddle
  set pinned_message_id = v_middle_message_id,
      updated_at = now()
  where huddle.id = v_huddle_id;

  -- Keep the initial view at the newest messages rather than the unread boundary.
  insert into public.huddle_read_states (profile_id, huddle_id, last_read_at)
  values (v_profile_id, v_huddle_id, now())
  on conflict (profile_id, huddle_id) do update
  set last_read_at = excluded.last_read_at;
end;
$$;

select
  huddle.id,
  huddle.title,
  huddle.pinned_message_id,
  count(message.id) as message_count
from public.huddles huddle
left join public.huddle_messages message on message.huddle_id = huddle.id
where huddle.title = 'Scroll loading test (safe to delete)'
group by huddle.id, huddle.title, huddle.pinned_message_id;

-- Cleanup, when finished:
-- delete from public.huddles
-- where title = 'Scroll loading test (safe to delete)';
