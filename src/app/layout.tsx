"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";

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
  description:
    "Production-ready invoicing, GST, inventory, and payments platform for modern businesses.",
};

const PUBLIC_PREFIXES = ["/", "/auth", "/pricing", "/terms", "/privacy", "/contact"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const publicRoute = isPublicRoute(pathname);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              {publicRoute ? (
                <>{children}</>
              ) : (
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 overflow-x-auto transition-all duration-300 md:pl-0">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pt-16 md:pt-6">
                      {children}
                    </div>
                  </main>
                </div>
              )}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
