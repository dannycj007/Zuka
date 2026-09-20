"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  GUEST_FIELDS,
  GUEST_FIELD_LABELS,
  REQUIRED_GUEST_FIELDS,
  guessColumnMapping,
  processImportRows,
  type ColumnMapping,
  type ProcessedGuestRow,
} from "@/lib/csv-import";
import { importGuests } from "../actions";

type Step = "upload" | "map" | "preview" | "done";

const STATUS_STYLES: Record<ProcessedGuestRow["status"], string> = {
  accepted: "bg-green-100 text-green-800",
  fixed: "bg-amber-100 text-amber-800",
  duplicate: "bg-zinc-200 text-zinc-700",
  rejected: "bg-red-100 text-red-800",
};

export function ImportFlow({
  eventId,
  existingPhones,
}: {
  eventId: string;
  existingPhones: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [processed, setProcessed] = useState<ProcessedGuestRow[]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [committing, startCommit] = useTransition();

  function handleFile(file: File) {
    setParseError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        if (fields.length === 0) {
          setParseError("Couldn't find a header row in that file.");
          return;
        }
        setHeaders(fields);
        setRows(results.data);
        setMapping(guessColumnMapping(fields));
        setStep("map");
      },
      error: (error) => {
        setParseError(error.message);
      },
    });
  }

  function confirmMapping() {
    const processedRows = processImportRows(rows, mapping, new Set(existingPhones));
    setProcessed(processedRows);
    setStep("preview");
  }

  function commit() {
    const guests = processed
      .filter((row) => row.status === "accepted" || row.status === "fixed")
      .map((row) => row.guest!)
      .filter(Boolean);

    startCommit(async () => {
      const outcome = await importGuests(eventId, guests);
      setResult(outcome);
      setStep("done");
    });
  }

  const missingRequired = REQUIRED_GUEST_FIELDS.filter((field) => !mapping[field]);
  const counts = {
    accepted: processed.filter((r) => r.status === "accepted").length,
    fixed: processed.filter((r) => r.status === "fixed").length,
    duplicate: processed.filter((r) => r.status === "duplicate").length,
    rejected: processed.filter((r) => r.status === "rejected").length,
  };
  const importableCount = counts.accepted + counts.fixed;

  if (step === "upload") {
    return (
      <div>
        <p className="text-sm text-zinc-600">
          Upload a CSV of guests. You&apos;ll map its columns next and see
          exactly what will be imported before anything is saved.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="mt-4 block text-sm"
        />
        {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}
      </div>
    );
  }

  if (step === "map") {
    return (
      <div>
        <h2 className="text-lg font-medium">Map your columns</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {rows.length} row{rows.length === 1 ? "" : "s"} detected. Full name
          and phone number are required — everything else is optional.
        </p>

        <div className="mt-4 space-y-3">
          {GUEST_FIELDS.map((field) => (
            <div key={field} className="flex items-center gap-3">
              <label className="w-40 shrink-0 text-sm font-medium">
                {GUEST_FIELD_LABELS[field]}
                {REQUIRED_GUEST_FIELDS.includes(field) && (
                  <span className="text-red-600"> *</span>
                )}
              </label>
              <select
                value={mapping[field] ?? ""}
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    [field]: e.target.value || undefined,
                  }))
                }
                className="block w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              >
                <option value="">Not mapped</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  {headers.map((header) => (
                    <th key={header} className="px-2 py-1.5 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    {headers.map((header) => (
                      <td key={header} className="px-2 py-1.5 text-zinc-600">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {missingRequired.length > 0 && (
          <p className="mt-3 text-sm text-red-600">
            Map {missingRequired.map((f) => GUEST_FIELD_LABELS[f]).join(" and ")}{" "}
            to continue.
          </p>
        )}

        <button
          type="button"
          onClick={confirmMapping}
          disabled={missingRequired.length > 0}
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Preview import
        </button>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div>
        <h2 className="text-lg font-medium">Preview</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">
            {counts.accepted} accepted
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
            {counts.fixed} fixed
          </span>
          <span className="rounded-full bg-zinc-200 px-3 py-1 font-medium text-zinc-700">
            {counts.duplicate} duplicate
          </span>
          <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
            {counts.rejected} rejected
          </span>
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="sticky top-0 bg-zinc-50">
              <tr className="border-b border-zinc-200">
                <th className="px-2 py-1.5 font-medium">Row</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium">Name</th>
                <th className="px-2 py-1.5 font-medium">Phone</th>
                <th className="px-2 py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {processed.map((row) => (
                <tr key={row.rowNumber} className="border-b border-zinc-100 align-top">
                  <td className="px-2 py-1.5 text-zinc-500">{row.rowNumber}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">{row.guest?.full_name ?? "—"}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {row.guest?.phone_e164 ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-600">
                    {row.reasons.join("; ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={commit}
            disabled={importableCount === 0 || committing}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {committing ? "Importing…" : `Import ${importableCount} guest${importableCount === 1 ? "" : "s"}`}
          </button>
          <button
            type="button"
            onClick={() => setStep("map")}
            className="text-sm font-medium text-zinc-600 underline"
          >
            Back to mapping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium">Done</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Imported {result?.imported ?? 0} guest{result?.imported === 1 ? "" : "s"}.
        {result && result.skipped > 0 && (
          <> {result.skipped} row{result.skipped === 1 ? " was" : "s were"} skipped as duplicates that appeared since the preview.</>
        )}
      </p>
      <button
        type="button"
        onClick={() => router.push(`/dashboard/events/${eventId}/guests`)}
        className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Back to guest list
      </button>
    </div>
  );
}
