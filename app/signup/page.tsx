"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "./actions";
import { Logo } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  if (state.checkEmail) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center">
            <Logo size={40} />
          </div>
          <Card className="mt-8 p-8">
            <h1 className="font-display text-xl font-bold tracking-tight">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-muted">
              We&apos;ve sent a confirmation link. Follow it to activate your
              account, then log in.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block font-medium text-brand-orange-light hover:underline"
            >
              Back to log in
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        <Card className="mt-8 p-8">
          <h1 className="font-display text-xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted">
            You&apos;ll set up your organisation next.
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
                autoComplete="new-password"
                required
                minLength={8}
                className="field-input"
              />
              <p className="field-hint">At least 8 characters.</p>
            </div>

            {state.error && (
              <p className="field-error" role="alert">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creating account…" : "Sign up"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-orange-light hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
