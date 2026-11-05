/**
 * Parses shorthand Vietnamese money input into whole đồng.
 *   "50k" -> 50_000      "1tr5" / "1.5tr" / "1,5tr" -> 1_500_000
 *   "2m"  -> 2_000_000   "2tr" -> 2_000_000   "1tỷ5" -> 1_500_000_000
 *   "120000" / "120.000" -> 120_000 (dots and commas between digit groups are separators)
 * Returns null for anything it cannot read, so callers keep the user's text untouched.
 */
const UNITS: Record<string, number> = {
  k: 1_000,
  nghin: 1_000,
  nghìn: 1_000,
  ngan: 1_000,
  ngàn: 1_000,
  tr: 1_000_000,
  m: 1_000_000,
  trieu: 1_000_000,
  triệu: 1_000_000,
  ty: 1_000_000_000,
  tỷ: 1_000_000_000,
  b: 1_000_000_000,
};

export function parseVnd(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "").replace(/[₫đ]$/u, "");
  if (!s) return null;

  // number + unit + optional tail digits: "1tr5" (tail = tenths of the unit)
  const m = /^(\d+(?:[.,]\d+)?)([a-zà-ỹ]+)(\d+)?$/u.exec(s);
  if (m) {
    const unit = UNITS[m[2]];
    if (!unit) return null;
    const base = Number(m[1].replace(",", "."));
    if (!Number.isFinite(base)) return null;
    const tail = m[3] ? Number(`0.${m[3]}`) : 0;
    return Math.round((base + tail) * unit);
  }

  // plain digits with thousands separators
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}
