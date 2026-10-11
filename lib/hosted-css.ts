// Shared styles for the public invoice (/i) and quote (/q) pages.
export const hostedCss = `
body { background: #eef0f3 !important; }
.hi-wrap { min-height: 100vh; padding: 28px 16px 48px; font-family: 'Syne', system-ui, sans-serif; color: #111; }
.hi-bar { max-width: 820px; margin: 0 auto 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.hi-bar-title { font-size: 13px; color: #555; }
.hi-bar-amt { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 2px; }
.hi-pill { font-size: 11px; font-weight: 600; padding: 4px 11px; border-radius: 20px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.3px; }
.hi-due { background: #fff4d6; color: #8a6200; }
.hi-over { background: #ffe1e1; color: #b42318; }
.hi-paid { background: #d9fbe9; color: #067647; }
.hi-btn { background: #111; color: #fff; border: none; border-radius: 9px; padding: 12px 22px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
.hi-btn:hover { background: #333; }
.hi-paper { position: relative; overflow: hidden; max-width: 820px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 10px 40px rgba(16,24,40,0.08); padding: 48px 52px; font-size: 13px; }
.hi-stamp { position: absolute; top: 170px; right: 60px; transform: rotate(-14deg); border: 4px solid #12b76a; color: #12b76a; font-size: 34px; font-weight: 800; letter-spacing: 6px; padding: 4px 18px; border-radius: 8px; opacity: 0.55; pointer-events: none; }
.hi-top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 34px; }
.hi-logo { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 28px; margin-bottom: 8px; }
.hi-logo-img { max-height: 60px; max-width: 220px; display: block; margin-bottom: 10px; }
.hi-small { font-size: 12px; color: #666; line-height: 1.7; }
.hi-meta { text-align: right; }
.hi-kicker, .hi-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2.5px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
.hi-num { font-size: 22px; font-weight: 800; margin: 2px 0 8px; }
.hi-billto { margin-bottom: 24px; }
.hi-project { margin-bottom: 20px; color: #444; }
.hi-tbl-wrap { overflow-x: auto; }
.hi-tbl { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
.hi-tbl th { background: #f6f7f9; padding: 10px 13px; font-size: 10px; letter-spacing: 1.4px; color: #888; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; text-align: left; font-weight: 500; }
.hi-tbl td { padding: 11px 13px; border-bottom: 1px solid #f0f1f3; }
.hi-tbl .c { text-align: center; } .hi-tbl .r { text-align: right; white-space: nowrap; }
.hi-totals { max-width: 280px; margin-left: auto; }
.hi-totals div { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f0f1f3; }
.hi-totals .hi-paidrow { color: #067647; }
.hi-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.hi-pay { background: #12b76a; color: #fff; border-radius: 9px; padding: 12px 22px; font-size: 14px; font-weight: 700; text-decoration: none; font-family: inherit; display: inline-flex; align-items: center; }
.hi-pay:hover { background: #0e9f5c; }
.hi-btn-ghost { background: #fff; color: #111; border: 1px solid #d0d5dd; }
.hi-btn-ghost:hover { background: #f6f7f9; }
.hi-totals .hi-grand { font-size: 17px; font-weight: 800; border-bottom: none; border-top: 2px solid #111; padding-top: 12px; margin-top: 4px; }
.hi-notes { margin-top: 30px; padding: 18px; background: #f6f7f9; border-radius: 10px; font-size: 13px; color: #444; line-height: 1.7; }
.hi-footer { margin-top: 30px; padding-top: 18px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }
.hi-after { max-width: 820px; margin: 22px auto 0; text-align: center; font-size: 13px; color: #555; }
.hi-after a { color: #111; font-weight: 600; }
.hi-powered { font-size: 12px; color: #888; margin-top: 10px; }
.hi-preview { max-width: 820px; margin: 0 auto 14px; background: #fff4d6; color: #8a6200; border-radius: 10px; padding: 10px 14px; font-size: 13px; }
.hi-decline { background: none; border: none; color: #667085; text-decoration: underline; cursor: pointer; font-size: 13px; font-family: inherit; padding: 12px 6px; }
.hi-msg { max-width: 820px; margin: 0 auto 14px; border-radius: 10px; padding: 12px 16px; font-size: 14px; }
.hi-msg.ok { background: #d9fbe9; color: #067647; }
.hi-msg.bad { background: #ffe1e1; color: #b42318; }
.hi-accept-name { padding: 11px 12px; border: 1px solid #d0d5dd; border-radius: 9px; font-size: 14px; font-family: inherit; min-width: 180px; }
@media (max-width: 640px) {
  .hi-paper { padding: 28px 20px; }
  .hi-top { flex-direction: column; }
  .hi-meta { text-align: left; }
  .hi-stamp { top: 120px; right: 20px; font-size: 26px; }
  .hi-bar-amt { font-size: 22px; }
  .hi-btn, .hi-pay { width: 100%; justify-content: center; }
  .hi-actions { width: 100%; }
  .hi-tbl th, .hi-tbl td { padding: 10px 6px; }
  .hi-tbl .hide-sm { display: none; }
  .hi-totals { max-width: none; }
}
@media print {
  body { background: #fff !important; }
  .hi-wrap { padding: 0; }
  .hi-bar, .hi-after { display: none !important; }
  .hi-paper { box-shadow: none; border-radius: 0; padding: 0; max-width: none; }
}
`;
