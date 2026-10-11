"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordQuoteView, respondToQuote } from "@/lib/public-quote";

export function QuoteActions({ token, canRespond, clientName }: { token: string; canRespond: boolean; clientName: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(clientName);
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => { recordQuoteView(token).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [token]);

  function respond(answer: "accept" | "decline") {
    if (answer === "decline" && !confirm("Decline this quote?")) return;
    start(async () => {
      const r = await respondToQuote(token, answer, name);
      setMsg({ ok: r.ok, text: r.message });
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="hi-actions" style={{ flexDirection: "column", alignItems: "flex-end" }}>
      {msg && <div className={"hi-msg " + (msg.ok ? "ok" : "bad")} style={{ margin: 0 }}>{msg.text}</div>}
      <div className="hi-actions">
        {canRespond && !msg && (confirming ? (
          <>
            <input className="hi-accept-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" />
            <button className="hi-pay" disabled={pending} onClick={() => respond("accept")}>
              {pending ? "Accepting..." : "Confirm & accept"}
            </button>
          </>
        ) : (
          <>
            <button className="hi-pay" onClick={() => setConfirming(true)}>Accept quote</button>
            <button className="hi-decline" disabled={pending} onClick={() => respond("decline")}>Decline</button>
          </>
        ))}
        <button className={"hi-btn" + (canRespond ? " hi-btn-ghost" : "")} onClick={() => window.print()}>Download PDF</button>
      </div>
    </div>
  );
}
