import type { Metadata } from "next";
import { DM_Sans, Inter, Poppins, Noto_Sans } from "next/font/google";
import { PreferencesProvider, THEME_INIT_SCRIPT } from "@/lib/preferences";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "devanagari"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bela Nepal Industries — Accounting & Business Management",
  description: "IRD-compliant VAT billing, inventory and NFRS accounting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${inter.variable} ${poppins.variable} ${notoSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the visitor's saved theme/accent/font/text-size before first paint —
            without this, a returning user with non-default preferences would see a flash
            of the default look for a frame before React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
