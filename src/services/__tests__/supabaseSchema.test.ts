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
