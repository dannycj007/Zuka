import { test } from "node:test";
import assert from "node:assert/strict";
import { guessColumnMapping, processImportRows, type ColumnMapping } from "./csv-import.ts";

test("guesses a column mapping from common header spellings", () => {
  const mapping = guessColumnMapping([
    "Guest Name",
    "Mobile Number",
    "E-mail",
    "Table",
    "Seats",
    "Unrelated Column",
  ]);
  assert.equal(mapping.full_name, "Guest Name");
  assert.equal(mapping.phone_e164, "Mobile Number");
  assert.equal(mapping.email, "E-mail");
  assert.equal(mapping.table_label, "Table");
  assert.equal(mapping.seats_allotted, "Seats");
  assert.equal(mapping.category, undefined);
});

const mapping: ColumnMapping = {
  full_name: "Name",
  phone_e164: "Phone",
  email: "Email",
  category: "Category",
  table_label: "Table",
  seats_allotted: "Seats",
};

test("accepts a clean row unchanged", () => {
  const [result] = processImportRows(
    [{ Name: "Amina Juma", Phone: "+255712345678", Email: "amina@example.com", Category: "VIP", Table: "1", Seats: "2" }],
    mapping,
    new Set(),
  );
  assert.equal(result.status, "accepted");
  assert.deepEqual(result.reasons, []);
  assert.equal(result.guest?.phone_e164, "+255712345678");
  assert.equal(result.guest?.seats_allotted, 2);
});

test("fixes a row with a messy local-format phone number", () => {
  const [result] = processImportRows(
    [{ Name: "Baraka Mushi", Phone: "0712 345 679", Email: "", Category: "", Table: "", Seats: "" }],
    mapping,
    new Set(),
  );
  assert.equal(result.status, "fixed");
  assert.equal(result.guest?.phone_e164, "+255712345679");
  assert.match(result.reasons.join(), /normalized/);
});

test("rejects a row with no name", () => {
  const [result] = processImportRows(
    [{ Name: "", Phone: "+255712345678", Email: "", Category: "", Table: "", Seats: "" }],
    mapping,
    new Set(),
  );
  assert.equal(result.status, "rejected");
  assert.match(result.reasons.join(), /Missing full name/);
});

test("rejects a row with an invalid phone number, with a specific reason", () => {
  const [result] = processImportRows(
    [{ Name: "Chausiku Mwakalinga", Phone: "12345", Email: "", Category: "", Table: "", Seats: "" }],
    mapping,
    new Set(),
  );
  assert.equal(result.status, "rejected");
  assert.ok(result.reasons[0].length > 0);
});

test("flags the second occurrence of a phone number within the file as a duplicate", () => {
  const results = processImportRows(
    [
      { Name: "Daudi Kessy", Phone: "+255712345678", Email: "", Category: "", Table: "", Seats: "" },
      { Name: "Daudi K. (typo row)", Phone: "0712345678", Email: "", Category: "", Table: "", Seats: "" },
    ],
    mapping,
    new Set(),
  );
  assert.equal(results[0].status, "accepted");
  assert.equal(results[1].status, "duplicate");
});

test("flags a phone number that already exists in the event as a duplicate", () => {
  const [result] = processImportRows(
    [{ Name: "Esther Mollel", Phone: "+255712345678", Email: "", Category: "", Table: "", Seats: "" }],
    mapping,
    new Set(["+255712345678"]),
  );
  assert.equal(result.status, "duplicate");
  assert.match(result.reasons.join(), /Already in this event/);
});

test("drops an invalid email but still accepts the row", () => {
  const [result] = processImportRows(
    [{ Name: "Fatuma Ali", Phone: "+255712345678", Email: "not-an-email", Category: "", Table: "", Seats: "" }],
    mapping,
    new Set(),
  );
  assert.equal(result.status, "fixed");
  assert.equal(result.guest?.email, undefined);
  assert.match(result.reasons.join(), /doesn't look valid/);
});

test("drops an invalid seat count with a note rather than rejecting the row (DB default of 1 applies)", () => {
  const [result] = processImportRows(
    [{ Name: "Godfrey Lyimo", Phone: "+255712345678", Email: "", Category: "", Table: "", Seats: "many" }],
    mapping,
    new Set(),
  );
  assert.equal(result.status, "fixed");
  assert.equal(result.guest?.seats_allotted, undefined);
  assert.match(result.reasons.join(), /isn't a positive whole number/);
});

test("handles a full messy real-world batch end to end", () => {
  const results = processImportRows(
    [
      { Name: "Halima Said", Phone: "+255786155433", Email: "halima@example.com", Category: "family", Table: "2", Seats: "1" },
      { Name: "", Phone: "+255715163352", Email: "", Category: "", Table: "", Seats: "" },
      { Name: "Ibrahim Nyerere", Phone: "not a number", Email: "", Category: "", Table: "", Seats: "" },
      { Name: "Joyce Kimaro", Phone: "0658 171 271", Email: "joyce@@bad", Category: "family", Table: "2", Seats: "0" },
      { Name: "Joyce K. duplicate", Phone: "255658171271", Email: "", Category: "", Table: "", Seats: "" },
    ],
    mapping,
    new Set(),
  );

  assert.equal(results.length, 5);
  assert.equal(results[0].status, "accepted");
  assert.equal(results[1].status, "rejected");
  assert.equal(results[2].status, "rejected");
  assert.equal(results[3].status, "fixed");
  assert.equal(results[4].status, "duplicate");
});
