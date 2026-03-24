import { describe, it, expect } from "vitest";
import { cn, formatDate } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges tailwind conflicts correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2026-03-24T14:30:00.000Z");
    expect(result).toContain("2026");
    expect(result).toContain("Mar");
    expect(result).toContain("24");
  });

  it("includes time component", () => {
    const result = formatDate("2026-01-15T09:05:00.000Z");
    // Should contain hour/minute
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
