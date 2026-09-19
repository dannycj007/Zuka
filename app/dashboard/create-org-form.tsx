"use client";

import { useActionState } from "react";
import { createOrganisation, type CreateOrgState } from "./actions";

const initialState: CreateOrgState = {};

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(
    createOrganisation,
    initialState,
  );

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Set up your organisation
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        This is who your events belong to — e.g. a family name, a company,
        or an event-planning business.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Organisation name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. The Mwangi Family"
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
          {pending ? "Creating…" : "Create organisation"}
        </button>
      </form>
    </div>
  );
}
