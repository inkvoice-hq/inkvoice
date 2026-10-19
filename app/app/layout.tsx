import { requireTenant } from "@/lib/db/context";
import { applyRegionDefaults } from "@/lib/region";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { createClient } from "@/lib/supabase/server";
import { logOut } from "@/lib/auth/actions";
import { NavLink } from "@/components/NavLink";
import Link from "next/link";
import { DraftImporter } from "@/components/DraftImporter";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { tenantId, email } = await requireTenant();
  await applyRegionDefaults(tenantId);
  await sendWelcomeEmail(tenantId, email ?? null);

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, plan")
    .eq("id", tenantId)
    .maybeSingle();

  const bizName = tenant?.name || "Your Business";
  const plan = (tenant?.plan || "free").toUpperCase();
  const initial = (bizName[0] || "Y").toUpperCase();

  return (
    <>
      <style>{shellCss}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <div className="ink-ambient" />
      <div className="ink-shell">
        <nav className="ink-sidebar">
          <div className="ink-brand">
            <div className="ink-brand-mark">
              <div className="ink-brand-icon">Z</div>
              <div>
                <div className="ink-brand-name">Zarbill</div>
                <span className="ink-brand-tag">Tax-ready invoicing</span>
              </div>
            </div>
          </div>

          <div className="ink-nav-section">
            <div className="ink-nav-label">Main</div>
            <NavLink href="/app" exact icon="grid">Dashboard</NavLink>
            <NavLink href="/app/invoices" icon="file">Invoices</NavLink>
            <NavLink href="/app/quotes" icon="quote">Quotes</NavLink>
            <NavLink href="/app/reconcile" icon="bank">Match payments</NavLink>
            <NavLink href="/app/follow-ups" icon="bell">Follow-ups</NavLink>
            <NavLink href="/app/insights" icon="chart">Insights</NavLink>
            <NavLink href="/app/clients" icon="users">Clients</NavLink>
            <NavLink href="/app/products" icon="cart">Products</NavLink>
          </div>

          <div className="ink-nav-section">
            <div className="ink-nav-label">System</div>
            <NavLink href="/app/settings" icon="gear">Settings</NavLink>
            <NavLink href="/app/upgrade" icon="cart">Billing &amp; Plan</NavLink>
            <NavLink href="/app/account" icon="user">Account</NavLink>
          </div>

          <div className="ink-sidebar-bottom">
            <div className="ink-user-row">
              <Link href="/app/account" className="ink-user-chip" title="Account and password">
                <div className="ink-user-avatar">{initial}</div>
                <div className="ink-user-info">
                  <div className="ink-user-name">{bizName}</div>
                  <div className="ink-user-plan">{plan} · account</div>
                </div>
              </Link>
              <form action={logOut}>
                <button className="ink-logout" type="submit" title="Log out" aria-label="Log out">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </form>
            </div>
          </div>
        </nav>

        <div className="ink-main">{children}</div>
        <DraftImporter />
      </div>
    </>
  );
}

const shellCss = `
:root {
  --ink: #0a0a0d; --ink2: #111116; --ink3: #18181f; --ink4: #222230;
  --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
  --text: #f0f0f8; --muted: #6e6e88; --muted2: #9898b8;
  --electric: #4fffb0; --electric2: #00d4ff; --electric3: #ff6b6b;
  --gold: #ffc940; --violet: #b87dff;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--ink); color: var(--text); font-family: 'Syne', sans-serif; }
.ink-ambient {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 600px 400px at 20% 10%, rgba(79,255,176,0.04), transparent 70%),
    radial-gradient(ellipse 400px 600px at 80% 90%, rgba(0,212,255,0.04), transparent 70%);
}
.ink-shell { display: flex; min-height: 100vh; position: relative; z-index: 1; }
.ink-sidebar {
  width: 260px; min-height: 100vh; background: var(--ink2);
  border-right: 1px solid var(--border); display: flex; flex-direction: column;
  position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
}
.ink-brand { padding: 28px 24px 24px; border-bottom: 1px solid var(--border); }
.ink-brand-mark { display: flex; align-items: center; gap: 12px; }
.ink-brand-icon {
  width: 36px; height: 36px; background: linear-gradient(135deg, var(--electric), var(--electric2));
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800; color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.3);
}
.ink-brand-name {
  font-size: 20px; font-weight: 800; letter-spacing: -0.5px;
  background: linear-gradient(90deg, var(--text), var(--muted2));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.ink-brand-tag {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--electric);
  letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; display: block;
}
.ink-nav-section { padding: 20px 12px 8px; }
.ink-nav-label {
  font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted);
  letter-spacing: 2px; text-transform: uppercase; padding: 0 12px; margin-bottom: 6px;
}
.ink-nav-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px;
  color: var(--muted2); cursor: pointer; transition: all 0.15s; font-size: 14px;
  font-weight: 500; position: relative; margin-bottom: 1px; text-decoration: none;
}
.ink-nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
.ink-nav-item.active { background: rgba(79,255,176,0.08); color: var(--electric); }
.ink-nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 20%; bottom: 20%; width: 3px;
  background: var(--electric); border-radius: 0 2px 2px 0;
}
.ink-nav-item svg { width: 17px; height: 17px; flex-shrink: 0; }
.ink-sidebar-bottom { margin-top: auto; padding: 16px 12px; border-top: 1px solid var(--border); }
.ink-user-chip {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
  cursor: pointer; transition: background 0.15s; width: 100%; background: none;
  border: none; text-align: left; font-family: 'Syne', sans-serif;
}
.ink-user-chip:hover { background: rgba(255,255,255,0.04); }
a.ink-user-chip { text-decoration: none; min-width: 0; }
.ink-user-row { display: flex; align-items: center; gap: 4px; }
.ink-logout { background: none; border: none; color: var(--muted); cursor: pointer; padding: 9px; border-radius: 8px; display: flex; }
.ink-logout:hover { background: rgba(255,107,107,0.1); color: var(--electric3); }
.ink-logout svg { width: 17px; height: 17px; }
.ink-user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, var(--violet), var(--electric2));
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.ink-user-info { flex: 1; min-width: 0; }
.ink-user-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ink-user-plan { font-size: 10px; color: var(--electric); font-family: 'JetBrains Mono', monospace; }
.ink-draft-toast {
  position: fixed; right: 20px; bottom: 20px; z-index: 300; max-width: 460px;
  display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 12px;
  background: #102a1f; border: 1px solid rgba(79,255,176,0.4); color: var(--text); font-size: 13px; line-height: 1.5;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}
.ink-draft-toast a { color: var(--electric); font-weight: 700; white-space: nowrap; text-decoration: none; }
.ink-draft-toast button { background: none; border: none; color: var(--muted2); font-size: 18px; cursor: pointer; }
.ink-main { margin-left: 260px; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
@media (max-width: 900px) {
  .ink-sidebar { width: 68px; }
  .ink-brand-name, .ink-brand-tag, .ink-nav-item span, .ink-nav-label, .ink-user-info { display: none; }
  .ink-user-row { flex-direction: column; }
  .ink-main { margin-left: 68px; }
}
`;
