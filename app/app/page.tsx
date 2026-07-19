import { requireTenant } from "@/lib/db/context";
import { listClients } from "@/lib/db/clients";
import { logOut } from "@/lib/auth/actions";

export default async function AppPage() {
  const { email, tenantId } = await requireTenant();
  const clients = await listClients();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0d", color: "#f0f0f8", padding: 40, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24 }}>Stack verified</h1>
          <form action={logOut}>
            <button style={{ padding: "10px 18px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>
              Log out
            </button>
          </form>
        </div>

        <div style={{ background: "#111116", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24, lineHeight: 1.9 }}>
          <p><strong>Logged in as:</strong> {email}</p>
          <p><strong>Your tenant id:</strong> <code style={{ color: "#4fffb0" }}>{tenantId}</code></p>
          <p><strong>Clients in your workspace:</strong> {clients.length}</p>
          <p style={{ color: "#9898b8", marginTop: 16, fontSize: 14 }}>
            If this shows your email, a tenant id, and 0 clients, every layer is working.
          </p>
        </div>
      </div>
    </div>
  );
}
