import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic, Montserrat } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";
import { DashboardDataProvider } from "@/components/providers/DashboardDataProvider";
import AppShell from "@/components/shell/AppShell";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "A-Group Holding — Subscription & Financial Dashboard",
  description: "Executive financial management dashboard for A-Group Holding (Tripoli) with LYD/USD dual-currency isolation and bilingual EN/AR support",
  keywords: ["A-Group", "A-Stay", "A-Market", "A-Space", "financial dashboard", "subscription management", "Tripoli", "Libya"],
};

/** Applies saved theme / language before first paint to avoid a light-theme or LTR flash. */
const PREFS_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('ag_prefs_v1')||'{}');var r=document.documentElement;if(p.theme==='dark')r.classList.add('dark');if(p.lang==='ar'){r.lang='ar';r.dir='rtl'}}catch(e){}`;

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
        <AppProvider>
          <DashboardDataProvider>
            <AppShell>{children}</AppShell>
          </DashboardDataProvider>
        </AppProvider>
      </body>
    </html>
  );
}
