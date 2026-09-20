import { getDictionary } from "@/lib/i18n";

/**
 * Shown for any unknown or invalid token. Deliberately generic — no
 * distinction between "token doesn't exist" and "token is malformed," no
 * hint about what a valid one looks like. We don't know the guest's
 * language for a token we couldn't resolve, so this shows both.
 */
export default function InviteNotFound() {
  const en = getDictionary("en");
  const sw = getDictionary("sw");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">{en.notFoundTitle}</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-600">{en.notFoundMessage}</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold">{sw.notFoundTitle}</h2>
        <p className="mt-2 max-w-sm text-sm text-zinc-600">{sw.notFoundMessage}</p>
      </div>
    </main>
  );
}
