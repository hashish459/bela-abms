"use client";

import { useState } from "react";
import { Check, Languages, Monitor, Moon, Palette, RotateCcw, Sun, Type } from "lucide-react";
import { Toggle } from "@/components/ui";
import {
  usePreferences, ACCENT_OPTIONS, FONT_OPTIONS, TEXT_SIZE_OPTIONS,
  type ThemeMode, type Language,
} from "@/lib/preferences";
import { useTranslation } from "@/lib/i18n";

/**
 * A self-contained trigger + popover: drop it in the dashboard header or on
 * the login page and it manages its own open/closed state and persistence.
 */
export function AppearancePanel({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-accent-tint hover:text-foreground"
        aria-label={t("appearance")}
      >
        <Palette size={17} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-4 shadow-xl ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <AppearanceControls />
          </div>
        </>
      )}
    </div>
  );
}

export function AppearanceControls() {
  const { prefs, setPref, reset } = usePreferences();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("appearance")}</h3>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <RotateCcw size={12} /> {t("resetDefaults")}
        </button>
      </div>

      {/* Theme */}
      <section>
        <p className="mb-2 text-xs font-medium text-muted">{t("theme")}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { key: "light", label: t("themeLight"), icon: Sun },
              { key: "dark", label: t("themeDark"), icon: Moon },
              { key: "system", label: t("themeSystem"), icon: Monitor },
            ] as { key: ThemeMode; label: string; icon: typeof Sun }[]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPref("theme", key)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition ${
                prefs.theme === key
                  ? "border-accent bg-accent-tint font-semibold text-accent"
                  : "border-border text-muted hover:bg-accent-tint hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Accent color */}
      <section>
        <p className="mb-2 text-xs font-medium text-muted">{t("accentColor")}</p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_OPTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => setPref("accent", a.key)}
              title={a.label}
              aria-label={a.label}
              className="grid h-8 w-8 place-items-center rounded-full ring-1 ring-border transition hover:scale-105"
              style={{ backgroundColor: a.swatch }}
            >
              {prefs.accent === a.key && <Check size={14} className="text-white drop-shadow" />}
            </button>
          ))}
        </div>
      </section>

      {/* Font family */}
      <section>
        <p className="mb-2 text-xs font-medium text-muted">{t("fontFamily")}</p>
        <div className="space-y-1">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.key}
              onClick={() => setPref("font", f.key)}
              style={{ fontFamily: f.sample }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition ${
                prefs.font === f.key ? "bg-accent-tint font-semibold text-accent" : "text-foreground hover:bg-accent-tint"
              }`}
            >
              {f.label}
              {prefs.font === f.key && <Check size={14} />}
            </button>
          ))}
        </div>
      </section>

      {/* Text size */}
      <section>
        <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted">
          <Type size={12} /> {t("textSize")}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {TEXT_SIZE_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setPref("textSize", s.key)}
              className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                prefs.textSize === s.key
                  ? "border-accent bg-accent-tint font-semibold text-accent"
                  : "border-border text-muted hover:bg-accent-tint hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Reduce motion */}
      <section className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">{t("reduceMotion")}</p>
          <p className="text-[11px] text-muted">{t("reduceMotionHint")}</p>
        </div>
        <Toggle checked={prefs.reduceMotion} onChange={(v) => setPref("reduceMotion", v)} />
      </section>

      {/* Language */}
      <section>
        <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted">
          <Languages size={12} /> {t("language")}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { key: "en", label: "English" },
              { key: "ne", label: "नेपाली" },
            ] as { key: Language; label: string }[]
          ).map((l) => (
            <button
              key={l.key}
              onClick={() => setPref("language", l.key)}
              className={`rounded-lg border px-2 py-1.5 text-sm transition ${
                prefs.language === l.key
                  ? "border-accent bg-accent-tint font-semibold text-accent"
                  : "border-border text-muted hover:bg-accent-tint hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
