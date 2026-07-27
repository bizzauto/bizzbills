import { PublicLayout } from "@/components/PublicLayout";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for freelancers and small businesses just getting started.",
    features: [
      "Up to 50 invoices/month",
      "Basic GST compliance",
      "1 user",
      "Email support",
      "Standard reports",
    ],
    cta: "Start Free",
    ctaHref: "/auth/register",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹999",
    period: "/month",
    description: "For growing businesses that need advanced features and multi-user access.",
    features: [
      "Unlimited invoices",
      "Full GST + e-invoice support",
      "Up to 5 users",
      "Priority support",
      "AI-powered insights",
      "Recurring invoices",
      "Credit/debit notes",
    ],
    cta: "Start 7-Day Trial",
    ctaHref: "/auth/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "₹2,999",
    period: "/month",
    description: "For businesses with complex needs, multiple entities, and custom requirements.",
    features: [
      "Everything in Growth",
      "Unlimited users",
      "Multi-entity support",
      "Custom integrations",
      "Dedicated account manager",
      "API access",
      "Advanced analytics",
      "Custom templates",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Simple, transparent pricing</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Start free. Upgrade as you grow. No hidden fees.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-cyan-400/40 bg-slate-900/90 shadow-2xl shadow-cyan-950/30"
                  : "border-white/10 bg-slate-900/70"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-4 py-1 text-xs font-semibold text-slate-950">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                {plan.period && <span className="text-sm text-slate-400">{plan.period}</span>}
              </div>
              <p className="mt-3 text-sm text-slate-400">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    : "border border-white/15 text-white hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
