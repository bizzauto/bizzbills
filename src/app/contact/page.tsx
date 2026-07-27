"use client";

import { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Contact</p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Get in touch</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Have a question, feedback, or need help? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center">
            <span className="text-2xl">📧</span>
            <h3 className="mt-3 text-sm font-semibold text-white">Email</h3>
            <p className="mt-1 text-sm text-slate-400">support@bizzbills.com</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center">
            <span className="text-2xl">💬</span>
            <h3 className="mt-3 text-sm font-semibold text-white">WhatsApp</h3>
            <p className="mt-1 text-sm text-slate-400">+91 98765 43210</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center">
            <span className="text-2xl">⏰</span>
            <h3 className="mt-3 text-sm font-semibold text-white">Hours</h3>
            <p className="mt-1 text-sm text-slate-400">Mon–Sat, 9am–7pm IST</p>
          </div>
        </div>

        <div className="mt-12 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
          {submitted ? (
            <div className="text-center py-10">
              <span className="text-4xl">✅</span>
              <h2 className="mt-4 text-xl font-semibold text-white">Message sent!</h2>
              <p className="mt-2 text-sm text-slate-400">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Name</span>
                  <input type="text" required placeholder="Your name"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block text-slate-400">Email</span>
                  <input type="email" required placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" />
                </label>
              </div>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">Subject</span>
                <select className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50">
                  <option>General Inquiry</option>
                  <option>Sales / Pricing</option>
                  <option>Technical Support</option>
                  <option>Partnership</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block text-slate-400">Message</span>
                <textarea rows={4} required placeholder="How can we help?"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50" />
              </label>
              <button type="submit" className="w-full rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
