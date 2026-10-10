"use client";

import { useActionState } from "react";
import { createEvent, type CreateEventState } from "../actions";
import { Button } from "@/components/ui/button";

const initialState: CreateEventState = {};

const EVENT_TYPES = [
  "wedding",
  "send-off",
  "corporate",
  "conference",
  "birthday",
  "other",
];

export function NewEventForm({ themes }: { themes: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createEvent, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="org_name" className="field-label">
          Client / organisation
        </label>
        <input
          id="org_name"
          name="org_name"
          type="text"
          required
          placeholder="e.g. The Mwangi Family"
          className="field-input"
        />
        <p className="field-hint">
          Who this event belongs to. Matches an existing client by exact
          name, or creates a new one.
        </p>
      </div>

      <div>
        <label htmlFor="name" className="field-label">
          Event name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Amina & Baraka's Wedding"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="event_type" className="field-label">
          Event type
        </label>
        <select id="event_type" name="event_type" required defaultValue="" className="field-select">
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
        <label htmlFor="starts_at" className="field-label">
          Date &amp; time (Africa/Dar es Salaam)
        </label>
        <input id="starts_at" name="starts_at" type="datetime-local" required className="field-input" />
      </div>

      <div>
        <label htmlFor="venue_name" className="field-label">
          Venue name
        </label>
        <input id="venue_name" name="venue_name" type="text" className="field-input" />
      </div>

      <div>
        <label htmlFor="venue_address" className="field-label">
          Venue address
        </label>
        <input id="venue_address" name="venue_address" type="text" className="field-input" />
      </div>

      <div>
        <label htmlFor="location_link" className="field-label">
          Google Maps location (optional)
        </label>
        <input
          id="location_link"
          name="location_link"
          type="text"
          placeholder="Paste a Google Maps link, or lat,lng"
          className="field-input"
        />
        <p className="field-hint">
          On the venue&apos;s Google Maps page: Share → Copy link, then
          paste it here. Makes the invite&apos;s map pin precise instead of
          just the typed address.
        </p>
      </div>

      <div>
        <label htmlFor="language" className="field-label">
          Invitation language
        </label>
        <select id="language" name="language" defaultValue="en" className="field-select">
          <option value="en">English</option>
          <option value="sw">Swahili</option>
        </select>
      </div>

      {themes.length > 0 && (
        <div>
          <label htmlFor="theme_id" className="field-label">
            Theme
          </label>
          <select id="theme_id" name="theme_id" defaultValue={themes[0].id} className="field-select">
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
