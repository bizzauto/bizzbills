import Link from "next/link";

const stats = [
  { label: "Invoice creation", value: "< 1.8s" },
  { label: "Automations", value: "160+" },
  { label: "GST accuracy", value: "99.8%" },
];

const features = [
  { title: "AI invoice drafting", text: "Generate invoices from voice, text, or OCR with contextual defaults." },
  { title: "Multi-entity control", text: "Run GST, inventory, accounting, and CRM from one secure workspace." },
  { title: "Auto-reconciliation", text: "Match payments, reminders, and settlements without manual spreadsheet work." },
  { title: "Offline-ready sync", text: "Capture transactions on the go and sync securely whenever you reconnect." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-10 pb-12">
      <section className="grid gap-8 rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur lg:grid-cols-[1.25fr_0.75fr] lg:p-12">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-300">
            AI-native finance operating system
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Build invoices, cash flow, and compliance in one serious production workspace.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              BizzBills brings together billing, GST, inventory, CRM, payments, and AI automation into a platform designed for modern businesses that cannot afford sloppy workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/billing"
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Launch Billing Workspace
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore Live Dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-cyan-400/20 bg-slate-950/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Today&apos;s cash position</p>
              <p className="text-2xl font-semibold text-white">₹18.4L</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
              +12.4%
            </span>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Pending collections</span>
              <span className="font-semibold text-white">₹4.8L</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Inventory reorder risk</span>
              <span className="font-semibold text-amber-300">6 items</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>GST filing readiness</span>
              <span className="font-semibold text-emerald-300">Ready</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Why teams choose BizzBills</h2>
          <div className="mt-5 space-y-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <h3 className="font-medium text-white">{feature.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-slate-900/80 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cyan-300">Live workspace</p>
              <h2 className="text-xl font-semibold text-white">Invoice composer</h2>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
              AI assisted
            </span>
          </div>

          <div className="mt-6 space-y-4 rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-3">
              <div>
                <p className="text-sm text-slate-400">Customer</p>
                <p className="font-medium text-white">Northstar Retail</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Due date</p>
                <p className="font-medium text-white">14 Jul</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Consulting service</span>
                <span>₹24,000</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>GST @ 18%</span>
                <span>₹4,320</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm font-semibold text-white">
                <span>Total</span>
                <span>₹28,320</span>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
              Suggested action: send payment reminder in 2 hours and attach the e-invoice draft.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
