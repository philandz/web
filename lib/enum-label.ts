/**
 * Normalises backend enum values into the canonical lowercase unions the UI uses.
 *
 * A backend may hand the same enum over in several shapes:
 *   - the numeric protobuf code            -> 2
 *   - the canonical lowercase label        -> "saving"
 *   - the Rust variant name                -> "Saving"
 *   - the protobuf enum name               -> "BUDGET_TYPE_SAVING"
 *   - the numeric code as a string         -> "2"
 *
 * Labels are matched case-insensitively and an enum-name prefix is tolerated,
 * so every shape above collapses onto the same union member. Anything that
 * cannot be mapped falls back to the spec's default instead of leaking an
 * unknown value into the UI.
 */
export interface EnumLabelSpec<T extends string> {
  /** Numeric (protobuf) codes mapped to their label. */
  numeric: Record<number, T>;
  /** Canonical lowercase labels the UI knows about. */
  labels: readonly T[];
  /** Value used when the input cannot be mapped. */
  fallback: T;
}

export function normalizeEnumLabel<T extends string>(
  value: number | string | null | undefined,
  spec: EnumLabelSpec<T>,
): T {
  if (typeof value === "number") return spec.numeric[value] ?? spec.fallback;
  if (typeof value !== "string") return spec.fallback;

  const trimmed = value.trim();
  if (!trimmed) return spec.fallback;

  // Some JSON payloads carry the numeric code as a string.
  if (/^\d+$/.test(trimmed)) return spec.numeric[Number(trimmed)] ?? spec.fallback;

  const key = trimmed.toLowerCase().replace(/[\s-]+/g, "_");
  const labels = new Set<string>(spec.labels);
  if (labels.has(key)) return key as T;

  // Tolerate an enum-name prefix: "BUDGET_TYPE_STANDARD" -> "standard".
  const tail = key.slice(key.lastIndexOf("_") + 1);
  if (labels.has(tail)) return tail as T;

  return spec.fallback;
}
