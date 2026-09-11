"use client";

// Deliberately self-contained: this replaces the ENTIRE root layout (including
// PreferencesProvider and the theme-init script) when the root layout itself
// throws, so it renders its own <html>/<body> and skips i18n/theme context —
// this is the "even when everything else is broken" fallback.
import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Bela Nepal Industries" className="mx-auto mb-6 h-16 w-auto object-contain" />
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-danger/10 text-danger">
            <span className="text-3xl">⚠</span>
          </div>
          <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>
          <p className="mb-6 text-sm text-muted">
            The application hit an unexpected error. Try reloading the page.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
