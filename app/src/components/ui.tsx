"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Div = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...p }: Div) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface ${className}`}
      {...p}
    />
  );
}

export function PageHeader({
  crumbs,
  title,
  action,
}: {
  crumbs: string[];
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-muted">{crumbs.join(" › ")}</p>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      {action}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", loading, className = "", children, disabled, ...p },
  ref,
) {
  const styles = {
    primary: "bg-accent text-accent-foreground hover:brightness-95",
    outline: "ring-1 ring-border hover:bg-accent-tint",
    ghost: "hover:bg-accent-tint text-muted hover:text-foreground",
    danger: "bg-danger text-white hover:brightness-95",
  }[variant];
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${styles} ${className}`}
      {...p}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
});

export function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg bg-background px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-accent disabled:opacity-60";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...p }, ref) {
  return <input ref={ref} className={`${inputClass} ${className}`} {...p} />;
});

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </span>
      {label && <span className="text-muted">{label}</span>}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-surface p-5 shadow-xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function toast(msg: string, kind: "ok" | "err" = "ok") {
  if (typeof document === "undefined") return;
  const reduceMotion = document.documentElement.dataset.reduceMotion === "true";

  const stack =
    document.getElementById("app-toast-stack") ??
    (() => {
      const s = document.createElement("div");
      s.id = "app-toast-stack";
      s.className =
        "fixed left-1/2 top-20 z-[100] flex -translate-x-1/2 flex-col items-center gap-2";
      document.body.appendChild(s);
      return s;
    })();

  const el = document.createElement("div");
  el.className = [
    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg",
    kind === "ok" ? "bg-success" : "bg-danger",
    reduceMotion ? "" : "app-toast-enter",
  ].join(" ");
  el.innerHTML = `<span aria-hidden="true">${kind === "ok" ? "✓" : "⚠"}</span>`;
  el.appendChild(document.createTextNode(msg));
  stack.appendChild(el);

  setTimeout(() => {
    if (!reduceMotion) {
      el.classList.add("app-toast-exit");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    } else {
      el.remove();
    }
    if (!stack.hasChildNodes()) stack.remove();
  }, 2600);
}

/** Small typed fetch wrapper for the API envelope. */
/** Reads the readable (non-httpOnly) double-submit CSRF cookie set at login. */
function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith("abms_csrf="))
    ?.split("=")[1];
}

export async function api<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: { code: string; message: string } }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken() ? { "x-csrf-token": csrfToken()! } : {}),
      ...init?.headers,
    },
  });
  return res.json();
}
