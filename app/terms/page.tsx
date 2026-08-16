import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of Service — Inkvoice" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="12 August 2026">
      <p>
        These terms govern your use of Inkvoice, invoicing software operated from Cape Town,
        South Africa. By creating an account you agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        Inkvoice lets you record clients and services, create and store invoices, and export
        them as PDFs. We provide the software. You are responsible for the content of the
        invoices you create and for sending them to your customers.
      </p>
      <p>
        Inkvoice is not an accounting, tax or legal service. We do not file returns on your
        behalf or provide financial advice. Please consult a qualified accountant for tax matters.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate details and keep your password secure.</li>
        <li>You are responsible for activity that happens under your account.</li>
        <li>You must be at least 18 years old, or have permission from a legal guardian.</li>
        <li>One account represents one business workspace.</li>
      </ul>

      <h2>3. Plans and payment</h2>
      <p>
        A free plan is available with usage limits. Paid plans are billed monthly in advance
        and renew automatically until cancelled. Current pricing is shown on our{" "}
        <a href="/#pricing">pricing section</a>. Payments are processed by Paystack; we never
        see or store your full card details.
      </p>
      <p>
        Cancellation and refunds are covered in our{" "}
        <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.
      </p>

      <h2>4. Your data</h2>
      <p>
        Your invoices, clients and business details belong to you. We store them so the service
        can work, and we do not sell them. Each account is isolated from every other account at
        the database level. See our <a href="/privacy">Privacy Policy</a> for detail.
      </p>
      <p>
        You may export your invoices as PDFs at any time. If you close your account, contact us
        and we will delete your data on request.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use Inkvoice to:</p>
      <ul>
        <li>Create fraudulent invoices or misrepresent a business.</li>
        <li>Break South African law or the law of your own country.</li>
        <li>Attempt to access another account, or probe or disrupt the service.</li>
        <li>Resell or white-label the service without a written agreement with us.</li>
      </ul>
      <p>We may suspend accounts that breach these terms.</p>

      <h2>6. Availability</h2>
      <p>
        We work to keep Inkvoice available and reliable, but we do not guarantee uninterrupted
        service. Maintenance, third-party outages and events outside our control may cause
        downtime. Where a failure on our side affects a meaningful part of your paid month, our
        refund policy applies.
      </p>

      <h2>7. Liability</h2>
      <p>
        Inkvoice is provided as-is. To the extent permitted by law, our total liability for any
        claim relating to the service is limited to the amount you paid us in the three months
        before the claim arose. We are not liable for lost profits, lost business or indirect
        losses.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms. If a change materially affects you, we will give notice by
        email or in the app before it takes effect. Continuing to use Inkvoice after that means
        you accept the updated terms.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of the Republic of South Africa, and the South
        African courts have jurisdiction over any dispute.
      </p>

      <h2>10. Contact</h2>
      <p>
        <a href="mailto:support@inkvoice.app">support@inkvoice.app</a>
      </p>
    </LegalPage>
  );
}
