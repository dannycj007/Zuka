import { getDictionary } from "@/lib/i18n";
import { NavArrows } from "@/components/ui/nav-arrows";

/**
 * Shown for any unknown or invalid token. Deliberately generic — no
 * distinction between "token doesn't exist" and "token is malformed," no
 * hint about what a valid one looks like. We don't know the guest's
 * language for a token we couldn't resolve, so this shows both.
 *
 * No guest theme is resolvable here (that's the whole problem), so this
 * falls back to the app's own dark theme rather than a per-event one —
 * text-zinc-600 used to be fine against the pre-redesign white body but
 * reads as near-invisible against the dark background now, so it's
 * swapped for the app's calibrated text-muted token.
 */
export default function InviteNotFound() {
  const en = getDictionary("en");
  const sw = getDictionary("sw");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="absolute left-4 top-4">
        <NavArrows />
      </div>
      <div>
        <h1 className="text-xl font-semibold">{en.notFoundTitle}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">{en.notFoundMessage}</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold">{sw.notFoundTitle}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">{sw.notFoundMessage}</p>
      </div>
    </main>
  );
}
