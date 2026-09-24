"use client";

import { useActionState } from "react";
import type { GuestFormState } from "./actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";

const initialState: GuestFormState = {};

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
        <div>
          <label htmlFor="salutation" className="field-label">
            Salutation
          </label>
          <input
            id="salutation"
            name="salutation"
            type="text"
            placeholder="Mr, Mrs, Dkt…"
            defaultValue={guest?.salutation ?? ""}
            className="field-input"
          />
        </div>
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
        <div>
          <label htmlFor="category" className="field-label">
            Category
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="VIP, family…"
            defaultValue={guest?.category ?? ""}
            className="field-input"
          />
        </div>
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
