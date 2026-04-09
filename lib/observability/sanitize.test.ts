import { describe, expect, it } from "vitest";

import { sanitizeObservabilityContext, sanitizeObservabilityValue } from "@/lib/observability/sanitize";

describe("sanitizeObservabilityValue", () => {
  it("redacts sensitive keys", () => {
    const result = sanitizeObservabilityContext({
      authorization: "Bearer abc",
      password: "secret",
      nested: {
        token: "xyz"
      }
    });

    expect(result).toEqual({
      authorization: "[REDACTED]",
      password: "[REDACTED]",
      nested: {
        token: "[REDACTED]"
      }
    });
  });

  it("redacts bearer token in free text", () => {
    const result = sanitizeObservabilityValue("Request failed: Bearer top-secret-token");
    expect(result).toBe("Request failed: Bearer [REDACTED]");
  });

  it("truncates deeply nested values", () => {
    const result = sanitizeObservabilityValue({
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  secret: "x"
                }
              }
            }
          }
        }
      }
    });

    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  truncated: true
                }
              }
            }
          }
        }
      }
    });
  });
});
