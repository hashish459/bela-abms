import { BrandLogo } from "@/components/brand-logo";

/**
 * Shown by Next.js while any top-level route segment (login, dashboard shell
 * on first load, etc.) is still resolving its async data. No chrome yet at
 * this point, so it's a full-page branded splash rather than an inline spinner.
 */
export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <BrandLogo size={72} className="brand-pulse" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </main>
  );
}
