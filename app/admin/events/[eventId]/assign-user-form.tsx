"use client";

import { useActionState } from "react";
import type { AssignUserState } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";

const initialState: AssignUserState = {};

export function AssignUserForm({
  action,
}: {
  action: (state: AssignUserState, formData: FormData) => Promise<AssignUserState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" required className="field-input" />
      </div>

      <div>
        <label htmlFor="role" className="field-label">
          Role on this event
        </label>
        <select id="role" name="role" defaultValue="customer" className="field-select">
          <option value="customer">Customer</option>
          <option value="scanner">Scanner</option>
        </select>
      </div>

      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Assigning…" : "Assign"}
      </Button>
    </form>
  );
}
