import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Login — Bela ABMS" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent text-xl font-bold text-accent-foreground">
            ब
          </div>
          <h1 className="text-lg font-bold tracking-wide text-foreground">
            BELA <span className="font-normal text-muted">ABMS</span>
          </h1>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-1 text-xl font-semibold">Login</h2>
          <p className="mb-5 text-sm text-muted">
            Accounting &amp; Business Management System
          </p>
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Demo: admin@bela.local / cashier@bela.local — password123
        </p>
      </div>
    </main>
  );
}
