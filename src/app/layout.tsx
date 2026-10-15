import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";

// Self-hosted (npm @fontsource packages): the build never needs to reach Google Fonts, so CI and deploys are reliable.
const montserrat = localFont({
  variable: "--font-montserrat",
  src: "../../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

const hanken = localFont({
  variable: "--font-hanken",
  src: "../../node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

const plexArabic = localFont({
  variable: "--font-arabic",
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "A-Group Holding — Subscription & Financial Dashboard",
  description: "Executive financial management dashboard for A-Group Holding (Tripoli) with LYD/USD dual-currency isolation and bilingual EN/AR support",
  keywords: ["A-Group", "A-Stay", "A-Market", "A-Space", "financial dashboard", "subscription management", "Tripoli", "Libya"],
};

/** Applies saved theme / language before first paint to avoid a light-theme or LTR flash. */
const PREFS_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('ag_prefs_v2')||'{}');var r=document.documentElement;if(p.theme==='dark')r.classList.add('dark');if(p.lang==='ar'){r.lang='ar';r.dir='rtl'}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${montserrat.variable} ${hanken.variable} ${plexArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ClerkProvider>
          <AppProvider>{children}</AppProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
