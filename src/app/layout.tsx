import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthNav } from "@/components/AuthNav";
import { MobileNav } from "@/components/MobileNav";
import { OrgSwitcher } from "@/components/OrgSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BizzBills | AI-Native Invoicing Platform",
  description: "Production-ready invoicing, GST, inventory, and payments platform for modern businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <AuthProvider>
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
            <header className="sticky top-4 z-20 mb-8 rounded-full border border-white/10 bg-slate-900/70 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur">
              <nav className="flex items-center justify-between gap-4">
                <Link href="/" className="text-lg font-semibold tracking-tight text-white">
                  BizzBills
                </Link>

                <OrgSwitcher />

                {/* Desktop nav */}
                <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
                  <Link href="/dashboard" className="transition hover:text-white">
                    Dashboard
                  </Link>
                  <Link href="/billing" className="transition hover:text-white">
                    Billing
                  </Link>
                  <Link href="/accounting/chart-of-accounts" className="transition hover:text-white">
                    Accounting
                  </Link>
<Link href="/accounting/reports" className="transition hover:text-white">
                      Reports
                    </Link>
                                        <Link href="/gst" className="transition hover:text-white">
                      GST
                    </Link>
                    <Link href="/ai" className="transition hover:text-white">
                      AI
                    </Link>
                    <Link href="/payments" className="transition hover:text-white">
                      Payments
                    </Link>
                    <Link href="/credit-notes" className="transition hover:text-white">
                      Credit Notes
                    </Link>
                    <Link href="/debit-notes" className="transition hover:text-white">
                      Debit Notes
                    </Link>
                    <Link href="/currency" className="transition hover:text-white">
                      Currency
                    </Link>
                    <Link href="/settings" className="transition hover:text-white">
                      Settings
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden md:block">
                    <AuthNav />
                  </div>
                  <MobileNav />
                </div>
              </nav>
            </header>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
