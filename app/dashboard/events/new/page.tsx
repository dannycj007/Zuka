"use client";

import { useActionState } from "react";
import { createEvent, type EventFormState } from "../actions";

const initialState: EventFormState = {};

const EVENT_TYPES = [
  "wedding",
  "send-off",
  "corporate",
  "conference",
  "birthday",
  "other",
];

export default function NewEventPage() {
  const [state, formAction, pending] = useActionState(createEvent, initialState);

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Event name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Amina & Baraka's Wedding"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="event_type" className="block text-sm font-medium">
            Event type
          </label>
          <select
            id="event_type"
            name="event_type"
            required
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          >
            <option value="" disabled>
              Choose one
            </option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="starts_at" className="block text-sm font-medium">
            Date &amp; time (Africa/Dar es Salaam)
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="venue_name" className="block text-sm font-medium">
            Venue name
          </label>
          <input
            id="venue_name"
            name="venue_name"
            type="text"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="venue_address" className="block text-sm font-medium">
            Venue address
          </label>
          <input
            id="venue_address"
            name="venue_address"
            type="text"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium">
            Invitation language
          </label>
          <select
            id="language"
            name="language"
            defaultValue="en"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
          >
            <option value="en">English</option>
            <option value="sw">Swahili</option>
          </select>
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
          {pending ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
