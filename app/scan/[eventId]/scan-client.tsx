"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInGuest, type ScanOutcome } from "./actions";
import type { CheckInResult } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const SCANNER_ELEMENT_ID = "zuka-qr-reader";

const RESULT_COPY: Record<CheckInResult, { label: string; variant: BadgeVariant }> = {
  valid: { label: "Checked in", variant: "success" },
  duplicate: { label: "Already checked in", variant: "warning" },
  wrong_event: { label: "Wrong event", variant: "danger" },
  invalid: { label: "Not recognized", variant: "danger" },
};

type ScanState =
  | { status: "starting" }
  | { status: "scanning" }
  | { status: "checking" }
  | { status: "result"; outcome: ScanOutcome }
  | { status: "camera-unavailable" };

export function ScanClient({ eventId }: { eventId: string }) {
  const [gateLabel, setGateLabel] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [state, setState] = useState<ScanState>({ status: "starting" });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!cancelled) handleCode(decodedText);
        },
        () => {
          // Fires every frame with no code in view — expected noise, not an error.
        },
      )
      .then(() => {
        if (!cancelled) setState({ status: "scanning" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "camera-unavailable" });
      });

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      scannerRef.current = null;
      current
        ?.stop()
        .then(() => current.clear())
        .catch(() => {
          // Scanner never started or was already stopped — nothing to clean up.
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCode(raw: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    scannerRef.current?.pause(true);
    runCheckIn(raw);
  }

  function runCheckIn(raw: string) {
    setState({ status: "checking" });
    startTransition(async () => {
      const outcome = await checkInGuest(eventId, raw, gateLabel);
      setState({ status: "result", outcome });
    });
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!manualToken.trim() || processingRef.current) return;
    processingRef.current = true;
    runCheckIn(manualToken);
  }

  function scanNext() {
    processingRef.current = false;
    setManualToken("");
    setState({ status: "scanning" });
    scannerRef.current?.resume();
  }

  const showingCamera = state.status === "starting" || state.status === "scanning";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="gate" className="field-label">
          Gate (optional)
        </label>
        <input
          id="gate"
          value={gateLabel}
          onChange={(e) => setGateLabel(e.target.value)}
          placeholder="e.g. Main Entrance"
          className="field-input"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div
          id={SCANNER_ELEMENT_ID}
          className={showingCamera ? "w-full" : "hidden"}
        />
        {state.status === "camera-unavailable" && (
          <div className="p-6 text-center text-sm text-muted">
            Couldn&apos;t access the camera — check browser permissions, or
            enter a code manually below.
          </div>
        )}
        {state.status === "checking" && (
          <div className="p-6 text-center text-sm text-muted">Checking…</div>
        )}
        {state.status === "result" && (
          <ScanResultCard outcome={state.outcome} onScanNext={scanNext} />
        )}
      </Card>

      {state.status !== "result" && (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Or paste/type the invite link or code"
            className="field-input flex-1"
            disabled={pending}
          />
          <Button type="submit" variant="secondary" disabled={pending || !manualToken.trim()}>
            Check in
          </Button>
        </form>
      )}
    </div>
  );
}

function ScanResultCard({
  outcome,
  onScanNext,
}: {
  outcome: ScanOutcome;
  onScanNext: () => void;
}) {
  if (!outcome.ok) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <Badge variant="danger">Error</Badge>
        <p className="text-sm text-muted">{outcome.message}</p>
        <Button onClick={onScanNext} className="w-full">
          Try again
        </Button>
      </div>
    );
  }

  const copy = RESULT_COPY[outcome.result];

  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <Badge variant={copy.variant}>{copy.label}</Badge>
      {outcome.fullName ? (
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            {outcome.salutation ? `${outcome.salutation} ` : ""}
            {outcome.fullName}
          </p>
          <p className="mt-1 text-sm text-muted">
            {[outcome.category, outcome.tableLabel].filter(Boolean).join(" · ") || "—"}
            {outcome.seatsAllotted && outcome.seatsAllotted > 1
              ? ` · ${outcome.seatsAllotted} seats`
              : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          This code doesn&apos;t match any guest on this event.
        </p>
      )}
      <Button onClick={onScanNext} className="w-full">
        Scan next
      </Button>
    </div>
  );
}
