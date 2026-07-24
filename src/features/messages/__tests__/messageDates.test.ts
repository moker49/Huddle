import assert from "node:assert/strict";

import {
  formatMessageDay,
  formatMessageTimestamp,
  getMessageDayKey
} from "@/features/messages/messageDates";

declare function test(name: string, run: () => Promise<void> | void): void;

test("message dates use a local calendar-day key and readable divider label", () => {
  assert.equal(getMessageDayKey("2026-07-04T14:46:00"), "2026-6-4");
  assert.equal(formatMessageDay("2026-07-04T14:46:00", new Date("2026-07-21")), "July 4");
  assert.equal(formatMessageDay("2025-07-04T14:46:00", new Date("2026-07-21")), "July 4, 2025");
});

test("message timestamps include a date only outside today", () => {
  const now = new Date("2026-07-21T18:00:00");

  assert.equal(formatMessageTimestamp("2026-07-21T10:20:00", now), "10:20 AM");
  assert.equal(formatMessageTimestamp("2026-07-04T14:46:00", now), "07/04 2:46 PM");
  assert.equal(formatMessageTimestamp("2025-07-04T14:46:00", now), "07/04/2025 2:46 PM");
});
