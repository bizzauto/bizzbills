import Link from "next/link";
import { PublicLayout } from "@/components/PublicLayout";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "For freelancers and small businesses just getting started.",
    features: [
      "50 invoices / month",
      "1 user",
      "Basic GST invoicing",
      "Customer & vendor management",
      "Email support",
    ],
    cta: "Start Free",
    href: "/auth/register",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹499",
    period: "/month",
    description: "For growing businesses that need more power and automation.",
    features: [
      "Unlimited invoices",
      "3 users",
      "E-invoicing & e-way bill",
      "Inventory management",
      "Payment reminders (WhatsApp)",
      "GST reports (GSTR-1, GSTR-3B)",
      "Priority support",
    ],
    cta: "Start 7-Day Trial",
    href: "/auth/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "₹1,499",
    period: "/month",
    description: "For businesses that need multi-entity management and AI.",
    features: [
      "Everything in Growth",
      "Unlimited users",
      "Multi-entity workspace",
      "AI invoice drafting & insights",
      "Auto-reconciliation",
      "Custom invoice templates",
      "API access",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm font-medium text-accent-light">
            Simple, transparent pricing
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-default sm:text-5xl">
            Choose the right plan for your business
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-8 ${
                plan.highlighted
                  ? "border-cyan-400/40 bg-cyan-400/5 shadow-lg shadow-cyan-400/10"
                  : "border-white/10 bg-slate-900/50"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-4 py-1 text-xs font-semibold text-slate-950">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-semibold text-default">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-default">{plan.price}</span>
                {plan.period !== "forever" && (
                  <span className="text-sm text-muted">{plan.period}</span>
                )}
              </div>
              <p className="mt-4 text-sm text-muted">{plan.description}</p>
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <span className="mt-0.5 text-cyan-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    : "border border-default text-default hover-brighten"
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
