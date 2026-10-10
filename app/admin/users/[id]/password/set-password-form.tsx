"use client";

import { useActionState } from "react";
import { setUserPassword, type SetUserPasswordState } from "../../actions";
import { Button } from "@/components/ui/button";

const initialState: SetUserPasswordState = {};

export function SetPasswordForm({ userId }: { userId: string }) {
  const action = setUserPassword.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.success) {
    return (
      <p className="text-sm text-muted">
        Password updated. Share the new one with them yourself — it&apos;s
        not shown here again.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="field-label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="text"
          required
          minLength={8}
          className="field-input"
        />
        <p className="field-hint">At least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirm" className="field-label">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="text" required minLength={8} className="field-input" />
      </div>

      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
