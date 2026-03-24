import { describe, it, expect } from "vitest";
import { cn, formatDate, formatCost } from "./utils";

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

describe("formatCost", () => {
  it("formats zero cost", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("rounds sub-cent costs up to $0.01", () => {
    expect(formatCost(0.001)).toBe("$0.01");
    expect(formatCost(0.005)).toBe("$0.01");
  });

  it("formats normal cent values", () => {
    expect(formatCost(0.05)).toBe("$0.05");
    expect(formatCost(0.99)).toBe("$0.99");
  });

  it("formats dollar values with two decimals", () => {
    expect(formatCost(1.5)).toBe("$1.50");
    expect(formatCost(12.345)).toBe("$12.35");
  });

  it("formats negative costs as $0.00", () => {
    expect(formatCost(-0.5)).toBe("$0.00");
  });
});
