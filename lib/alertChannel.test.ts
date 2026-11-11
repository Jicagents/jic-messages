// Run: node --test lib/*.test.ts   (Node 22.6+ strips the types)
import assert from "node:assert/strict";
import test from "node:test";
import { channelMedia, DEFAULT_ALERT_PREFS, VIBRATION } from "../app/lib/alertChannel.ts";

test("alarm channels follow the sound and vibrate toggles", () => {
  assert.deepEqual(channelMedia(DEFAULT_ALERT_PREFS), { soundFile: "chime.wav", pattern: VIBRATION.long });
  assert.equal(channelMedia({ ...DEFAULT_ALERT_PREFS, sound: { enabled: false, id: "bell" } }).soundFile, null);
  assert.equal(channelMedia({ ...DEFAULT_ALERT_PREFS, vibrate: { enabled: false, pattern: "pulse" } }).pattern, null);
  assert.deepEqual(channelMedia({ ...DEFAULT_ALERT_PREFS, sound: { enabled: true, id: "bell" }, vibrate: { enabled: true, pattern: "pulse" } }), {
    soundFile: "bell.wav",
    pattern: VIBRATION.pulse,
  });
});
