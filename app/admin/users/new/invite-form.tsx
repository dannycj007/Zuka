"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inviteUser, type InviteUserState } from "../actions";
import { Button } from "@/components/ui/button";

const initialState: InviteUserState = {};

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);

  if (state.invited) {
    return (
      <div className="text-center">
        <p className="font-display text-lg font-semibold">
          {state.passwordSet ? "Account created" : "Invite sent"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {state.passwordSet ? (
            <>
              {state.invited} can sign in right away with the password you
              just set. Share it with them yourself — it&apos;s not emailed
              anywhere.
            </>
          ) : (
            <>
              {state.invited} will get an email with a link to set their
              password and sign in — that step is also what verifies their
              email, so there&apos;s nothing else to confirm.
            </>
          )}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/admin/users/new"
            className="text-sm font-medium text-brand-orange-light hover:underline"
          >
            Invite another
          </Link>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-muted-strong hover:text-foreground hover:underline"
          >
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" required className="field-input" />
      </div>

      <div>
        <label htmlFor="full_name" className="field-label">
          Full name (optional)
        </label>
        <input id="full_name" name="full_name" type="text" className="field-input" />
      </div>

      <div>
        <label htmlFor="role" className="field-label">
          Role
        </label>
        <select id="role" name="role" defaultValue="customer" className="field-select">
          <option value="customer">Customer</option>
          <option value="scanner">Scanner</option>
          <option value="admin">Admin</option>
        </select>
        <p className="field-hint">
          Customer: manages their own assigned event(s). Scanner:
          pre-assigned door staff, scan access only. Admin: full
          platform access — use sparingly.
        </p>
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password (optional)
        </label>
        <input
          id="password"
          name="password"
          type="text"
          minLength={8}
          className="field-input"
          placeholder="Leave blank to email an invite link instead"
        />
        <p className="field-hint">
          Set one here to create the account immediately — useful for door
          staff you&apos;re onboarding on the spot, with no email to wait
          on. You&apos;ll need to tell them the password yourself. Leave
          blank to send an invite email instead; either way counts as
          setting up the account.
        </p>
      </div>

      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Create account"}
      </Button>
    </form>
  );
}
