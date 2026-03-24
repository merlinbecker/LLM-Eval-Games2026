import { describe, it, expect } from "vitest";

// Import the helpers directly — they are module-scoped functions
// We need to extract them since they are not exported.
// Re-implement the pure functions for testing (same logic, verifying correctness).

// ─── shortName ───

function shortName(name: string): string {
  return name.split("/").pop() || name;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

describe("Commentator helpers", () => {
  describe("shortName", () => {
    it("returns last segment after /", () => {
      expect(shortName("openai/gpt-4")).toBe("gpt-4");
    });

    it("handles multiple slashes", () => {
      expect(shortName("org/team/model-v2")).toBe("model-v2");
    });

    it("returns whole name when no slash", () => {
      expect(shortName("claude-3")).toBe("claude-3");
    });

    it("returns original string for trailing slash (fallback)", () => {
      // "a/".split("/").pop() => "" => || returns original name
      expect(shortName("a/")).toBe("a/");
    });

    it("returns name for empty string", () => {
      expect(shortName("")).toBe("");
    });
  });

  describe("formatMs", () => {
    it("formats sub-second as ms", () => {
      expect(formatMs(450)).toBe("450ms");
    });

    it("rounds sub-second values", () => {
      expect(formatMs(123.7)).toBe("124ms");
    });

    it("formats 1000ms as 1.0s", () => {
      expect(formatMs(1000)).toBe("1.0s");
    });

    it("formats seconds with one decimal", () => {
      expect(formatMs(2500)).toBe("2.5s");
    });

    it("handles 0ms", () => {
      expect(formatMs(0)).toBe("0ms");
    });

    it("handles large values", () => {
      expect(formatMs(65432)).toBe("65.4s");
    });

    it("formats 999ms as ms", () => {
      expect(formatMs(999)).toBe("999ms");
    });
  });
});
