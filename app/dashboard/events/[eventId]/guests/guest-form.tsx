"use client";

import { useActionState } from "react";
import type { GuestFormState } from "./actions";
import type { Database } from "@/lib/types/database";

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
    <form action={formAction} className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="salutation" className="block text-sm font-medium">
            Salutation
          </label>
          <input
            id="salutation"
            name="salutation"
            type="text"
            placeholder="Mr, Mrs, Dkt…"
            defaultValue={guest?.salutation ?? ""}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            defaultValue={guest?.full_name ?? ""}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone_e164" className="block text-sm font-medium">
          Phone number
        </label>
        <input
          id="phone_e164"
          name="phone_e164"
          type="text"
          required
          placeholder="0712 345 678"
          defaultValue={guest?.phone_e164 ?? ""}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Any format is fine — it gets normalized to +255 automatically.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email (optional)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={guest?.email ?? ""}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium">
            Category
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="VIP, family…"
            defaultValue={guest?.category ?? ""}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="table_label" className="block text-sm font-medium">
            Table
          </label>
          <input
            id="table_label"
            name="table_label"
            type="text"
            defaultValue={guest?.table_label ?? ""}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="seats_allotted" className="block text-sm font-medium">
            Seats
          </label>
          <input
            id="seats_allotted"
            name="seats_allotted"
            type="number"
            min={1}
            defaultValue={guest?.seats_allotted ?? 1}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="dietary" className="block text-sm font-medium">
          Dietary notes (optional)
        </label>
        <input
          id="dietary"
          name="dietary"
          type="text"
          defaultValue={guest?.dietary ?? ""}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={guest?.notes ?? ""}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-base font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : guest ? "Save changes" : "Add guest"}
      </button>
    </form>
  );
}
