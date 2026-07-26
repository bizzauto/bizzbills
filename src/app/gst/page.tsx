import Link from "next/link";

export default function GstPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">GST Compliance</h1>
        <p className="mt-1 text-sm text-slate-400">Manage GSTIN, HSN/SAC codes, e-way bills, and file returns</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/gst/settings" className="group rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-cyan-400/30">
          <p className="text-sm text-cyan-300">Settings</p>
          <h2 className="mt-2 text-lg font-semibold text-white">GSTIN &amp; Rates</h2>
          <p className="mt-1 text-sm text-slate-400">Configure your GST registration and tax rates</p>
        </Link>

        <Link href="/gst/hsn" className="group rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-cyan-400/30">
          <p className="text-sm text-cyan-300">HSN / SAC</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Product Codes</h2>
          <p className="mt-1 text-sm text-slate-400">Manage GST classification codes for products and services</p>
        </Link>

        <Link href="/gst/gstr-1" className="group rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-cyan-400/30">
          <p className="text-sm text-cyan-300">GSTR-1</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Outward Supplies</h2>
          <p className="mt-1 text-sm text-slate-400">Monthly outward supplies report for GST filing</p>
        </Link>

        <Link href="/gst/gstr-3b" className="group rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-cyan-400/30">
          <p className="text-sm text-cyan-300">GSTR-3B</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Monthly Summary</h2>
          <p className="mt-1 text-sm text-slate-400">Summary return with ITC and net tax payable</p>
        </Link>

        <Link href="/gst/itc" className="group rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-cyan-400/30">
          <p className="text-sm text-cyan-300">ITC</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Input Tax Credit</h2>
          <p className="mt-1 text-sm text-slate-400">Track and claim input tax credit on purchases</p>
        </Link>

        <Link href="/gst/eway-bills" className="group rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-cyan-400/30">
          <p className="text-sm text-cyan-300">E-Way Bills</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Transit Tracking</h2>
          <p className="mt-1 text-sm text-slate-400">Generate and manage e-way bills for interstate shipping</p>
        </Link>
      </section>
    </main>
  );
}