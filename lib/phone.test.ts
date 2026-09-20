import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTanzanianPhone } from "./phone.ts";

test("accepts an already-correct E.164 number unchanged", () => {
  const result = normalizeTanzanianPhone("+255712345678");
  assert.deepEqual(result, { ok: true, value: "+255712345678", wasChanged: false });
});

test("normalizes a leading-0 local format", () => {
  const result = normalizeTanzanianPhone("0712345678");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, "+255712345678");
  assert.equal(result.ok && result.wasChanged, true);
});

test("normalizes a bare 9-digit mobile number", () => {
  const result = normalizeTanzanianPhone("712345678");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, "+255712345678");
});

test("normalizes 255-without-plus", () => {
  const result = normalizeTanzanianPhone("255712345678");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, "+255712345678");
});

test("strips spaces and dashes", () => {
  const result = normalizeTanzanianPhone("+255 712 345 678");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, "+255712345678");
  assert.equal(result.ok && result.wasChanged, true);

  const result2 = normalizeTanzanianPhone("0712-345-678");
  assert.equal(result2.ok, true);
  assert.equal(result2.ok && result2.value, "+255712345678");
});

test("fixes a doubled country-code-plus-leading-zero mistake", () => {
  const result = normalizeTanzanianPhone("+2550712345678");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, "+255712345678");
});

test("accepts a 6xx mobile number", () => {
  const result = normalizeTanzanianPhone("0654321987");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, "+255654321987");
});

test("rejects a non-Tanzanian country code", () => {
  const result = normalizeTanzanianPhone("+254712345678");
  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.error : "", /Not a Tanzanian number/);
});

test("rejects a Dar es Salaam landline prefix", () => {
  const result = normalizeTanzanianPhone("0222412345");
  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.error : "", /Not a mobile number/);
});

test("rejects too few digits", () => {
  const result = normalizeTanzanianPhone("07123");
  assert.equal(result.ok, false);
});

test("rejects too many digits", () => {
  const result = normalizeTanzanianPhone("071234567890");
  assert.equal(result.ok, false);
});

test("rejects empty input", () => {
  const result = normalizeTanzanianPhone("   ");
  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.error : "", /missing/);
});

test("rejects non-numeric garbage", () => {
  const result = normalizeTanzanianPhone("N/A");
  assert.equal(result.ok, false);
});
