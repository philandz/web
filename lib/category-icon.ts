/** A category icon is an emoji; anything else (an old icon key such as "tag") falls back to the initial. */
export function categoryIcon(icon: string | undefined, name: string): string {
  const v = (icon ?? "").trim();
  if (v && !/^[A-Za-z0-9_\-\s]+$/.test(v)) return v;
  return (name.trim()[0] ?? "•").toUpperCase();
}

/** Case/accent-insensitive "same category" test used before creating one. */
export function sameCategoryName(a: string, b: string): boolean {
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  return n(a) === n(b);
}
