"use client";

import { useActionState, useState } from "react";
import type { GuestFormState } from "./actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";

const initialState: GuestFormState = {};

const SALUTATION_OPTIONS = ["Mr", "Mrs", "Miss", "Ms", "Dkt", "Prof", "Rev", "Mzee", "Bibi"];
const CATEGORY_OPTIONS = ["Family", "Friend", "VIP", "Colleague", "Bridal party", "Vendor", "Media"];

const OTHER = "__other__";

/**
 * Dropdown of common presets, with an "Other…" option that swaps in a
 * free-text input. Both salutation and category are plain nullable text
 * columns (no DB enum) — CSV imports and past edits can carry values
 * outside these presets, so the field falls back to custom mode already
 * showing that value rather than silently dropping it.
 */
function PresetOrCustomField({
  id,
  label,
  options,
  value,
  placeholder,
}: {
  id: string;
  label: string;
  options: string[];
  value: string | null | undefined;
  placeholder: string;
}) {
  const initial = value ?? "";
  const [mode, setMode] = useState<"preset" | "custom">(
    initial && !options.includes(initial) ? "custom" : "preset",
  );

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {mode === "preset" ? (
        <select
          id={id}
          name={id}
          defaultValue={initial}
          onChange={(e) => {
            if (e.target.value === OTHER) setMode("custom");
          }}
          className="field-select"
        >
          <option value="">None</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={OTHER}>Other…</option>
        </select>
      ) : (
        <div>
          <input
            id={id}
            name={id}
            type="text"
            autoFocus
            placeholder={placeholder}
            defaultValue={initial}
            className="field-input"
          />
          <button
            type="button"
            onClick={() => setMode("preset")}
            className="field-hint text-muted-strong hover:text-foreground hover:underline"
          >
            Choose from list
          </button>
        </div>
      )}
    </div>
  );
}

export function GuestForm({
  guest,
  action,
}: {
  guest?: Database["public"]["Tables"]["guests"]["Row"];
  action: (state: GuestFormState, formData: FormData) => Promise<GuestFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <PresetOrCustomField
          id="salutation"
          label="Salutation"
          options={SALUTATION_OPTIONS}
          value={guest?.salutation}
          placeholder="Type a salutation"
        />
        <div>
          <label htmlFor="full_name" className="field-label">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            defaultValue={guest?.full_name ?? ""}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone_e164" className="field-label">
          Phone number
        </label>
        <input
          id="phone_e164"
          name="phone_e164"
          type="text"
          required
          placeholder="0712 345 678"
          defaultValue={guest?.phone_e164 ?? ""}
          className="field-input"
        />
        <p className="field-hint">
          Any format is fine — it gets normalized to +255 automatically.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Email (optional)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={guest?.email ?? ""}
          className="field-input"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <PresetOrCustomField
          id="category"
          label="Category"
          options={CATEGORY_OPTIONS}
          value={guest?.category}
          placeholder="Type a category"
        />
        <div>
          <label htmlFor="table_label" className="field-label">
            Table
          </label>
          <input
            id="table_label"
            name="table_label"
            type="text"
            defaultValue={guest?.table_label ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="seats_allotted" className="field-label">
            Seats
          </label>
          <input
            id="seats_allotted"
            name="seats_allotted"
            type="number"
            min={1}
            defaultValue={guest?.seats_allotted ?? 1}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="dietary" className="field-label">
          Dietary notes (optional)
        </label>
        <input
          id="dietary"
          name="dietary"
          type="text"
          defaultValue={guest?.dietary ?? ""}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="notes" className="field-label">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={guest?.notes ?? ""}
          className="field-textarea"
        />
      </div>

      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : guest ? "Save changes" : "Add guest"}
      </Button>
    </form>
  );
}
