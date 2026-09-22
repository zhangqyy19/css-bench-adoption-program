import type { Metadata } from "next";
import { EB_Garamond, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Adopt a Bench | Van Cortlandt Park",
    template: "%s | Van Cortlandt Park Adopt a Bench",
  },
  description:
    "The Van Cortlandt Park bench adoption program: see which benches are adopted, by whom, and adopt one yourself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b-4 border-brass-500 bg-pine-900 text-cream-50">
          <div className="wrap flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="" width={44} height={44} priority className="rounded-full bg-cream-50 p-1" />
              <span className="flex flex-col leading-tight">
                <span className="eyebrow text-brass-500">Van Cortlandt Park Alliance</span>
                <span className="text-2xl">Adopt a Bench</span>
              </span>
            </Link>
            <SiteNav />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-pine-900 py-10 text-center text-sm text-pine-100">
          <p>
            Van Cortlandt Park Alliance · 80 Van Cortlandt Park South, Ste. E1, Bronx, NY 10463 ·{" "}
            <a href="mailto:info@vancortlandt.org" className="text-cream-50 hover:underline">
              info@vancortlandt.org
            </a>{" "}
            · 718-601-1460
          </p>
          <p className="mt-2 text-xs text-pine-200">Demonstration project. Bench locations and donor names are sample data.</p>
        </footer>
      </body>
    </html>
  );
}
