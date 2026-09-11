"use client";

import { useEffect, useState } from "react";

/**
 * Renders the company's actual logo file (public/logo.png) at its native
 * aspect ratio, never cropped. Falls back to a simple lettermark chip if the
 * file hasn't been added yet, so the app never looks broken in the meantime.
 *
 * Checks the file with a detached Image() probe rather than the rendered
 * <img>'s own onError: an SSR-rendered <img> starts its network request the
 * moment the browser parses the HTML, before React hydrates and attaches
 * event handlers — a fast 404 fires (and is lost) before onError exists,
 * leaving the browser's broken-image glyph on screen instead of our fallback.
 */
export function BrandLogo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setLoaded(true);
    };
    probe.onerror = () => {
      if (!cancelled) setLoaded(false);
    };
    probe.src = "/logo.png";
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`grid shrink-0 place-items-center rounded-xl bg-accent font-bold text-accent-foreground ${className}`}
      >
        ब
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- exact source file, size varies per placement; already confirmed loadable above
    <img
      src="/logo.png"
      alt="Bela Nepal Industries"
      style={{ height: size, width: "auto" }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
