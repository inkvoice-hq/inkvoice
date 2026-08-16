import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy — Inkvoice" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="12 August 2026">
      <p>
        This policy explains what information Inkvoice collects, why, and what rights you have
        over it. We follow the Protection of Personal Information Act (POPIA).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details.</strong> Your email address and password (stored encrypted, never in plain text).</li>
        <li><strong>Business details.</strong> The business name, address, contact details and bank instructions you enter in Settings.</li>
        <li><strong>Your business records.</strong> The clients, services and invoices you create.</li>
        <li><strong>Payment records.</strong> If you subscribe, we store your plan, status and renewal date. Card details are handled entirely by Paystack — we never receive them.</li>
      </ul>

      <h2>Why we collect it</h2>
      <p>
        To run the service: to log you in, save your work, put your details on your invoices,
        and manage your subscription. We do not sell your information and we do not use it for
        advertising.
      </p>

      <h2>Client information you enter</h2>
      <p>
        When you add a client, you are entering someone else&apos;s details. You are responsible
        for having a lawful reason to hold that information. We process it only to provide the
        service to you, and we do not contact your clients.
      </p>

      <h2>Who we share it with</h2>
      <p>We use a small number of service providers, and only for the purposes below:</p>
      <ul>
        <li><strong>Supabase</strong> — secure database and authentication hosting.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
        <li><strong>Paystack</strong> — payment processing for subscriptions.</li>
      </ul>
      <p>We may also disclose information if required by law.</p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and at rest. Each account is isolated at the database level,
        so one account can never read another account&apos;s records. Access to production systems
        is restricted.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data for as long as your account is open. If you ask us to delete your
        account, we remove your personal data within 30 days, except where we must keep limited
        records for legal or tax reasons.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>Ask what personal information we hold about you.</li>
        <li>Correct anything inaccurate — most details are editable in Settings.</li>
        <li>Request deletion of your account and data.</li>
        <li>Object to processing, or lodge a complaint with the Information Regulator of South Africa.</li>
      </ul>
      <p>
        To exercise any of these, email{" "}
        <a href="mailto:support@inkvoice.app">support@inkvoice.app</a>. We respond within
        30 days.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies needed to keep you signed in. We do not use advertising or
        third-party tracking cookies.
      </p>

      <h2>Changes</h2>
      <p>
        If we make a material change to this policy, we will notify account holders by email
        before it takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:support@inkvoice.app">support@inkvoice.app</a>
      </p>
    </LegalPage>
  );
}
