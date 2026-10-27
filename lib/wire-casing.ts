/**
 * Wire-key translation for the gateway's portfolio module.
 *
 * The portfolio routes are the only ones where the gateway deserialises the
 * request body straight into the protobuf message and serialises the response
 * message straight back out (`gateway/src/portfolio/mod.rs`). The wire format
 * is therefore the protobuf field names: snake_case keys, numeric enums.
 *
 * Every other service in the web talks to the gateway in snake_case as well
 * (`budget_type`, `expense_date`, …) and maps to camelCase domain objects in
 * the service layer — this module is the same idea, applied to the portfolio
 * service.
 *
 * `snakeToCamel` is applied to responses, `camelToSnake` to request bodies.
 */

/** `total_current_value` → `totalCurrentValue` */
export function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

/** `totalCurrentValue` → `total_current_value` */
export function camelToSnakeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively converts snake_case object keys to camelCase.
 *
 * Values are left untouched — in particular a JSON string that happens to
 * contain snake_case keys (a `metadata_json` payload) stays a string.
 */
export function snakeToCamel<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((v) => snakeToCamel(v)) as unknown as T;
  }
  if (!isPlainObject(value)) {
    return value as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[snakeToCamelKey(key)] = snakeToCamel(v);
  }
  return out as unknown as T;
}

/**
 * Recursively converts camelCase object keys to snake_case.
 *
 * `undefined` values are dropped so they never reach the wire: the gateway
 * rejects a body with a missing required field, and `undefined` is not the
 * same as an explicit empty string.
 */
export function camelToSnake<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((v) => camelToSnake(v)) as unknown as T;
  }
  if (!isPlainObject(value)) {
    return value as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v === undefined) continue;
    out[camelToSnakeKey(key)] = camelToSnake(v);
  }
  return out as unknown as T;
}
