import Link from "next/link";

export default function GstLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <nav className="flex gap-4 border-b border-white/10 pb-4">
        <Link href="/gst/settings" className="text-sm text-slate-400 transition hover:text-white">Settings</Link>
        <Link href="/gst/hsn" className="text-sm text-slate-400 transition hover:text-white">HSN / SAC</Link>
        <Link href="/gst/gstr-1" className="text-sm text-slate-400 transition hover:text-white">GSTR-1</Link>
        <Link href="/gst/gstr-3b" className="text-sm text-slate-400 transition hover:text-white">GSTR-3B</Link>
        <Link href="/gst/itc" className="text-sm text-slate-400 transition hover:text-white">ITC</Link>
      </nav>
      {children}
    </main>
  );
}