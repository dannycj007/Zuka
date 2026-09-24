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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

type Step = "upload" | "map" | "preview" | "done";

const STATUS_VARIANT: Record<ProcessedGuestRow["status"], BadgeVariant> = {
  accepted: "success",
  fixed: "warning",
  duplicate: "default",
  rejected: "danger",
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
      <Card className="p-6">
        <p className="text-sm text-muted">
          Upload a CSV of guests. You&apos;ll map its columns next and see
          exactly what will be imported before anything is saved.
        </p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-raised px-6 py-10 text-center transition-colors hover:border-brand-orange-light">
          <span className="text-sm font-medium text-foreground">
            Choose a CSV file
          </span>
          <span className="text-xs text-muted">or drag and drop it here</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="sr-only"
          />
        </label>
        {parseError && <p className="mt-2 field-error">{parseError}</p>}
      </Card>
    );
  }

  if (step === "map") {
    return (
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold">Map your columns</h2>
        <p className="mt-1 text-sm text-muted">
          {rows.length} row{rows.length === 1 ? "" : "s"} detected. Full name
          and phone number are required — everything else is optional.
        </p>

        <div className="mt-4 space-y-3">
          {GUEST_FIELDS.map((field) => (
            <div key={field} className="flex items-center gap-3">
              <label className="w-40 shrink-0 text-sm font-medium text-muted-strong">
                {GUEST_FIELD_LABELS[field]}
                {REQUIRED_GUEST_FIELDS.includes(field) && (
                  <span className="text-danger"> *</span>
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
                className="field-select max-w-xs text-sm"
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
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  {headers.map((header) => (
                    <th key={header} className="px-2 py-1.5 font-medium text-muted-strong">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    {headers.map((header) => (
                      <td key={header} className="px-2 py-1.5 text-muted-strong">
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
          <p className="mt-3 field-error">
            Map {missingRequired.map((f) => GUEST_FIELD_LABELS[f]).join(" and ")}{" "}
            to continue.
          </p>
        )}

        <Button
          type="button"
          onClick={confirmMapping}
          disabled={missingRequired.length > 0}
          className="mt-4"
        >
          Preview import
        </Button>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold">Preview</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="success">{counts.accepted} accepted</Badge>
          <Badge variant="warning">{counts.fixed} fixed</Badge>
          <Badge variant="default">{counts.duplicate} duplicate</Badge>
          <Badge variant="danger">{counts.rejected} rejected</Badge>
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="sticky top-0 bg-surface-raised">
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 font-medium text-muted-strong">Row</th>
                <th className="px-2 py-1.5 font-medium text-muted-strong">Status</th>
                <th className="px-2 py-1.5 font-medium text-muted-strong">Name</th>
                <th className="px-2 py-1.5 font-medium text-muted-strong">Phone</th>
                <th className="px-2 py-1.5 font-medium text-muted-strong">Notes</th>
              </tr>
            </thead>
            <tbody>
              {processed.map((row) => (
                <tr key={row.rowNumber} className="border-b border-border align-top">
                  <td className="px-2 py-1.5 text-muted">{row.rowNumber}</td>
                  <td className="px-2 py-1.5">
                    <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                  </td>
                  <td className="px-2 py-1.5 text-foreground">{row.guest?.full_name ?? "—"}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-muted-strong">
                    {row.guest?.phone_e164 ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-muted">
                    {row.reasons.join("; ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <Button type="button" onClick={commit} disabled={importableCount === 0 || committing}>
            {committing ? "Importing…" : `Import ${importableCount} guest${importableCount === 1 ? "" : "s"}`}
          </Button>
          <button
            type="button"
            onClick={() => setStep("map")}
            className="text-sm font-medium text-muted-strong hover:text-foreground hover:underline"
          >
            Back to mapping
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Done</h2>
      <p className="mt-2 text-sm text-muted">
        Imported {result?.imported ?? 0} guest{result?.imported === 1 ? "" : "s"}.
        {result && result.skipped > 0 && (
          <> {result.skipped} row{result.skipped === 1 ? " was" : "s were"} skipped as duplicates that appeared since the preview.</>
        )}
      </p>
      <Button
        type="button"
        onClick={() => router.push(`/dashboard/events/${eventId}/guests`)}
        className="mt-4"
      >
        Back to guest list
      </Button>
    </Card>
  );
}
