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
