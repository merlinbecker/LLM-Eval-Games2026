import { describe, it, expect } from "vitest";
import { cn, formatDate, formatCost, shortName, formatMs, parseDatasetItems } from "./utils";

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

describe("shortName", () => {
  it("extracts the last segment after /", () => {
    expect(shortName("openai/gpt-4")).toBe("gpt-4");
  });

  it("handles multiple slashes", () => {
    expect(shortName("org/provider/model-name")).toBe("model-name");
  });

  it("returns the original name if no slash", () => {
    expect(shortName("gpt-4")).toBe("gpt-4");
  });

  it("returns the original name for empty result", () => {
    expect(shortName("trailing/")).toBe("trailing/");
  });
});

describe("formatMs", () => {
  it("formats sub-second durations in ms", () => {
    expect(formatMs(500)).toBe("500ms");
    expect(formatMs(0)).toBe("0ms");
    expect(formatMs(999)).toBe("999ms");
  });

  it("formats durations >= 1s in seconds", () => {
    expect(formatMs(1000)).toBe("1.0s");
    expect(formatMs(1500)).toBe("1.5s");
    expect(formatMs(12345)).toBe("12.3s");
  });

  it("rounds sub-second values", () => {
    expect(formatMs(499.7)).toBe("500ms");
  });
});

describe("parseDatasetItems", () => {
  it("splits by ## headings", () => {
    const content = "## Question 1\nWhat is AI?\n\n## Question 2\nWhat is ML?";
    const items = parseDatasetItems(content);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain("Question 1");
    expect(items[1]).toContain("Question 2");
  });

  it("splits by double newlines when no headings", () => {
    const content = "First paragraph\n\nSecond paragraph\n\nThird paragraph";
    const items = parseDatasetItems(content);
    expect(items).toHaveLength(3);
  });

  it("returns entire content as single item if no separators", () => {
    const content = "Single block of text";
    const items = parseDatasetItems(content);
    expect(items).toHaveLength(1);
    expect(items[0]).toBe("Single block of text");
  });

  it("strips a wrapping markdown fence", () => {
    const content = "```markdown\n## Question 1\nWhat is AI?\n```";
    const items = parseDatasetItems(content);
    expect(items).toEqual(["## Question 1\nWhat is AI?"]);
  });

  it("returns an empty list for blank content", () => {
    expect(parseDatasetItems("   ")).toEqual([]);
  });
});
