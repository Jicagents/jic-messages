import assert from "node:assert/strict";
import test from "node:test";
import { reminderPlan } from "./reminderPlan.ts";

test("reminder runs only when enabled and something is unread", () => {
  assert.equal(reminderPlan(0, 5), null);
  assert.equal(reminderPlan(3, 0), null);
  assert.deepEqual(reminderPlan(3, 5), { seconds: 300 });
  assert.deepEqual(reminderPlan(1, 2), { seconds: 120 });
});
