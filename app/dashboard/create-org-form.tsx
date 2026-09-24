"use client";

import { useActionState } from "react";
import { createOrganisation, type CreateOrgState } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const initialState: CreateOrgState = {};

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(
    createOrganisation,
    initialState,
  );

  return (
    <div className="mx-auto w-full max-w-sm py-12">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Set up your organisation
      </h1>
      <p className="mt-1 text-sm text-muted">
        This is who your events belong to — e.g. a family name, a company,
        or an event-planning business.
      </p>

      <Card className="mt-6 p-6">
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="field-label">
              Organisation name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. The Mwangi Family"
              className="field-input"
            />
          </div>

          {state.error && (
            <p className="field-error" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Creating…" : "Create organisation"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
