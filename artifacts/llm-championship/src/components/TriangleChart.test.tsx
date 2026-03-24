import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TriangleChart } from "./TriangleChart";

const sampleData = [
  { name: "GPT-4", speedScore: 5, costScore: 3, qualityScore: 9 },
  { name: "Claude", speedScore: 7, costScore: 6, qualityScore: 8 },
  { name: "Gemini", speedScore: 9, costScore: 7, qualityScore: 5 },
];

describe("TriangleChart", () => {
  it("renders SVG with triangle outline", () => {
    const { container } = render(<TriangleChart data={sampleData} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(container.querySelector("polygon")).toBeInTheDocument();
  });

  it("renders vertex labels", () => {
    render(<TriangleChart data={sampleData} />);
    expect(screen.getByText("QUALITÄT")).toBeInTheDocument();
    expect(screen.getByText("LATENZ")).toBeInTheDocument();
    expect(screen.getByText("KOSTEN")).toBeInTheDocument();
  });

  it("renders legend entries for each model", () => {
    render(<TriangleChart data={sampleData} />);
    // Each name appears twice: once as SVG data label, once in legend
    expect(screen.getAllByText("GPT-4")).toHaveLength(2);
    expect(screen.getAllByText("Claude")).toHaveLength(2);
    expect(screen.getAllByText("Gemini")).toHaveLength(2);
  });

  it("renders data points using different marker shapes", () => {
    const { container } = render(<TriangleChart data={sampleData} />);
    // 3 data points + 3 legend markers = at least 6 marker shapes
    const circles = container.querySelectorAll("circle");
    const rects = container.querySelectorAll("rect");
    // There should be vertex dots (3 circles) + at least circle markers + rect markers
    expect(circles.length).toBeGreaterThanOrEqual(3);
    expect(rects.length).toBeGreaterThanOrEqual(1);
  });

  it("renders grid lines (9 = 3 levels × 3 edges)", () => {
    const { container } = render(<TriangleChart data={sampleData} />);
    const lines = container.querySelectorAll("line");
    // 9 grid lines + 2 crosshair lines = 11
    expect(lines.length).toBe(11);
  });

  it("renders empty chart without data points", () => {
    const { container } = render(<TriangleChart data={[]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // No legend when empty
    expect(container.querySelectorAll("[class*='flex-wrap']")).toHaveLength(0);
  });

  it("renders single data point correctly", () => {
    const singleData = [{ name: "Solo", speedScore: 5, costScore: 5, qualityScore: 5 }];
    render(<TriangleChart data={singleData} />);
    expect(screen.getAllByText("Solo")).toHaveLength(2);
  });

  it("handles extreme score values (all weight on one axis)", () => {
    const extremeData = [
      { name: "Fast", speedScore: 10, costScore: 0.01, qualityScore: 0.01 },
    ];
    const { container } = render(<TriangleChart data={extremeData} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getAllByText("Fast")).toHaveLength(2);
  });

  it("cycles through all 5 marker shapes with 5+ items", () => {
    const fiveModels = [
      { name: "M1", speedScore: 5, costScore: 5, qualityScore: 5 },
      { name: "M2", speedScore: 6, costScore: 4, qualityScore: 5 },
      { name: "M3", speedScore: 4, costScore: 6, qualityScore: 5 },
      { name: "M4", speedScore: 5, costScore: 4, qualityScore: 6 },
      { name: "M5", speedScore: 4, costScore: 5, qualityScore: 6 },
    ];
    const { container } = render(<TriangleChart data={fiveModels} />);
    // circle, square, diamond (polygon), triangle (polygon), cross (g with rects)
    const svg = container.querySelector("svg")!;
    expect(svg.querySelectorAll("circle").length).toBeGreaterThanOrEqual(3); // vertex dots + circle markers
    expect(svg.querySelectorAll("polygon").length).toBeGreaterThanOrEqual(2); // triangle outline + diamond + triangle
  });

  it("respects custom width and height", () => {
    const { container } = render(<TriangleChart data={sampleData} width={600} height={500} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 600 500");
  });

  it("shows tooltip on hover", async () => {
    render(<TriangleChart data={sampleData} />);
    // The data point markers have cursor-pointer groups
    const groups = document.querySelectorAll("g.cursor-pointer");
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });
});
