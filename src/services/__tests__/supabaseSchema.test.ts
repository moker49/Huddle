import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

declare function test(name: string, run: () => Promise<void> | void): void;

test("cloud network synchronization names its empty-result member fields", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const candidateMembers = schema.match(/candidate_members as \(([\s\S]*?)\n  \)\n  insert/i)?.[1] ?? "";

  assert.match(candidateMembers, /as member_id/i);
  assert.match(candidateMembers, /as member_tag/i);
  assert.match(candidateMembers, /as member_phone_number/i);
});

test("cloud huddle updates qualify id columns against return-field names", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const updateHuddle = schema.match(/create or replace function public\.update_huddle\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(updateHuddle, /from public\.huddles as huddle\s+where huddle\.id = p_huddle_id;/i);
  assert.match(updateHuddle, /update public\.huddles as huddle\s+set[\s\S]*?where huddle\.id = p_huddle_id;/i);
  assert.doesNotMatch(updateHuddle, /\bwhere id = p_huddle_id;/i);
});

test("cloud huddles persist an optional Material icon", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const createHuddle = schema.match(/create or replace function public\.create_huddle\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const updateHuddle = schema.match(/create or replace function public\.update_huddle\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const visibleHuddles = schema.match(/create function public\.list_visible_huddles\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /add column if not exists icon text/i);
  assert.match(schema, /drop function if exists public\.create_huddle\(text, timestamptz, jsonb\);/i);
  assert.match(schema, /drop function if exists public\.update_huddle\(uuid, text, timestamptz, jsonb\);/i);
  assert.match(createHuddle, /p_icon text/i);
  assert.match(createHuddle, /owner_id, title, icon, auto_archive_at/i);
  assert.match(updateHuddle, /p_icon text/i);
  assert.match(updateHuddle, /set title = trim\(p_title\), icon = nullif\(trim\(p_icon\), ''\)/i);
  assert.match(visibleHuddles, /h\.icon/i);
});

test("cloud messages are member-scoped and activities are created with huddle changes", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");

  assert.match(schema, /create table if not exists public\.huddle_messages/i);
  assert.match(schema, /on public\.huddle_messages for select[\s\S]*?using \(public\.can_access_huddle\(huddle_id\)\)/i);
  assert.match(schema, /create or replace function public\.create_huddle_message/i);
  assert.match(schema, /if not public\.can_access_huddle\(p_huddle_id\) then/i);
  assert.match(
    schema,
    /values \(new_huddle\.id, 'Huddle created', 'system', 'huddle_created', auth\.uid\(\), 'System'\)/i
  );
  assert.match(schema, /'member_added'/i);
  assert.match(schema, /'member_left'/i);
  assert.match(schema, /'member_rejoined'/i);
  assert.match(schema, /'member_removed'/i);
  assert.match(schema, /'title_updated'/i);
  assert.match(schema, /'icon_updated'/i);
  assert.match(schema, /'auto_archive_updated'/i);
  assert.match(schema, /existing_huddle\.icon is distinct from nullif\(trim\(p_icon\), ''\)/i);
});

test("cloud messages support author-only edits and tombstone deletes", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const updateMessage = schema.match(/create or replace function public\.update_huddle_message\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const deleteMessage = schema.match(/create or replace function public\.delete_huddle_message\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const messageList = schema.match(/create or replace function public\.list_huddle_messages\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /add column if not exists edited_at timestamptz/i);
  assert.match(schema, /add column if not exists deleted_at timestamptz/i);
  assert.match(updateMessage, /existing_message\.author_id is distinct from auth\.uid\(\)/i);
  assert.match(updateMessage, /date_trunc\('minute', message\.created_at\)/i);
  assert.match(deleteMessage, /body = '\[deleted\]', edited_at = null, deleted_at = now\(\)/i);
  assert.match(messageList, /message\.edited_at/i);
  assert.match(messageList, /message\.deleted_at/i);
  assert.match(schema, /grant execute on function public\.update_huddle_message\(uuid, text\) to authenticated/i);
  assert.match(schema, /grant execute on function public\.delete_huddle_message\(uuid\) to authenticated/i);
});

test("cloud messages persist replies within the same huddle", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const createMessage = schema.match(/create or replace function public\.create_huddle_message\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const messageList = schema.match(/create or replace function public\.list_huddle_messages\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /add column if not exists reply_to_message_id uuid references public\.huddle_messages/i);
  assert.match(createMessage, /p_reply_to_message_id uuid default null/i);
  assert.match(createMessage, /reply_target\.huddle_id <> p_huddle_id/i);
  assert.match(createMessage, /reply_to_message_id/i);
  assert.match(messageList, /reply_to_message_id uuid/i);
  assert.match(messageList, /message\.reply_to_message_id/i);
  assert.match(schema, /grant execute on function public\.create_huddle_message\(uuid, text, uuid\) to authenticated/i);
});

test("cloud huddles retain one shared pinned message and record pin activities", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const pinMessage = schema.match(/create or replace function public\.set_huddle_pinned_message\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const visibleHuddles = schema.match(/create function public\.list_visible_huddles\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /add column if not exists pinned_message_id uuid references public\.huddle_messages/i);
  assert.match(visibleHuddles, /pinned_message_id uuid/i);
  assert.match(visibleHuddles, /h\.pinned_message_id/i);
  assert.match(pinMessage, /message\.huddle_id = p_huddle_id/i);
  assert.match(pinMessage, /set pinned_message_id = p_message_id/i);
  assert.match(pinMessage, /author_id,[\s\S]*?author_name/i);
  assert.match(pinMessage, /auth\.uid\(\),[\s\S]*?'System'/i);
  assert.match(pinMessage, /'Message pinned'/i);
  assert.match(pinMessage, /'Message unpinned'/i);
  assert.match(schema, /'message_pinned'/i);
  assert.match(schema, /'message_unpinned'/i);
  assert.match(schema, /grant execute on function public\.set_huddle_pinned_message\(uuid, uuid\) to authenticated/i);
});

test("cloud huddle pins are private and returned with visible huddles", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const visibleHuddles = schema.match(/create function public\.list_visible_huddles\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const setHuddlePin = schema.match(/create or replace function public\.set_huddle_pin\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /create table if not exists public\.huddle_pins/i);
  assert.match(schema, /primary key \(profile_id, huddle_id\)/i);
  assert.match(visibleHuddles, /is_pinned boolean/i);
  assert.match(visibleHuddles, /from public\.huddle_pins pin/i);
  assert.match(visibleHuddles, /pin\.profile_id = auth\.uid\(\)/i);
  assert.match(setHuddlePin, /if not public\.can_access_huddle\(p_huddle_id\) then/i);
  assert.match(setHuddlePin, /insert into public\.huddle_pins/i);
  assert.match(setHuddlePin, /delete from public\.huddle_pins/i);
  assert.match(schema, /grant execute on function public\.set_huddle_pin\(uuid, boolean\) to authenticated/i);
});

test("cloud huddle membership retains leaves without retaining access", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const accessCheck = schema.match(/create or replace function public\.can_access_huddle\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const leaveHuddle = schema.match(/create or replace function public\.leave_huddle\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const rejoinHuddle = schema.match(/create or replace function public\.rejoin_huddle\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
  const updateHuddle = schema.match(/create or replace function public\.update_huddle\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /status text not null default 'active'/i);
  assert.match(schema, /left_at timestamptz/i);
  assert.match(accessCheck, /hm\.status = 'active'/i);
  assert.match(updateHuddle, /set status = 'left', left_at = now\(\)/i);
  assert.match(updateHuddle, /set status = 'active', left_at = null/i);
  assert.match(leaveHuddle, /set status = 'left', left_at = now\(\)/i);
  assert.match(leaveHuddle, /format\(\s*'Member left: %s'/i);
  assert.match(leaveHuddle, /'member_left'/i);
  assert.match(schema, /grant execute on function public\.leave_huddle\(uuid\) to authenticated/i);
  assert.match(schema, /create function public\.list_abandoned_huddles\(\)/i);
  assert.match(schema, /grant execute on function public\.list_abandoned_huddles\(\) to authenticated/i);
  assert.match(rejoinHuddle, /set status = 'active', left_at = null/i);
  assert.match(rejoinHuddle, /sync_current_user_huddle_network\(\)/i);
  assert.match(rejoinHuddle, /'member_rejoined'/i);
  assert.match(schema, /grant execute on function public\.rejoin_huddle\(uuid\) to authenticated/i);
});

test("cloud huddle tables are published for realtime updates", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");

  assert.match(schema, /alter publication supabase_realtime add table public\.huddles/i);
  assert.match(schema, /alter publication supabase_realtime add table public\.huddle_members/i);
  assert.match(schema, /alter publication supabase_realtime add table public\.huddle_messages/i);
  assert.match(schema, /alter table public\.huddle_messages replica identity full/i);
});

test("cloud huddle lists derive private unread counts from read state", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const visibleHuddles = schema.match(/create function public\.list_visible_huddles\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /create table if not exists public\.huddle_read_states/i);
  assert.match(schema, /drop function if exists public\.list_visible_huddles\(\);/i);
  assert.match(schema, /create or replace function public\.mark_huddle_read/i);
  assert.match(schema, /grant execute on function public\.mark_huddle_read\(uuid\) to authenticated/i);
  assert.match(visibleHuddles, /unread_count integer/i);
  assert.match(visibleHuddles, /from public\.huddle_messages message/i);
  assert.match(visibleHuddles, /left join public\.huddle_read_states read_state/i);
  assert.match(visibleHuddles, /message\.author_id is distinct from auth\.uid\(\)/i);
});

test("cloud message lists expose the private unread boundary before marking a huddle read", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const messageList = schema.match(/create or replace function public\.list_huddle_messages\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(messageList, /is_unread boolean/i);
  assert.match(messageList, /message\.created_at > coalesce\(read_state\.last_read_at/i);
  assert.match(messageList, /message\.author_id is distinct from auth\.uid\(\)/i);
  assert.match(
    schema,
    /grant execute on function public\.list_huddle_messages\(uuid, timestamptz, uuid, integer\) to authenticated/i
  );
  assert.match(messageList, /p_before_created_at timestamptz default null/i);
  assert.match(messageList, /p_before_id uuid default null/i);
  assert.match(messageList, /p_limit integer default 100/i);
});

test("cloud profiles and message rows expose Google avatar URLs", () => {
  const schema = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  const messageList = schema.match(/create or replace function public\.list_huddle_messages\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /avatar_url text not null default ''/i);
  assert.match(schema, /add column if not exists avatar_url text not null default ''/i);
  assert.match(schema, /drop function if exists public\.list_huddle_messages\(uuid\);/i);
  assert.match(messageList, /author_avatar_url text/i);
  assert.match(messageList, /author_profile\.avatar_url/i);
});
