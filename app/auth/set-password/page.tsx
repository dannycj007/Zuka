"use client";

import { useActionState } from "react";
import { setPassword, type SetPasswordState } from "./actions";
import { Logo } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const initialState: SetPasswordState = {};

export default function SetPasswordPage() {
  const [state, formAction, pending] = useActionState(setPassword, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        <Card className="mt-8 p-8">
          <h1 className="font-display text-xl font-bold tracking-tight">
            Set your password
          </h1>
          <p className="mt-1 text-sm text-muted">
            You&apos;ve been invited to ZukaEvents. Choose a password to
            finish setting up your account.
          </p>

          <form action={formAction} className="mt-8 space-y-4">
            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="field-input"
              />
              <p className="field-hint">At least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="confirm" className="field-label">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="field-input"
              />
            </div>

            {state.error && (
              <p className="field-error" role="alert">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving…" : "Continue"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
