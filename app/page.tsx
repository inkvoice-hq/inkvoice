import Link from "next/link";

export const metadata = {
  title: "Zarbill — Invoicing for freelancers and small studios",
  description:
    "Create professional invoices, track who owes you, and get paid. Built for South African freelancers, creators and small studios. From R99/month.",
};

export default function Landing() {
  return (
    <>
      <style>{css}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div className="lp">
        <header className="lp-nav">
          <div className="lp-brand">
            <span className="lp-mark">Z</span>
            <span className="lp-name">Zarbill</span>
          </div>
          <nav className="lp-links">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login" className="lp-signin">Sign in</Link>
          </nav>
        </header>

        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">For South African freelancers &amp; small businesses</p>
            <h1>
              Send the invoice.<br />
              <em>Then get paid.</em>
            </h1>
            <p className="lp-sub">
              Zarbill turns your work into a professional invoice in under a minute —
              then keeps track of who has paid, who hasn&apos;t, and who is overdue.
              No spreadsheets. No forgotten follow-ups.
            </p>
            <div className="lp-cta">
              <Link href="/login" className="lp-btn-primary">Start free</Link>
              <a href="#pricing" className="lp-btn-ghost">See pricing</a>
            </div>
            <p className="lp-fineprint">
              Free plan includes 3 clients and 5 invoices. No card required.
            </p>
          </div>

          <div className="lp-hero-art" aria-hidden="true">
            <div className="lp-invoice">
              <div className="lp-inv-top">
                <div className="lp-inv-logo">Studio Kaya</div>
                <div className="lp-inv-meta">
                  <div className="lp-inv-label">INVOICE</div>
                  <div className="lp-inv-num">INV-1042</div>
                </div>
              </div>
              <div className="lp-inv-parties">
                <div>
                  <span>FROM</span>
                  <strong>Studio Kaya</strong>
                </div>
                <div>
                  <span>BILL TO</span>
                  <strong>Luminary Media</strong>
                </div>
              </div>
              <table className="lp-inv-tbl">
                <tbody>
                  <tr><td>Brand video — 90 sec</td><td>1</td><td>R 12 000.00</td></tr>
                  <tr><td>Social cutdowns</td><td>4</td><td>R 6 400.00</td></tr>
                  <tr><td>Colour grade</td><td>1</td><td>R 2 200.00</td></tr>
                </tbody>
              </table>
              <div className="lp-inv-total">
                <span>Total due</span>
                <strong>R 20 600.00</strong>
              </div>
              <div className="lp-inv-stamp">PAID</div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="how">
          <h2 className="lp-h2">Three steps, start to paid</h2>
          <ol className="lp-steps">
            <li>
              <span className="lp-step-n">01</span>
              <h3>Save your clients and services</h3>
              <p>
                Add a client once. Save the work you do most — a day rate, a retainer,
                an edit — with its price. You never type them twice.
              </p>
            </li>
            <li>
              <span className="lp-step-n">02</span>
              <h3>Build the invoice</h3>
              <p>
                Pick the client, pull in your saved services, and the totals, tax and
                due date fill themselves in. Preview it, then save it as a PDF.
              </p>
            </li>
            <li>
              <span className="lp-step-n">03</span>
              <h3>Track what you&apos;re owed</h3>
              <p>
                Every invoice sits in draft, unpaid, paid or overdue. Open the app and
                you know exactly where your money is.
              </p>
            </li>
          </ol>
        </section>

        <section className="lp-section lp-section-alt">
          <h2 className="lp-h2">Built for how you actually work</h2>
          <div className="lp-grid">
            <Feature title="Your branding, not ours">
              Your business name, address and bank details sit on every invoice. Set them once in
              Settings.
            </Feature>
            <Feature title="Rands or dollars">
              Bill local clients in ZAR and international clients in USD, GBP, EUR and more.
            </Feature>
            <Feature title="Overdue, flagged automatically">
              An unpaid invoice past its due date marks itself overdue. Nothing slips.
            </Feature>
            <Feature title="Tax and discounts handled">
              Set a default VAT rate and it applies to new invoices. Add a discount per invoice
              when you need to.
            </Feature>
            <Feature title="Works on your phone">
              Your data lives in your account, not your browser. Log in anywhere and it&apos;s there.
            </Feature>
            <Feature title="Save as PDF">
              Preview the finished invoice and export it, ready to email to your client.
            </Feature>
          </div>
        </section>

        <section className="lp-section" id="pricing">
          <h2 className="lp-h2">Pricing</h2>
          <p className="lp-lede">
            Start free. Upgrade when your business outgrows the limits.
          </p>
          <div className="lp-plans">
            <div className="lp-plan">
              <div className="lp-plan-name">Free</div>
              <div className="lp-plan-price">R0<span>/month</span></div>
              <ul>
                <li>3 clients</li>
                <li>5 invoices</li>
                <li>Saved services</li>
                <li>PDF export</li>
              </ul>
              <Link href="/login" className="lp-btn-ghost lp-btn-block">Create account</Link>
            </div>

            <div className="lp-plan lp-plan-featured">
              <div className="lp-plan-tag">Most popular</div>
              <div className="lp-plan-name">Pro</div>
              <div className="lp-plan-price">R99<span>/month</span></div>
              <p className="lp-plan-alt">or $18/month billed in USD</p>
              <ul>
                <li>Unlimited clients</li>
                <li>Unlimited invoices</li>
                <li>Unlimited saved services</li>
                <li>Multi-currency invoicing</li>
                <li>Custom business branding</li>
              </ul>
              <Link href="/login" className="lp-btn-primary lp-btn-block">Start free, upgrade later</Link>
            </div>

            <div className="lp-plan">
              <div className="lp-plan-name">Business</div>
              <div className="lp-plan-price">R699<span>/month</span></div>
              <p className="lp-plan-alt">or $49/month billed in USD</p>
              <ul>
                <li>Everything in Pro</li>
                <li>Team members (coming soon)</li>
                <li>Priority support</li>
              </ul>
              <Link href="/login" className="lp-btn-ghost lp-btn-block">Create account</Link>
            </div>
          </div>
          <p className="lp-fineprint lp-center">
            Prices include VAT where applicable. Cancel anytime — see our{" "}
            <Link href="/refund-policy">refund and cancellation policy</Link>.
            Payments are processed securely by Paystack.
          </p>
        </section>

        <section className="lp-closer">
          <h2>Your next invoice is a minute away.</h2>
          <Link href="/login" className="lp-btn-primary">Start free</Link>
        </section>

        <footer className="lp-footer">
          <div className="lp-foot-brand">
            <span className="lp-mark">Z</span>
            <span>Zarbill</span>
          </div>
          <nav className="lp-foot-links">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/refund-policy">Refunds &amp; Cancellation</Link>
            <Link href="/login">Sign in</Link>
          </nav>
          <p className="lp-foot-note">
            © {new Date().getFullYear()} Zarbill. Invoicing software for independent
            businesses. Built in Cape Town, South Africa.
          </p>
        </footer>
      </div>
    </>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lp-feature">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

const css = `
:root {
  --ink: #0a0a0d; --ink2: #111116; --ink3: #18181f;
  --line: rgba(255,255,255,0.08); --line2: rgba(255,255,255,0.14);
  --text: #f0f0f8; --muted: #8b8ba6; --muted2: #6e6e88;
  --green: #4fffb0; --cyan: #00d4ff; --violet: #b87dff;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--ink); color: var(--text); font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
.lp { overflow-x: hidden; }
.lp-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px; border-bottom: 1px solid var(--line);
  position: sticky; top: 0; background: rgba(10,10,13,0.82);
  backdrop-filter: blur(18px); z-index: 50;
}
.lp-brand { display: flex; align-items: center; gap: 11px; }
.lp-mark {
  width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--green), var(--cyan));
  color: var(--ink); font-weight: 800; font-size: 15px;
}
.lp-name { font-weight: 800; font-size: 18px; letter-spacing: -0.4px; }
.lp-links { display: flex; align-items: center; gap: 28px; font-size: 14px; color: var(--muted); }
.lp-links a:hover { color: var(--text); }
.lp-signin {
  border: 1px solid var(--line2); padding: 8px 16px; border-radius: 8px; color: var(--text) !important;
}
.lp-signin:hover { background: rgba(255,255,255,0.06); }
.lp-hero {
  display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 60px; align-items: center;
  max-width: 1180px; margin: 0 auto; padding: 90px 40px 100px;
}
.lp-eyebrow {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 2.4px;
  text-transform: uppercase; color: var(--green); margin: 0 0 22px;
}
.lp-hero h1 {
  font-size: clamp(42px, 5.6vw, 68px); line-height: 1.02; letter-spacing: -2px;
  font-weight: 800; margin: 0 0 24px;
}
.lp-hero h1 em {
  font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400;
  letter-spacing: -1px;
  background: linear-gradient(100deg, var(--green), var(--cyan));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.lp-sub { font-size: 17px; line-height: 1.7; color: var(--muted); max-width: 30em; margin: 0 0 32px; }
.lp-cta { display: flex; gap: 12px; flex-wrap: wrap; }
.lp-btn-primary {
  background: var(--green); color: var(--ink); font-weight: 700; font-size: 15px;
  padding: 14px 28px; border-radius: 10px; display: inline-block;
  box-shadow: 0 0 34px rgba(79,255,176,0.22); transition: transform .15s, box-shadow .15s;
}
.lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 46px rgba(79,255,176,0.36); }
.lp-btn-ghost {
  border: 1px solid var(--line2); padding: 14px 26px; border-radius: 10px;
  font-size: 15px; font-weight: 600; display: inline-block; transition: background .15s;
}
.lp-btn-ghost:hover { background: rgba(255,255,255,0.05); }
.lp-btn-block { display: block; text-align: center; width: 100%; }
.lp-fineprint { font-size: 12.5px; color: var(--muted2); margin-top: 18px; line-height: 1.7; }
.lp-fineprint a { color: var(--green); }
.lp-center { text-align: center; max-width: 620px; margin-left: auto; margin-right: auto; }
.lp-hero-art { perspective: 1400px; }
.lp-invoice {
  background: #fff; color: #111; border-radius: 14px; padding: 32px;
  transform: rotateY(-11deg) rotateX(4deg) rotate(1.4deg);
  box-shadow: 0 40px 90px rgba(0,0,0,0.6); position: relative;
  animation: lp-float 7s ease-in-out infinite;
}
@keyframes lp-float {
  0%,100% { transform: rotateY(-11deg) rotateX(4deg) rotate(1.4deg) translateY(0); }
  50%     { transform: rotateY(-11deg) rotateX(4deg) rotate(1.4deg) translateY(-12px); }
}
@media (prefers-reduced-motion: reduce) { .lp-invoice { animation: none; } }
.lp-inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
.lp-inv-logo { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 22px; }
.lp-inv-logo span { color: #22c87a; }
.lp-inv-meta { text-align: right; }
.lp-inv-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 3px; color: #999; }
.lp-inv-num { font-weight: 800; font-size: 17px; }
.lp-inv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 22px; }
.lp-inv-parties span { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; letter-spacing: 1.8px; color: #aaa; display: block; margin-bottom: 3px; }
.lp-inv-parties strong { font-size: 13.5px; }
.lp-inv-tbl { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
.lp-inv-tbl td { padding: 9px 0; border-bottom: 1px solid #f1f1f1; font-size: 12.5px; }
.lp-inv-tbl td:nth-child(2) { text-align: center; color: #888; width: 34px; }
.lp-inv-tbl td:last-child { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.lp-inv-total { display: flex; justify-content: space-between; align-items: baseline; border-top: 2px solid #111; padding-top: 13px; }
.lp-inv-total span { font-size: 13px; color: #666; }
.lp-inv-total strong { font-size: 19px; font-family: 'JetBrains Mono', monospace; }
.lp-inv-stamp {
  position: absolute; top: 30px; right: 34px; border: 3px solid #22c87a; color: #22c87a;
  font-weight: 800; font-size: 13px; letter-spacing: 2px; padding: 5px 14px; border-radius: 5px;
  transform: rotate(-13deg); opacity: .92;
}
.lp-section { max-width: 1120px; margin: 0 auto; padding: 90px 40px; }
.lp-section-alt { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); max-width: none; }
.lp-section-alt > * { max-width: 1120px; margin-left: auto; margin-right: auto; }
.lp-h2 {
  font-family: 'Instrument Serif', serif; font-weight: 400; font-size: clamp(30px, 3.6vw, 42px);
  letter-spacing: -0.8px; margin: 0 0 14px;
}
.lp-lede { color: var(--muted); font-size: 16px; margin: 0 0 40px; }
.lp-steps { list-style: none; padding: 0; margin: 38px 0 0; display: grid; grid-template-columns: repeat(3,1fr); gap: 34px; }
.lp-steps li { border-top: 1px solid var(--line2); padding-top: 20px; }
.lp-step-n { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--green); letter-spacing: 1.5px; }
.lp-steps h3 { font-size: 17px; margin: 12px 0 9px; letter-spacing: -0.3px; }
.lp-steps p { color: var(--muted); font-size: 14px; line-height: 1.75; margin: 0; }
.lp-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; margin-top: 38px; }
.lp-feature { background: var(--ink2); border: 1px solid var(--line); border-radius: 14px; padding: 24px; }
.lp-feature h3 { font-size: 15px; margin: 0 0 9px; letter-spacing: -0.2px; }
.lp-feature p { color: var(--muted); font-size: 13.5px; line-height: 1.7; margin: 0; }
.lp-plans { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; align-items: start; }
.lp-plan { background: var(--ink2); border: 1px solid var(--line); border-radius: 16px; padding: 28px; position: relative; }
.lp-plan-featured { border-color: rgba(79,255,176,0.34); background: linear-gradient(180deg, rgba(79,255,176,0.05), var(--ink2) 55%); }
.lp-plan-tag {
  position: absolute; top: -11px; left: 28px; background: var(--green); color: var(--ink);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  padding: 4px 11px; border-radius: 20px;
}
.lp-plan-name { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
.lp-plan-price { font-family: 'Instrument Serif', serif; font-size: 40px; line-height: 1; }
.lp-plan-price span { font-family: 'Syne', sans-serif; font-size: 14px; color: var(--muted); }
.lp-plan-alt { font-size: 12px; color: var(--muted2); margin: 7px 0 0; }
.lp-plan ul { list-style: none; padding: 0; margin: 22px 0; }
.lp-plan li { font-size: 13.5px; color: var(--muted); padding: 6px 0; padding-left: 20px; position: relative; }
.lp-plan li::before { content: ""; position: absolute; left: 0; top: 12px; width: 7px; height: 7px; border-radius: 2px; background: var(--green); }
.lp-closer { text-align: center; padding: 100px 40px; border-top: 1px solid var(--line); }
.lp-closer h2 {
  font-family: 'Instrument Serif', serif; font-weight: 400; font-size: clamp(28px, 4vw, 44px);
  letter-spacing: -1px; margin: 0 0 28px;
}
.lp-footer { border-top: 1px solid var(--line); padding: 40px; text-align: center; }
.lp-foot-brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; margin-bottom: 18px; }
.lp-foot-links { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; font-size: 13.5px; color: var(--muted); margin-bottom: 18px; }
.lp-foot-links a:hover { color: var(--green); }
.lp-foot-note { font-size: 12px; color: var(--muted2); margin: 0; line-height: 1.7; }
@media (max-width: 940px) {
  .lp-hero { grid-template-columns: 1fr; gap: 56px; padding: 60px 24px 70px; }
  .lp-hero-art { order: -1; }
  .lp-invoice { transform: none; animation: none; }
  .lp-steps, .lp-grid, .lp-plans { grid-template-columns: 1fr; }
  .lp-section { padding: 60px 24px; }
  .lp-nav { padding: 16px 20px; }
  .lp-links { gap: 16px; font-size: 13px; }
}
:focus-visible { outline: 2px solid var(--green); outline-offset: 3px; border-radius: 4px; }
`;
