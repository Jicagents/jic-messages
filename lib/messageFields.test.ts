// Run: node --test lib/*.test.ts   (Node 22.6+ strips the types)
import assert from "node:assert/strict";
import test from "node:test";
import { additionalFields, initials, messageContent, reasonOnly, reasonPreview } from "./messageFields.ts";

const bobOldApi = {
  id: "a27472bf-585a-414e-bf30-fffab1b56195",
  caller_name: "Bob Dillon",
  caller_phone: "7205949248",
  from_number: "+17205949248",
  reason: "Calls not going through",
  form_name: "General message",
  message_text: "Calls not going through\nEmail: Bob.Dylan@gmail.com",
  fields: [{ label: "Email", value: "Bob.Dylan@gmail.com" }],
};

test("Bob Dylan, old API: Reason card has no email, email is the one extra field", () => {
  const c = messageContent(bobOldApi);
  assert.equal(c.reason, "Calls not going through");
  assert.deepEqual(c.additional, [{ label: "Email", value: "Bob.Dylan@gmail.com" }]);
  assert.equal(c.formName, "General message");
});

test("old list rows without reason still preview only the reason", () => {
  const { reason, ...noReason } = bobOldApi;
  assert.equal(reasonPreview(noReason), "Calls not going through");
});

test("new API additional_fields are re-checked, not trusted blindly", () => {
  const c = messageContent({ ...bobOldApi, additional_fields: [{ label: "Caller name", value: "Bob Dillon" }, { label: "Email", value: "Bob.Dylan@gmail.com" }] });
  assert.deepEqual(c.additional.map((f) => f.label), ["Email"]);
});

test("caller-id echo, name, phone, and Reason never show twice", () => {
  const frank = {
    caller_name: "Frank Sinatra",
    caller_phone: "7205949248",
    reason: "Calls aren't going through",
    message_text: "Calls aren't going through\nCaller ID: +17205949248",
    fields: [
      { label: "Caller name", value: "Frank Sinatra" },
      { label: "Phone number", value: "7205949248" },
      { label: "Reason", value: "Calls aren't going through" },
      { label: "Details", value: "Caller ID: +17205949248" },
    ],
  };
  const c = messageContent(frank);
  assert.equal(c.reason, "Calls aren't going through");
  assert.equal(c.additional.length, 0);
});

test("long forms keep order and labels", () => {
  const fields = [
    { label: "Parent name", value: "Ana Ruiz" },
    { label: "Patient name", value: "Leo Ruiz" },
    { label: "Date of birth", value: "2026-11-01" },
    { label: "Phone", value: "(303) 555-0101" },
    { label: "Reason", value: "Baby not eating well" },
    { label: "Birth weight", value: "7 lb 2 oz" },
    { label: "Pharmacy phone", value: "303-555-0199" },
  ];
  const input = { caller_name: "Ana Ruiz", caller_phone: "3035550101", fields, message_text: "Baby not eating well; Patient name: Leo Ruiz" };
  assert.equal(reasonOnly(input), "Baby not eating well");
  assert.deepEqual(additionalFields(input).map((f) => f.label), ["Patient name", "Date of birth", "Birth weight", "Pharmacy phone"]);
});

test("initials", () => {
  assert.equal(initials("Bob Dillon"), "BD");
  assert.equal(initials("Liz"), "L");
  assert.equal(initials("  mary  ann  smith "), "MS");
  assert.equal(initials(""), "?");
});
