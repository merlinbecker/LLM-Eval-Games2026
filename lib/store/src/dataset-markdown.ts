export interface DatasetMarkdownOptions {
  stripWrappingCodeFence?: boolean;
}

function hasMarkdownHeading(content: string): boolean {
  return /^## /m.test(content);
}

export function stripWrappingMarkdownCodeFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i);
  return match ? match[1].trim() : trimmed;
}

export function normalizeDatasetMarkdown(
  content: string,
  options: DatasetMarkdownOptions = {},
): string {
  const { stripWrappingCodeFence = true } = options;
  const normalized = stripWrappingCodeFence
    ? stripWrappingMarkdownCodeFence(content)
    : content.trim();
  return normalized.trim();
}

export function parseDatasetMarkdownItems(
  content: string,
  options: DatasetMarkdownOptions = {},
): string[] {
  const normalized = normalizeDatasetMarkdown(content, options);
  if (!normalized) {
    return [];
  }

  const sections = normalized
    .split(/^(?=## )/m)
    .map((section) => section.trim())
    .filter(Boolean);

  if (hasMarkdownHeading(normalized)) {
    return sections;
  }

  return normalized
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function joinDatasetMarkdownItems(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n\n");
}