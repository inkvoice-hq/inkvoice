import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Refund & Cancellation Policy — Inkvoice" };

export default function RefundPolicy() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="12 August 2026">
      <p>
        This policy explains how subscription payments, cancellations and refunds work
        for Inkvoice. It forms part of our <a href="/terms">Terms of Service</a>.
      </p>

      <h2>Subscriptions and billing</h2>
      <p>
        Inkvoice is sold as a monthly subscription. The Pro plan is <strong>R350 per month</strong>
        {" "}(or <strong>$25 per month</strong> if billed in US dollars). The Business plan is
        {" "}<strong>R1 300 per month</strong> (or <strong>$69 per month</strong>). A free plan is
        available with a limit of 3 clients and 5 invoices, and requires no payment details.
      </p>
      <p>
        Subscriptions renew automatically each month until cancelled. Payments are processed
        by Paystack. We do not store your card details.
      </p>

      <h2>Cancelling your subscription</h2>
      <p>
        You may cancel at any time. To cancel, email{" "}
        <a href="mailto:support@inkvoice.app">support@inkvoice.app</a> from the address on
        your account, or use the billing section inside the app.
      </p>
      <ul>
        <li>Cancellation takes effect at the end of your current paid month.</li>
        <li>You keep full access until that date.</li>
        <li>After that, your account moves to the free plan. Your data is not deleted.</li>
        <li>There are no cancellation fees and no minimum contract period.</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        <strong>14-day money-back guarantee.</strong> If you are not satisfied with Inkvoice,
        request a refund within 14 days of your first payment and we will refund that payment
        in full, no questions asked.
      </p>
      <p>After the first 14 days, refunds are handled as follows:</p>
      <ul>
        <li>
          <strong>Service failure.</strong> If Inkvoice is unavailable for an extended period
          due to a fault on our side, we will refund or credit the affected portion of your month.
        </li>
        <li>
          <strong>Duplicate or incorrect charges.</strong> Refunded in full as soon as we
          confirm the error.
        </li>
        <li>
          <strong>Unused time after cancelling.</strong> Monthly subscriptions are not
          pro-rated. You keep access for the remainder of the month you have paid for.
        </li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email <a href="mailto:support@inkvoice.app">support@inkvoice.app</a> from your account
        email address with the reason for your request. We respond within 2 business days.
        Approved refunds are returned to the original payment method via Paystack and typically
        appear within 5–10 business days, depending on your bank.
      </p>

      <h2>Failed payments</h2>
      <p>
        If a renewal payment fails, we retry and notify you. If payment is not resolved, your
        account moves to the free plan. Your invoices and clients remain intact and become
        fully accessible again once payment succeeds.
      </p>

      <h2>Price changes</h2>
      <p>
        If we change subscription pricing, existing subscribers receive at least 30 days notice
        by email before the new price applies. You may cancel before it takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about billing, cancellations or refunds:{" "}
        <a href="mailto:support@inkvoice.app">support@inkvoice.app</a>
      </p>
    </LegalPage>
  );
}
