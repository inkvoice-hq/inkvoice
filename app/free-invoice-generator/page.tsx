import type { Metadata } from "next";
import Link from "next/link";
import { GeneratorView } from "./GeneratorView";

export const metadata: Metadata = {
  title: "Free invoice generator — no signup required",
  description:
    "Create and download a professional tax invoice in under a minute. No account, no email, no watermark. Works in rands, dollars, pounds and euros.",
  alternates: { canonical: "https://zarbill.com/free-invoice-generator" },
  openGraph: {
    title: "Free invoice generator — no signup required",
    description:
      "Make a professional tax invoice in under a minute. No account needed, no watermark.",
    url: "https://zarbill.com/free-invoice-generator",
  },
};

export default function Page() {
  return (
    <main className="gen-wrap">
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <header className="gen-head">
        <Link href="/" className="gen-brand">Zarbill</Link>
        <h1>Make an invoice, right now</h1>
        <p className="gen-sub">
          Fill in the form and your invoice builds itself alongside. Download it as a
          PDF when you are happy. No account, no email address, no watermark.
        </p>
      </header>

      <GeneratorView />

      <section className="gen-notes">
        <h2>What every tax invoice needs</h2>
        <p>
          A client&rsquo;s accounts department will reject an invoice that is missing
          the basics, and in most countries a tax invoice has a legal minimum. Include
          the words &ldquo;Tax Invoice&rdquo;, your business name and address, your
          client&rsquo;s name and address, a unique invoice number, the date issued, a
          clear description of what you supplied, the amount excluding tax, the tax
          charged, and the total due.
        </p>
        <p>
          If you are registered for VAT or sales tax, your registration number belongs
          on the invoice too. In South Africa a valid tax invoice must carry your VAT
          number and show VAT at 15%. The generator above lays all of this out for you.
        </p>

        <h2>Getting paid faster</h2>
        <p>
          Put your bank details on the invoice itself rather than making the client ask.
          Give a due date, not just &ldquo;30 days&rdquo;. Number your invoices in a
          sequence so you can chase a specific one without ambiguity. And send it the
          day you finish the work &mdash; invoices sent late get paid late.
        </p>

        <div className="gen-cta">
          <h2>Keep track of what you have sent</h2>
          <p>
            This page makes one invoice at a time and forgets it the moment you close
            the tab. If you want to save your clients, reuse your services, email
            invoices straight to clients, and see who has paid and who is overdue,
            Zarbill does that from a free account.
          </p>
          <Link href="/login" className="gen-btn">Create a free account</Link>
          <span className="gen-fine">Free plan: 3 clients, 5 invoices. No card required.</span>
        </div>
      </section>

      <footer className="gen-foot">
        <Link href="/">Zarbill</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </main>
  );
}
