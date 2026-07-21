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
  assert.match(schema, /'member_removed'/i);
  assert.match(schema, /'title_updated'/i);
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
  const visibleHuddles = schema.match(/create or replace function public\.list_visible_huddles\([\s\S]*?\n\$\$;/i)?.[0] ?? "";

  assert.match(schema, /create table if not exists public\.huddle_read_states/i);
  assert.match(schema, /create or replace function public\.mark_huddle_read/i);
  assert.match(schema, /grant execute on function public\.mark_huddle_read\(uuid\) to authenticated/i);
  assert.match(visibleHuddles, /unread_count integer/i);
  assert.match(visibleHuddles, /from public\.huddle_messages message/i);
  assert.match(visibleHuddles, /left join public\.huddle_read_states read_state/i);
  assert.match(visibleHuddles, /message\.author_id is distinct from auth\.uid\(\)/i);
});
