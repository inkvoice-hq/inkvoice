import Link from "next/link";

export function LegalPage({ title, updated, children }: {
  title: string; updated: string; children: React.ReactNode;
}) {
  return (
    <>
      <style>{css}</style>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet" />
      <div className="lg">
        <header className="lg-nav">
          <Link href="/" className="lg-brand">
            <span className="lg-mark">I</span><span>Zarbill</span>
          </Link>
          <Link href="/login" className="lg-signin">Sign in</Link>
        </header>
        <main className="lg-main">
          <h1>{title}</h1>
          <p className="lg-updated">Last updated: {updated}</p>
          {children}
        </main>
        <footer className="lg-footer">
          <nav>
            <Link href="/">Home</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refund-policy">Refunds</Link>
          </nav>
          <p>© {new Date().getFullYear()} Zarbill. Cape Town, South Africa.</p>
        </footer>
      </div>
    </>
  );
}

const css = `
:root { --ink:#0a0a0d; --line:rgba(255,255,255,0.08); --text:#f0f0f8; --muted:#8b8ba6; --green:#4fffb0; --cyan:#00d4ff; }
* { box-sizing:border-box; }
body { margin:0; background:var(--ink); color:var(--text); font-family:'Syne',sans-serif; -webkit-font-smoothing:antialiased; }
a { color:inherit; text-decoration:none; }
.lg-nav { display:flex; align-items:center; justify-content:space-between; padding:20px 40px; border-bottom:1px solid var(--line); }
.lg-brand { display:flex; align-items:center; gap:10px; font-weight:800; font-size:17px; }
.lg-mark { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; background:linear-gradient(135deg,var(--green),var(--cyan)); color:var(--ink); font-size:14px; }
.lg-signin { border:1px solid rgba(255,255,255,0.14); padding:7px 15px; border-radius:8px; font-size:13.5px; }
.lg-signin:hover { background:rgba(255,255,255,0.06); }
.lg-main { max-width:720px; margin:0 auto; padding:64px 24px 80px; }
.lg-main h1 { font-family:'Instrument Serif',serif; font-weight:400; font-size:clamp(30px,4.4vw,42px); letter-spacing:-0.8px; margin:0 0 8px; }
.lg-updated { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); letter-spacing:1px; margin:0 0 44px; }
.lg-main h2 { font-size:17px; font-weight:700; margin:38px 0 12px; letter-spacing:-0.2px; }
.lg-main p, .lg-main li { color:var(--muted); font-size:14.5px; line-height:1.85; }
.lg-main p { margin:0 0 14px; }
.lg-main ul { padding-left:20px; margin:0 0 14px; }
.lg-main li { margin-bottom:7px; }
.lg-main strong { color:var(--text); font-weight:600; }
.lg-main a { color:var(--green); }
.lg-footer { border-top:1px solid var(--line); padding:34px 24px; text-align:center; }
.lg-footer nav { display:flex; gap:22px; justify-content:center; flex-wrap:wrap; font-size:13px; color:var(--muted); margin-bottom:14px; }
.lg-footer nav a:hover { color:var(--green); }
.lg-footer p { font-size:12px; color:#6e6e88; margin:0; }
@media (max-width:640px){ .lg-nav{padding:16px 20px;} }
:focus-visible { outline:2px solid var(--green); outline-offset:3px; }
`;
