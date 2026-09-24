"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import { Logo } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        <Card className="mt-8 p-8">
          <h1 className="font-display text-xl font-bold tracking-tight">
            Log in
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage your events and guest lists.
          </p>

          <form action={formAction} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="field-input"
              />
            </div>

            {state.error && (
              <p className="field-error" role="alert">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-brand-orange-light hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
