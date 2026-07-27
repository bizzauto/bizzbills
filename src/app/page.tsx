import Link from "next/link";
import { PublicLayout } from "@/components/PublicLayout";

const stats = [
  { label: "Invoice creation", value: "< 1.8s" },
  { label: "Automations", value: "160+" },
  { label: "GST accuracy", value: "99.8%" },
  { label: "Active businesses", value: "10K+" },
];

const features = [
  { icon: "⚡", title: "AI invoice drafting", text: "Generate invoices from voice, text, or OCR with contextual defaults." },
  { icon: "🏢", title: "Multi-entity control", text: "Run GST, inventory, accounting, and CRM from one secure workspace." },
  { icon: "🔄", title: "Auto-reconciliation", text: "Match payments, reminders, and settlements without manual spreadsheet work." },
  { icon: "📱", title: "Offline-ready sync", text: "Capture transactions on the go and sync securely whenever you reconnect." },
  { icon: "📊", title: "Real-time analytics", text: "Cash flow forecasts, aging reports, and GST compliance dashboards." },
  { icon: "🤖", title: "AI-powered insights", text: "Anomaly detection, HSN suggestions, and smart follow-up reminders." },
];

const testimonials = [
  { name: "Rajesh Kumar", role: "CFO, Vertex Industries", text: "BizzBills cut our invoice processing time by 70%. GST filing is now a breeze." },
  { name: "Priya Sharma", role: "Owner, Sparkle Boutique", text: "Finally a billing tool that understands Indian businesses. The WhatsApp integration is a game changer." },
  { name: "Amit Patel", role: "Director, Patel Exports", text: "Multi-entity management was a nightmare before. Now I run everything from one dashboard." },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm font-medium text-cyan-300">
                AI-native finance operating system
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Invoicing, GST &amp; accounting{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  built for India
                </span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300">
                BizzBills brings together billing, GST compliance, inventory, CRM, payments, and AI automation — designed for modern businesses that cannot afford sloppy workflows.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/auth/register" className="rounded-full bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                  Start Free Trial
                </Link>
                <Link href="/pricing" className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                  View Pricing
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">✓ 7-day free trial</span>
                <span className="flex items-center gap-1.5">✓ No credit card required</span>
                <span className="flex items-center gap-1.5">✓ Setup in 5 minutes</span>
              </div>
            </div>

            {/* Dashboard preview card */}
            <div className="rounded-[1.5rem] border border-cyan-400/20 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/30">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Today&apos;s cash position</p>
                  <p className="text-2xl font-bold text-white">₹18,40,000</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">+12.4%</span>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Pending collections</span><span className="font-semibold text-white">₹4,80,000</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Inventory reorder risk</span><span className="font-semibold text-amber-300">6 items</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>GST filing readiness</span><span className="font-semibold text-emerald-300">Ready</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">
                🤖 AI: Best payment follow-up window is tomorrow morning.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-slate-950/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-sm text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Features</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Everything you need</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">One platform. All the tools. Zero complexity.</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-cyan-400/30">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-white/10 bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Testimonials</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Trusted by businesses across India</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
                <p className="text-sm leading-6 text-slate-300">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-slate-900/80 p-10 text-center backdrop-blur sm:p-14">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to simplify your billing?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Join 10,000+ businesses using BizzBills to manage invoicing, GST, and payments.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/auth/register" className="rounded-full bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
              Start Free Trial
            </Link>
            <Link href="/contact" className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
