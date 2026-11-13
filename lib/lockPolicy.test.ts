import assert from "node:assert/strict";
import test from "node:test";
import { coerceLockMinutes, DEFAULT_LOCK_MINUTES, shouldLock } from "./lockPolicy.ts";

test("never backgrounded means no lock", () => assert.equal(shouldLock(null, 1_000_000, 2), false));
test("short absence stays unlocked", () => assert.equal(shouldLock(0, 119_000, 2), false));
test("absence at the limit locks", () => assert.equal(shouldLock(0, 120_000, 2), true));
test("right away locks immediately", () => assert.equal(shouldLock(5, 5, 0), true));
test("unknown saved values fall back to the default", () => {
  assert.equal(coerceLockMinutes(99), DEFAULT_LOCK_MINUTES);
  assert.equal(coerceLockMinutes("5"), DEFAULT_LOCK_MINUTES);
  assert.equal(coerceLockMinutes(5), 5);
});
