// lib/csv.ts — small, dependency-free CSV reader/writer (RFC 4180 style).
// Handles quoted fields, embedded commas/newlines, "" escapes, CRLF, a UTF-8
// BOM, and comma / semicolon / tab delimited files (auto-detected).

export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => (firstLine.match(new RegExp("\\" + ch, "g")) || []).length;
  const delim = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0] || ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") { inQuotes = true; continue; }
    if (c === delim) { row.push(field); field = ""; continue; }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((f) => f.trim()));
}

/** CSV text with a BOM so Excel opens UTF-8 (R, €, é) correctly. */
export function toCSV(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Stop spreadsheet formula injection from text fields (numbers stay numbers).
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** "R 1 234,56", "$1,234.56", "(1,234)" -> 1234.56 / 1234 */
export function parseAmount(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[()]/g, "").replace(/[^\d.,\-]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = /,\d{1,2}$/.test(s) && (s.match(/,/g) || []).length === 1 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(Math.round(n * 100) / 100) : null;
}

export type DateOrder = "auto" | "ymd" | "dmy" | "mdy";
const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function iso(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return dt.toISOString().slice(0, 10);
}

/** Works out whether a column of slash dates is day-first or month-first. */
export function detectDateOrder(samples: string[]): Exclude<DateOrder, "auto"> {
  let dmy = 0, mdy = 0;
  for (const s of samples) {
    const m = String(s).trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    if (+m[2] > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

export function parseDate(raw: string | null | undefined, order: Exclude<DateOrder, "auto"> = "dmy"): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) return order === "mdy" ? iso(+m[3], +m[1], +m[2]) : iso(+m[3], +m[2], +m[1]);
  // "12 Oct 2026", "Oct 12, 2026", "12-Oct-26"
  m = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,})[\s\-,]+(\d{2,4})/);
  if (m) { const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); if (mo >= 0) return iso(+m[3], mo + 1, +m[1]); }
  m = s.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{2,4})/);
  if (m) { const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); if (mo >= 0) return iso(+m[3], mo + 1, +m[2]); }
  return null;
}
