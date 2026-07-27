import { PublicLayout } from "@/components/PublicLayout";

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Legal</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: July 2026</p>

        <div className="prose-invert mt-10 space-y-8 text-slate-300 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
            <p className="mt-2">
              We collect information you provide directly: account details (name, email, organization info),
              business data (invoices, contacts, transactions), and payment information for subscriptions.
              We also collect usage data such as pages visited and features used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. How We Use Your Information</h2>
            <p className="mt-2">
              Your information is used to provide and improve the Service, process transactions, send
              relevant notifications, and provide customer support. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Data Security</h2>
            <p className="mt-2">
              We implement industry-standard security measures including encryption at rest (AES-256) and
              in transit (TLS 1.3). Your business data is isolated per organization with strict access controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Data Retention</h2>
            <p className="mt-2">
              We retain your data for as long as your account is active. After account deletion, data is
              permanently removed within 30 days, except where required by Indian law (e.g., GST records).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Third-Party Services</h2>
            <p className="mt-2">
              We may use third-party services for payment processing, analytics, and cloud hosting. These
              providers are contractually bound to protect your data and use it only for providing services to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Your Rights</h2>
            <p className="mt-2">
              You have the right to access, correct, export, and delete your personal data. Contact us at
              privacy@bizzbills.com to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Contact</h2>
            <p className="mt-2">
              For privacy-related inquiries, email us at privacy@bizzbills.com or write to our registered
              address in India.
            </p>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}
