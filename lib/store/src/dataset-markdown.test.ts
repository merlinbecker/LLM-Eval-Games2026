import { describe, expect, it } from "vitest";
import {
  joinDatasetMarkdownItems,
  normalizeDatasetMarkdown,
  parseDatasetMarkdownItems,
  stripWrappingMarkdownCodeFence,
} from "./dataset-markdown";

describe("dataset markdown helpers", () => {
  it("strips a wrapping markdown code fence", () => {
    const content = "```markdown\n## Item 1\nHello\n```";
    expect(stripWrappingMarkdownCodeFence(content)).toBe("## Item 1\nHello");
  });

  it("leaves inner code fences untouched", () => {
    const content = "## Item 1\nUse:\n```ts\nconsole.log('x');\n```";
    expect(normalizeDatasetMarkdown(content)).toBe(content);
  });

  it("parses heading-based dataset items while preserving headings", () => {
    const content = "## Item 1\nFirst\n\n## Item 2\nSecond";
    expect(parseDatasetMarkdownItems(content)).toEqual([
      "## Item 1\nFirst",
      "## Item 2\nSecond",
    ]);
  });

  it("parses wrapped markdown content", () => {
    const content = "```md\n## Item 1\nFirst\n\n## Item 2\nSecond\n```";
    expect(parseDatasetMarkdownItems(content)).toHaveLength(2);
  });

  it("falls back to paragraph splitting without headings", () => {
    const content = "First paragraph\n\nSecond paragraph\n\nThird paragraph";
    expect(parseDatasetMarkdownItems(content)).toEqual([
      "First paragraph",
      "Second paragraph",
      "Third paragraph",
    ]);
  });

  it("returns an empty list for blank content", () => {
    expect(parseDatasetMarkdownItems("   ")).toEqual([]);
  });

  it("joins non-empty items with a blank line", () => {
    expect(joinDatasetMarkdownItems(["## Item 1\nFirst", "", "## Item 2\nSecond\n"])).toBe(
      "## Item 1\nFirst\n\n## Item 2\nSecond",
    );
  });
});