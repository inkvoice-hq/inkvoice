import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy — Zarbill" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="5 November 2026">
      <p>
        This policy explains what information Zarbill collects, why, who it is shared with, and
        what rights you have over it. We follow the Protection of Personal Information Act (POPIA).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details.</strong> Your email address and password (stored securely as a hash, never in plain text).</li>
        <li><strong>Business details.</strong> The business name, address, contact details, bank instructions and payment link you enter in Settings.</li>
        <li><strong>Your business records.</strong> The clients, services, quotes, invoices and payments you create or import.</li>
        <li><strong>Statement data.</strong> When you use Match payments, your statement file is read in your browser. The payment lines it contains are sent to our servers only to suggest matches; we save only the payments you confirm (date, amount, fees, payer and reference). We do not store the statement file itself.</li>
        <li><strong>Invoice activity.</strong> When your client opens an invoice or quote link, we record that it was opened, so you can see whether it was received.</li>
        <li><strong>Subscription records.</strong> If you subscribe, we store your plan, status and renewal date. Card details are handled entirely by Paystack; we never receive them.</li>
        <li><strong>Usage information.</strong> Basic, aggregated website analytics (pages visited, country, device type) and, for visitors who arrive from our adverts, whether they signed up.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>
        To run the service: to log you in, save your work, put your details on your invoices,
        email invoices, quotes and payment reminders to your clients on your behalf, match
        payments, calculate fees and exchange rates, and manage your subscription. We use usage
        information to understand how people find and use Zarbill and to measure our own
        advertising. We do not sell your information, and we do not use your business records
        or your clients&apos; details for advertising.
      </p>

      <h2>Client information you enter</h2>
      <p>
        When you add a client, you are entering someone else&apos;s details. You are responsible
        for having a lawful reason to hold that information and to send them invoices. We process
        it only to provide the service to you. Zarbill contacts your clients only to deliver what
        you ask it to: invoices and quotes you send, and payment reminders, which you can switch
        off in Settings, and which pause automatically for an invoice you mark as disputed. These emails come from your business name, and
        replies go to your own email address.
      </p>

      <h2>Drafted emails (AI)</h2>
      <p>
        If you ask Zarbill to draft a follow-up email, the details needed to write it are sent to
        Anthropic, the provider of the Claude AI model: your business name, the client&apos;s
        company and first name, and the invoice&apos;s number, amounts, dates and status. Email
        addresses are not sent. Nothing is emailed until you have reviewed and approved the draft.
        Under Anthropic&apos;s commercial terms, this data is not used to train its models.
      </p>

      <h2>Who we share it with</h2>
      <p>We use a small number of service providers, only for the purposes below:</p>
      <ul>
        <li><strong>Supabase</strong> — database and login hosting.</li>
        <li><strong>Vercel</strong> — website and application hosting, and aggregated website analytics.</li>
        <li><strong>Resend</strong> — delivering the invoices, quotes, reminders and account emails Zarbill sends.</li>
        <li><strong>Anthropic</strong> — drafting follow-up emails, only when you ask for a draft.</li>
        <li><strong>Paystack</strong> — subscription payments.</li>
        <li><strong>Google</strong> — measuring whether visitors who click our adverts sign up.</li>
        <li><strong>Apple (iCloud Mail)</strong> — our support mailbox, if you email us.</li>
      </ul>
      <p>
        Exchange rates are fetched from a public exchange-rate service; no personal information
        is sent to it. Some of these providers store data outside South Africa. Where they do, we
        rely on their contractual and security commitments to protect it to a standard consistent
        with POPIA. We may also disclose information if required by law.
      </p>

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
        <li>Correct anything inaccurate. Most details are editable in Settings.</li>
        <li>Export your records. Clients, invoices and payments can be downloaded as CSV at any time.</li>
        <li>Request deletion of your account and data.</li>
        <li>Object to processing, or lodge a complaint with the Information Regulator of South Africa.</li>
      </ul>
      <p>
        To exercise any of these, email{" "}
        <a href="mailto:support@zarbill.com">support@zarbill.com</a>. We respond within
        30 days.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies to keep you signed in. On our public website, Google&apos;s advertising tag
        may set cookies so we can tell whether a visit that started from one of our adverts led
        to a sign-up. Our own website analytics do not use cookies. You can block or delete
        cookies in your browser settings; you will still be able to use Zarbill, but you will
        need to sign in again.
      </p>

      <h2>Changes</h2>
      <p>
        If we make a material change to this policy, we will notify account holders by email
        before it takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:support@zarbill.com">support@zarbill.com</a>
      </p>
    </LegalPage>
  );
}
