// lib/statements.ts
// -----------------------------------------------------------------------------
// Reading payment-platform and bank statement CSVs into one simple shape.
// Runs in the browser (the file never leaves the user's machine until they
// confirm matches). Known layouts are detected automatically; anything else
// is mapped column-by-column by the user, with our best guesses pre-filled.
//
//   Wise      — "TransferWise ID, Date, Amount, Currency, Description,
//                Payment Reference, …, Payer Name, …, Total fees"
//               (Amount on a received transfer is already net of the fee)
//   PayPal    — Activity download: "Date, Time, TimeZone, Name, Type, Status,
//                Currency, Gross, Fee, Net, From Email Address, …,
//                Transaction ID, …"
//   Payoneer, Grey, FNB, Capitec, others — matched by column names.
// -----------------------------------------------------------------------------
import { parseCSV, parseDate, detectDateOrder } from "@/lib/csv";

export type SourceId = "auto" | "wise" | "paypal" | "payoneer" | "grey" | "fnb" | "capitec" | "bank";

export const SOURCES: { id: SourceId; label: string; hint: string }[] = [
  { id: "auto", label: "Detect automatically", hint: "" },
  { id: "payoneer", label: "Payoneer", hint: "Activity → Transactions → Download (CSV)" },
  { id: "wise", label: "Wise", hint: "Statements → choose balance → CSV" },
  { id: "paypal", label: "PayPal", hint: "Activity → Statements → Activity download (CSV)" },
  { id: "grey", label: "Grey", hint: "Account → Statement → Export CSV" },
  { id: "fnb", label: "FNB", hint: "Online banking → Transaction history → Download (CSV)" },
  { id: "capitec", label: "Capitec", hint: "Export transactions as CSV (or convert the PDF statement)" },
  { id: "bank", label: "Other bank", hint: "Any CSV with a date and an amount column" },
];

export type FieldKey =
  | "date" | "amount" | "money_in" | "currency" | "fee" | "net" | "payer"
  | "description" | "reference" | "status" | "type" | "id" | "converted";

export const FIELDS: { key: FieldKey; label: string; synonyms: string[] }[] = [
  { key: "date", label: "Date", synonyms: ["date", "transaction date", "posting date", "value date", "completed date", "date completed", "created on", "created", "booking date"] },
  { key: "amount", label: "Amount (+ in / − out)", synonyms: ["amount", "gross", "transaction amount", "amount received", "value", "credit amount"] },
  { key: "money_in", label: "Money in (if separate)", synonyms: ["money in", "credit", "credits", "deposit", "deposits", "paid in", "amount in", "in"] },
  { key: "currency", label: "Currency", synonyms: ["currency", "ccy", "currency code", "transaction currency"] },
  { key: "fee", label: "Fee", synonyms: ["total fees", "fee", "fees", "fee amount", "charges", "bank charges", "transaction fee"] },
  { key: "net", label: "Net (after fee)", synonyms: ["net", "net amount"] },
  { key: "payer", label: "Payer / from", synonyms: ["payer name", "payer", "name", "from", "sender", "sender name", "counterparty", "from name", "received from", "customer", "client"] },
  { key: "description", label: "Description", synonyms: ["description", "details", "narrative", "memo", "subject", "original description", "transaction details", "item title", "transaction description"] },
  { key: "reference", label: "Reference", synonyms: ["payment reference", "reference", "invoice number", "ref", "reference number", "note", "payment note"] },
  { key: "status", label: "Status", synonyms: ["status", "state", "transaction status"] },
  { key: "type", label: "Type", synonyms: ["type", "transaction type", "category"] },
  { key: "id", label: "Transaction ID", synonyms: ["transferwise id", "transaction id", "id", "transaction reference", "receipt id", "reference id", "transaction number"] },
  { key: "converted", label: "Amount in your currency (if shown)", synonyms: ["exchange to amount", "converted amount", "amount in zar", "zar amount", "local amount", "amount (zar)"] },
];

export type Mapping = Partial<Record<FieldKey, number>>;

export type ParsedStatement = {
  source: Exclude<SourceId, "auto">;
  headers: string[];
  rows: string[][];
  mapping: Mapping;
  amountIsNet: boolean;
  defaultCurrency: string;
};

const norm = (h: string) => h.toLowerCase().replace(/[#_\-.:()/]+/g, " ").replace(/\s+/g, " ").trim();

function findHeaderRow(all: string[][]): number {
  // Bank exports often start with account details; the header is the first
  // row that names a date column and a money column.
  for (let i = 0; i < Math.min(all.length, 25); i++) {
    const H = all[i].map(norm);
    const hasDate = H.some((h) => FIELDS[0].synonyms.includes(h));
    const hasMoney = H.some((h) => [...FIELDS[1].synonyms, ...FIELDS[2].synonyms].includes(h));
    if (hasDate && hasMoney) return i;
  }
  return 0;
}

export function guessMapping(headers: string[]): Mapping {
  const H = headers.map(norm);
  const out: Mapping = {};
  const used = new Set<number>();
  for (const pass of [0, 1]) {
    for (const f of FIELDS) {
      if (out[f.key] !== undefined) continue;
      const idx = H.findIndex((h, i) => !used.has(i) && f.synonyms.some((s) => (pass === 0 ? h === s : s.length > 3 && h.includes(s))));
      if (idx >= 0) { out[f.key] = idx; used.add(idx); }
    }
  }
  return out;
}

export function detectSource(headers: string[]): Exclude<SourceId, "auto"> {
  const H = headers.map(norm);
  const has = (s: string) => H.includes(s);
  if (has("transferwise id") || (has("payer name") && has("total fees"))) return "wise";
  if (has("gross") && has("net") && has("transaction id")) return "paypal";
  if (H.some((h) => h.includes("payoneer"))) return "payoneer";
  if (has("money in") || has("money out")) return "capitec";
  return "bank";
}

export function readStatement(text: string, chosen: SourceId, homeCurrency: string): ParsedStatement | null {
  const all = parseCSV(text);
  if (all.length < 2) return null;
  const h = findHeaderRow(all);
  const headers = all[h];
  const rows = all.slice(h + 1).filter((r) => r.some((c) => c.trim() !== ""));
  const source = chosen === "auto" ? detectSource(headers) : chosen;
  const mapping = guessMapping(headers);

  // Known layouts: make sure the right columns win.
  const col = (name: string) => headers.map(norm).indexOf(name);
  if (source === "wise") {
    for (const [k, n] of [["amount", "amount"], ["fee", "total fees"], ["payer", "payer name"], ["reference", "payment reference"], ["id", "transferwise id"], ["description", "description"]] as const) {
      if (col(n) >= 0) mapping[k] = col(n);
    }
  }
  if (source === "paypal") {
    for (const [k, n] of [["amount", "gross"], ["fee", "fee"], ["net", "net"], ["payer", "name"], ["id", "transaction id"], ["status", "status"], ["type", "type"], ["reference", "invoice number"]] as const) {
      if (col(n) >= 0) mapping[k] = col(n);
    }
    if (col("subject") >= 0) mapping.description = col("subject");
  }

  const bankLike = source === "fnb" || source === "capitec" || source === "bank";
  return {
    source, headers, rows, mapping,
    amountIsNet: source === "wise",
    defaultCurrency: bankLike ? homeCurrency : "USD",
  };
}

/** Signed amount: "-1,234.50", "(1 234,50)", "1234.50 Dr" → negative. */
export function parseSigned(raw: string | undefined): number | null {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  const neg = /^-|^\(.*\)$|\bdr\b|-$/i.test(s);
  s = s.replace(/[()]/g, "").replace(/\b(dr|cr)\b/gi, "").replace(/[^\d.,\-]/g, "").replace(/-/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (lastComma >= 0) s = /,\d{1,2}$/.test(s) && (s.match(/,/g) || []).length === 1 ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return Math.round((neg ? -n : n) * 100) / 100;
}

export type StatementLine = {
  key: string;
  date: string | null;
  payer: string;
  reference: string;
  text: string;        // everything searchable: payer + description + reference
  currency: string;
  gross: number;       // what the client sent, in `currency`
  fee: number;         // deducted by the platform, in `currency`
  net: number;         // gross − fee
  home: number | null; // amount in the account currency, if the statement shows it
  sourceRef: string;
};

export type Skipped = { row: number; reason: string; text: string };

const INTERNAL = /currency conversion|converted|conversion|withdraw|transfer to (your )?bank|to bank account|top ?up|refund|reversal|chargeback|hold on|release of hold|balance transfer|cashback/i;
const NOT_DONE = /pending|denied|declined|failed|cancel|reversed|refunded|unclaimed|on hold/i;

export function normaliseLines(st: ParsedStatement, mapping: Mapping, opts: { amountIsNet: boolean; currency: string; homeCurrency: string; dateOrder: "auto" | "dmy" | "mdy" | "ymd" }): { lines: StatementLine[]; skipped: Skipped[] } {
  const get = (r: string[], k: FieldKey) => (mapping[k] !== undefined && mapping[k]! >= 0 ? (r[mapping[k]!] ?? "").trim() : "");
  const order = opts.dateOrder === "auto"
    ? detectDateOrder(st.rows.slice(0, 200).map((r) => get(r, "date")))
    : opts.dateOrder;

  const lines: StatementLine[] = [];
  const skipped: Skipped[] = [];
  st.rows.forEach((r, i) => {
    const desc = get(r, "description"), type = get(r, "type"), status = get(r, "status");
    const payer = get(r, "payer"), reference = get(r, "reference");
    const text = [payer, desc, reference].filter(Boolean).join(" · ");

    let amt: number | null;
    if (mapping.money_in !== undefined && mapping.money_in >= 0 && get(r, "money_in")) amt = Math.abs(parseSigned(get(r, "money_in")) ?? 0);
    else amt = parseSigned(get(r, "amount"));
    if (amt === null || amt === 0) { if (text || get(r, "amount")) skipped.push({ row: i + 1, reason: "no amount", text }); return; }
    if (amt < 0) return; // money going out: not a client payment
    if (status && NOT_DONE.test(status)) { skipped.push({ row: i + 1, reason: "not completed (" + status + ")", text }); return; }
    if (INTERNAL.test(type + " " + desc)) { skipped.push({ row: i + 1, reason: "internal transfer / conversion", text }); return; }

    const fee = Math.abs(parseSigned(get(r, "fee")) ?? 0);
    const netCol = parseSigned(get(r, "net"));
    const gross = opts.amountIsNet ? Math.round((amt + fee) * 100) / 100 : amt;
    const net = netCol !== null && netCol > 0 ? netCol : Math.round((gross - fee) * 100) / 100;
    const cur = (get(r, "currency") || opts.currency || opts.homeCurrency).toUpperCase().slice(0, 3);
    const conv = parseSigned(get(r, "converted"));
    const date = parseDate(get(r, "date"), order);
    const id = get(r, "id");

    lines.push({
      key: "L" + i,
      date, payer, reference, text: text || "(no description)",
      currency: cur, gross, fee, net,
      home: cur === opts.homeCurrency ? net : conv && conv > 0 ? Math.abs(conv) : null,
      sourceRef: (id || [date, gross.toFixed(2), cur, (payer || desc || reference).slice(0, 60)].join("|")).slice(0, 200),
    });
  });
  return { lines, skipped };
}
