import { PublicLayout } from "@/components/PublicLayout";

export default function TermsPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Legal</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: July 2026</p>

        <div className="prose-invert mt-10 space-y-8 text-slate-300 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using BizzBills (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Description of Service</h2>
            <p className="mt-2">
              BizzBills provides an AI-native invoicing, GST compliance, inventory management, and accounting platform
              for businesses. The Service includes web applications, APIs, and related tools.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Account Registration</h2>
            <p className="mt-2">
              You must provide accurate and complete information when creating an account. You are responsible for
              maintaining the security of your account credentials and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Acceptable Use</h2>
            <p className="mt-2">
              You agree not to use the Service for any unlawful purpose, to attempt to gain unauthorized access to
              any part of the Service, or to interfere with its operation. You must comply with all applicable Indian
              laws including GST regulations when using the billing features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Data &amp; Privacy</h2>
            <p className="mt-2">
              Your data belongs to you. We store your business data securely and do not share it with third parties
              except as described in our Privacy Policy. You can export or delete your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Payment &amp; Subscriptions</h2>
            <p className="mt-2">
              Free tier usage is subject to fair-use limits. Paid subscriptions are billed monthly and can be
              cancelled at any time. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Limitation of Liability</h2>
            <p className="mt-2">
              BizzBills is provided &quot;as is&quot; without warranties. We are not liable for any indirect, incidental,
              or consequential damages. Our total liability shall not exceed the amount paid by you in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">8. Changes to Terms</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the Service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}
