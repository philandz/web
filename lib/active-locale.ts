/**
 * The UI locale for plain (non-hook) formatting helpers. A client component sets it while
 * rendering, before its children, so server and client renders format the same way.
 */
let active: string = "en";

export function setActiveLocale(locale: string) {
  active = locale;
}

export function getActiveLocale(): string {
  return active;
}
