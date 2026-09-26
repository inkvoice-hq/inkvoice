import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

// Sends one short, personal welcome per new workspace. Never blocks the app.
export async function sendWelcomeEmail(tenantId: string, to: string | null) {
  if (!to) return;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tenants").select("welcome_sent, name").eq("id", tenantId).maybeSingle();
    const row = data as { welcome_sent?: boolean; name?: string | null } | null;
    if (!row || row.welcome_sent) return;

    // Flag first so a slow page load can't trigger two sends.
    await supabase.from("tenants").update({ welcome_sent: true } as any).eq("id", tenantId);

    const key = process.env.RESEND_API_KEY;
    if (!key) return;

    const html =
      '<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;color:#111;line-height:1.6">' +
      "<p>Hi,</p>" +
      "<p>I'm Wasfi. I built Zarbill, and I saw you just created an account &mdash; thank you.</p>" +
      "<p>It's a small operation: me, evenings and weekends, in Cape Town. So I'd genuinely like to know " +
      "what brought you here. What are you using to invoice at the moment, and what annoys you about it?</p>" +
      "<p>Just reply to this email. It comes straight to me, not a support queue.</p>" +
      '<p>If you want to dive in, your workspace is at <a href="https://zarbill.com/app">zarbill.com/app</a>. ' +
      "Adding a client first makes the first invoice quicker.</p>" +
      "<p>Wasfi<br/>Zarbill</p></div>";

    const resend = new Resend(key);
    await resend.emails.send({
      from: "Wasfi at Zarbill <support@zarbill.com>",
      replyTo: "support@zarbill.com",
      to,
      subject: "Welcome to Zarbill \u2014 one quick question",
      text:
        "Hi,\n\nI'm Wasfi. I built Zarbill, and I saw you just created an account - thank you.\n\n" +
        "It's a small operation: me, evenings and weekends, in Cape Town. So I'd genuinely like to know " +
        "what brought you here. What are you using to invoice at the moment, and what annoys you about it?\n\n" +
        "Just reply to this email. It comes straight to me, not a support queue.\n\n" +
        "If you want to dive in, your workspace is at https://zarbill.com/app - adding a client first makes " +
        "the first invoice quicker.\n\nWasfi\nZarbill",
      html,
    });
  } catch {
    // A welcome email should never break someone's first visit.
  }
}
