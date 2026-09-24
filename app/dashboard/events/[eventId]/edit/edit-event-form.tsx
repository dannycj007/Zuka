"use client";

import { useActionState } from "react";
import type { EventFormState } from "../../actions";
import type { Database } from "@/lib/types/database";
import { toDatetimeLocalValue } from "@/lib/tanzania-time";
import { Button } from "@/components/ui/button";

const initialState: EventFormState = {};

const EVENT_TYPES = [
  "wedding",
  "send-off",
  "corporate",
  "conference",
  "birthday",
  "other",
];

export function EditEventForm({
  event,
  themes,
  action,
}: {
  event: Database["public"]["Tables"]["events"]["Row"];
  themes: { id: string; name: string }[];
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="field-label">
          Event name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={event.name}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="event_type" className="field-label">
          Event type
        </label>
        <select
          id="event_type"
          name="event_type"
          required
          defaultValue={event.event_type}
          className="field-input"
        >
          {!EVENT_TYPES.includes(event.event_type) && (
            <option value={event.event_type}>{event.event_type}</option>
          )}
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
        <input
          id="starts_at"
          name="starts_at"
          type="datetime-local"
          required
          defaultValue={toDatetimeLocalValue(event.starts_at)}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="venue_name" className="field-label">
          Venue name
        </label>
        <input
          id="venue_name"
          name="venue_name"
          type="text"
          defaultValue={event.venue_name ?? ""}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="venue_address" className="field-label">
          Venue address
        </label>
        <input
          id="venue_address"
          name="venue_address"
          type="text"
          defaultValue={event.venue_address ?? ""}
          className="field-input"
        />
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
          {event.venue_lat != null && event.venue_lng != null
            ? `Currently set to ${event.venue_lat}, ${event.venue_lng}. Leave blank to keep it, or paste a new link to replace it.`
            : "On the venue's Google Maps page: Share → Copy link, then paste it here."}
        </p>
      </div>

      <div>
        <label htmlFor="language" className="field-label">
          Invitation language
        </label>
        <select
          id="language"
          name="language"
          defaultValue={event.language}
          className="field-input"
        >
          <option value="en">English</option>
          <option value="sw">Swahili</option>
        </select>
      </div>

      {themes.length > 0 && (
        <div>
          <label htmlFor="theme_id" className="field-label">
            Theme
          </label>
          <select
            id="theme_id"
            name="theme_id"
            defaultValue={event.theme_id ?? themes[0].id}
            className="field-input"
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="status" className="field-label">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={event.status}
          className="field-input"
        >
          <option value="draft">Draft</option>
          <option value="live">Live</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
