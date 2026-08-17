// All formatting here must produce IDENTICAL output on the server (SSR) and
// the client (hydration), or React logs a hydration mismatch. Two host-
// dependent inputs are pinned explicitly rather than left to the runtime's
// defaults:
//   - timezone: `new Date('2026-08-30T00:00:00')` (no zone suffix) is parsed
//     as "local time in whatever process runs it" per the JS spec, and
//     Intl formatting without a `timeZone` option renders in that same
//     ambient local time — so a UTC server and a browser in another zone
//     can each get a different, self-consistent, but MUTUALLY DIFFERENT
//     answer for the same input. Every parse and every format below is
//     pinned to an explicit zone so there is no "ambient local time" left
//     to disagree on.
//   - locale grouping (fmtZAR): relies on ICU data for 'en-ZA' being
//     present and identical on both sides. Modern Node ships full ICU by
//     default, but rather than depend on that, the currency formatter below
//     is hand-rolled and has no ICU dependency at all.
const APP_TIME_ZONE = 'Africa/Johannesburg';

export function fmtZAR(amount: number | string | null | undefined): string {
  const n = Number(amount) || 0;
  const [intPart, decPart] = n.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `R${grouped},${decPart}`;
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // Date-only strings (YYYY-MM-DD) carry no time-of-day or timezone meaning
  // at all — they're a calendar date. Parse and format them both as UTC so
  // the calendar date shown never shifts based on either host's local zone.
  const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00Z' : dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // Backend timestamps are SQLite `datetime('now')` values ("YYYY-MM-DD
  // HH:MM:SS", always UTC, no zone marker) — append Z explicitly so parsing
  // doesn't fall back to ambient-local-time interpretation.
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return dateStr;
  // These are real appointment/event times tied to a South African
  // location, so they're shown in that timezone for every viewer — not
  // the viewer's own — which also happens to make SSR and CSR agree.
  return d.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  });
}

export function statusLabel(status: string | null | undefined): string {
  return String(status || '').replace(/_/g, ' ');
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
