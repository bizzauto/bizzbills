import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--card-border)", background: "var(--nav-bg)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-slate-950">
                B
              </div>
              <span className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>BizzBills</span>
            </Link>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--muted)" }}>
              AI-native invoicing, GST, inventory, and payments platform for modern Indian businesses.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm transition" style={{ color: "var(--muted)" }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
          &copy; {new Date().getFullYear()} BizzBills. All rights reserved. Built for Indian businesses.
        </div>
      </div>
    </footer>
  );
}
