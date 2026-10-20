import { headers } from "next/headers";
import Link from "next/link";

export const metadata = {
  title: "Zarbill — From invoice sent to money received",
  description:
    "Invoicing for freelancers paid by clients abroad. Bill in dollars, pounds or euros, get paid, match the payment from Wise, Payoneer, PayPal or your bank, and see exactly what you earned after fees and exchange rates.",
};

export default async function Landing() {
  const h = await headers();
  const country = h.get("x-vercel-ip-country") || "ZA";
  const isZA = country === "ZA";
  const proPrice = isZA ? "R99" : "$18";
  const bizPrice = isZA ? "R699" : "$49";
  const freePrice = isZA ? "R0" : "$0";
  const altPro = "Billed monthly. Cancel anytime.";
  const altBiz = "Billed monthly. Cancel anytime.";

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
            <p className="lp-eyebrow">For freelancers and businesses</p>
            <h1>
              From invoice sent<br />
              <em>to money received.</em>
            </h1>
            <p className="lp-sub">
              Invoice in dollars, pounds or euros. Zarbill follows up for you, matches the
              payment when it lands in {isZA ? "Wise, Payoneer, PayPal or your FNB or Capitec account" : "Wise, Payoneer, PayPal or your bank"},
              and shows exactly what you earned in {isZA ? "rands" : "your own currency"}, after fees and exchange
              rates. Without the financial admin.
            </p>
            <div className="lp-cta">
              <Link href="/login?mode=signup" className="lp-btn-primary">Start free</Link>
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
                  <tr><td>Brand video — 90 sec</td><td>1</td><td>$1,200.00</td></tr>
                  <tr><td>Social cutdowns</td><td>4</td><td>$640.00</td></tr>
                  <tr><td>Colour grade</td><td>1</td><td>$220.00</td></tr>
                </tbody>
              </table>
              <div className="lp-inv-total">
                <span>Total due</span>
                <div className="lp-inv-stamp">PAID</div>
                <strong>$2,060.00</strong>
              </div>
              <div className="lp-landed">
                <div className="lp-landed-h">Matched from your {isZA ? "Payoneer" : "Wise"} statement</div>
                <div className="lp-landed-row"><span>Client paid</span><b>$2,060.00</b></div>
                <div className="lp-landed-row"><span>Fees</span><b>{isZA ? "−R 712.40" : "−€19.40"}</b></div>
                <div className="lp-landed-row lp-landed-tot"><span>Landed in your account</span><b>{isZA ? "R 33 186.20" : "€1,876.30"}</b></div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="how">
          <h2 className="lp-h2">Three steps, start to paid</h2>
          <ol className="lp-steps">
            <li>
              <span className="lp-step-n">01</span>
              <h3>Invoice in their currency</h3>
              <p>
                Set each client&apos;s currency once. Invoices, quotes and reminders go out in
                dollars, pounds or euros, with a Pay now link and a page that tells you when
                they&apos;ve opened it.
              </p>
            </li>
            <li>
              <span className="lp-step-n">02</span>
              <h3>Zarbill does the chasing</h3>
              <p>
                Reminders go out on their own, worded for each client. When something needs a
                personal touch, Claude drafts the email and you approve it.
              </p>
            </li>
            <li>
              <span className="lp-step-n">03</span>
              <h3>Match it, see what you earned</h3>
              <p>
                Upload your {isZA ? "Payoneer, Wise, PayPal or bank" : "Wise, Payoneer, PayPal or bank"} statement. Zarbill matches each payment to its
                invoice and records the fees and the {isZA ? "rands" : "money"} that actually landed. You just confirm.
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
            <Feature title={isZA ? "Rands or dollars" : "Any currency"}>
              {isZA ? "Bill local clients in ZAR and international clients in USD, GBP, EUR and more." : "Bill each client in the currency they pay in: USD, GBP, EUR and more."}
            </Feature>
            <Feature title="Reminders that know your client">
              Late invoice? Zarbill chases it for you, worded for each client: resent if they never
              opened it, softer for good payers, firmer for slow ones. Claude drafts personal
              follow-ups you approve.
            </Feature>
            <Feature title="Tax and discounts handled">
              Set a default VAT rate and it applies to new invoices. Add a discount per invoice
              when you need to.
            </Feature>
            <Feature title="Know what's coming in">
              A 30/60/90-day cash forecast based on how each client actually pays, plus what fees
              and exchange rates really cost you.
            </Feature>
            <Feature title="Quotes that become invoices">
              Send a quote, your client accepts it online, and it turns into an invoice in one
              click. Nothing to retype.
            </Feature>
            <Feature title="Get paid online">
              {isZA
                ? "Add your PayPal, Yoco, SnapScan or Paystack link and every invoice gets a Pay now button. Part-payments are tracked to the cent."
                : "Add your PayPal, Stripe or any payment link and every invoice gets a Pay now button. Part-payments are tracked to the cent."}
            </Feature>
            <Feature title="Recurring invoices">
              Monthly retainer? The next invoice creates and sends itself, on schedule, with
              reminders if it&apos;s late.
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
              <div className="lp-plan-price">{freePrice}<span>/month</span></div>
              <ul>
                <li>3 clients</li>
                <li>5 invoices</li>
                <li>Quotes, reminders &amp; Pay now links</li>
                <li>PDF and CSV export</li>
              </ul>
              <Link href="/login?mode=signup" className="lp-btn-ghost lp-btn-block">Create account</Link>
            </div>

            <div className="lp-plan lp-plan-featured">
              <div className="lp-plan-tag">Most popular</div>
              <div className="lp-plan-name">Pro</div>
              <div className="lp-plan-price">{proPrice}<span>/month</span></div>
              <p className="lp-plan-alt">{altPro}</p>
              <ul>
                <li>Unlimited clients</li>
                <li>Unlimited invoices</li>
                <li>Unlimited recurring invoices</li>
                <li>Multi-currency invoicing</li>
                <li>Custom business branding</li>
              </ul>
              <Link href="/login?mode=signup" className="lp-btn-primary lp-btn-block">Start free, upgrade later</Link>
            </div>

            <div className="lp-plan">
              <div className="lp-plan-name">Business</div>
              <div className="lp-plan-price">{bizPrice}<span>/month</span></div>
              <p className="lp-plan-alt">{altBiz}</p>
              <ul>
                <li>Everything in Pro</li>
                <li>Team members (coming soon)</li>
                <li>Priority support</li>
              </ul>
              <Link href="/login?mode=signup" className="lp-btn-ghost lp-btn-block">Create account</Link>
            </div>
          </div>
          <p className="lp-fineprint lp-center">
            Prices include VAT where applicable. Cancel anytime — see our{" "}
            <Link href="/refund-policy">refund and cancellation policy</Link>.
            Payments are processed securely by Paystack.
          </p>
        </section>

        <section className="lp-section lp-switch">
          <h2 className="lp-h2">Switching is painless</h2>
          <p className="lp-lede">
            Export your clients and invoices from Wave, Zoho, FreshBooks, QuickBooks or a spreadsheet as
            CSV, and import them in a couple of minutes. Already made an invoice with our{" "}
            <Link href="/free-invoice-generator">free generator</Link>? Save it to an account and it comes with you.
          </p>
        </section>

        <section className="lp-closer">
          <h2>Your next invoice is a minute away.</h2>
          <Link href="/login?mode=signup" className="lp-btn-primary">Start free</Link>
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
            businesses. {isZA ? "Built in Cape Town, South Africa." : ""}
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
.lp-inv-total { position: relative; }
.lp-inv-stamp {
  position: absolute; top: 4px; left: 92px; border: 3px solid #22c87a; color: #22c87a;
  font-weight: 800; font-size: 13px; letter-spacing: 2px; padding: 5px 14px; border-radius: 5px;
  transform: rotate(-13deg); opacity: .92;
}
.lp-landed { margin-top: 18px; background: #f3fbf7; border: 1px solid #c8eedb; border-radius: 10px; padding: 12px 14px; }
.lp-landed-h { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; letter-spacing: 1.6px; color: #1a9a5c; text-transform: uppercase; margin-bottom: 8px; }
.lp-landed-row { display: flex; justify-content: space-between; font-size: 12px; color: #555; padding: 2px 0; }
.lp-landed-row b { font-family: 'JetBrains Mono', monospace; font-weight: 500; color: #111; }
.lp-landed-tot { border-top: 1px solid #c8eedb; margin-top: 6px; padding-top: 7px; font-size: 13px; color: #111; }
.lp-landed-tot b { font-weight: 700; color: #0e7a47; }
.lp-section { max-width: 1120px; margin: 0 auto; padding: 90px 40px; }
.lp-section-alt {
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); max-width: none;
  /* full-width borders, but content lines up with the 1120px sections around it */
  padding-left: max(40px, calc((100% - 1040px) / 2));
  padding-right: max(40px, calc((100% - 1040px) / 2));
}
.lp-h2 {
  font-family: 'Instrument Serif', serif; font-weight: 400; font-size: clamp(30px, 3.6vw, 42px);
  letter-spacing: -0.8px; margin: 0 0 14px;
}
.lp-lede { color: var(--muted); font-size: 16px; margin: 0 0 40px; }
.lp-switch { padding-top: 0; }
.lp-switch .lp-lede { max-width: 46em; margin-bottom: 0; line-height: 1.7; }
.lp-switch a { color: var(--green); }
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
  .lp-hero { gap: 40px; padding-top: 40px; }
  .lp-invoice { transform: none; animation: none; }
  .lp-steps, .lp-grid, .lp-plans { grid-template-columns: 1fr; }
  .lp-section { padding: 60px 24px; }
  .lp-nav { padding: 16px 20px; }
  .lp-links { gap: 16px; font-size: 13px; }
}
:focus-visible { outline: 2px solid var(--green); outline-offset: 3px; border-radius: 4px; }
`;
