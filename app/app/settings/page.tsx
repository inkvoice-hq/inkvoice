import { getTenant } from "@/lib/db/tenant";
import { SettingsView } from "./SettingsView";

export default async function SettingsPage() {
  const tenant = await getTenant();
  if (!tenant) return <div style={{ padding: 32, color: "#f0f0f8" }}>Workspace not found.</div>;
  return <SettingsView tenant={tenant} />;
}
