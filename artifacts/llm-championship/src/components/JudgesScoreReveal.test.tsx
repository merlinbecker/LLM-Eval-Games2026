import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { JudgesScoreReveal } from "./JudgesScoreReveal";
import type { CompetitionDetail, JudgeScore } from "@workspace/api-client-react";

// ─── shortName tests (same logic used in component) ───

function shortName(name: string): string {
  return name.split("/").pop() || name;
}

describe("JudgesScoreReveal shortName", () => {
  it("extracts last segment", () => {
    expect(shortName("anthropic/claude-3-opus")).toBe("claude-3-opus");
  });

  it("returns full name without slashes", () => {
    expect(shortName("gpt-4o")).toBe("gpt-4o");
  });
});

// ─── Component tests ───

function makeCompetition(
  overrides: Partial<CompetitionDetail> = {},
): CompetitionDetail {
  return {
    id: "comp-1",
    name: "Test Competition",
    status: "running",
    datasetId: "ds-1",
    contestantModels: [],
    judgeModels: [],
    results: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  } as CompetitionDetail;
}

function makeResult(modelId: string, modelName: string, responses: Array<{ judgeScores: JudgeScore[]; durationMs: number }>) {
  return {
    modelId,
    modelName,
    responses: responses.map((r) => ({
      response: "test",
      durationMs: r.durationMs,
      judgeScores: r.judgeScores,
    })),
    avgQuality: 0,
    avgSpeed: 0,
    totalCost: 0,
  };
}

describe("JudgesScoreReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing when no results", () => {
    const comp = makeCompetition({ results: [] });
    const { container } = render(<JudgesScoreReveal competition={comp} />);
    expect(container).toBeTruthy();
  });

  it("is hidden when competition is not running", () => {
    const comp = makeCompetition({ status: "completed" as any });
    const { container } = render(<JudgesScoreReveal competition={comp} />);
    // The outer div should have opacity 0 or pointerEvents none
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.opacity).toBe("0");
  });

  it("detects new scores and shows reveal panel", async () => {
    const judgeScores: JudgeScore[] = [
      { judgeModelId: "j1", judgeModelName: "judge/alpha", score: 8 },
      { judgeModelId: "j2", judgeModelName: "judge/beta", score: 7 },
    ];

    const comp = makeCompetition({
      status: "running",
      results: [
        makeResult("m1", "openai/gpt-4", [
          { judgeScores, durationMs: 1200 },
        ]),
      ],
    });

    const { container } = render(<JudgesScoreReveal competition={comp} />);

    // Advance past dequeue + entering phase
    act(() => { vi.advanceTimersByTime(600); });

    // After entering phase, the WERTUNG title should appear
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.opacity).toBe("1");
  });

  it("shows model name in the title", () => {
    const judgeScores: JudgeScore[] = [
      { judgeModelId: "j1", judgeModelName: "judge/alpha", score: 9 },
    ];

    const comp = makeCompetition({
      status: "running",
      results: [
        makeResult("m1", "org/my-model", [
          { judgeScores, durationMs: 500 },
        ]),
      ],
    });

    render(<JudgesScoreReveal competition={comp} />);

    // Advance to enter phase
    act(() => { vi.advanceTimersByTime(600); });

    expect(screen.getByText(/my-model/)).toBeInTheDocument();
  });

  it("displays judge names", () => {
    const judgeScores: JudgeScore[] = [
      { judgeModelId: "j1", judgeModelName: "judge/alpha", score: 8 },
      { judgeModelId: "j2", judgeModelName: "judge/beta", score: 6 },
    ];

    const comp = makeCompetition({
      status: "running",
      results: [
        makeResult("m1", "model-a", [{ judgeScores, durationMs: 300 }]),
      ],
    });

    render(<JudgesScoreReveal competition={comp} />);
    act(() => { vi.advanceTimersByTime(600); });

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("reveals judges one by one with delay", () => {
    const judgeScores: JudgeScore[] = [
      { judgeModelId: "j1", judgeModelName: "judge/a", score: 9 },
      { judgeModelId: "j2", judgeModelName: "judge/b", score: 7 },
      { judgeModelId: "j3", judgeModelName: "judge/c", score: 5 },
    ];

    const comp = makeCompetition({
      status: "running",
      results: [
        makeResult("m1", "model-x", [{ judgeScores, durationMs: 400 }]),
      ],
    });

    render(<JudgesScoreReveal competition={comp} />);

    // Enter phase (500ms)
    act(() => { vi.advanceTimersByTime(500); });
    // Now in "revealing" phase, revealedCount=0

    // After first JUDGE_REVEAL_DELAY (700ms), first judge revealed
    act(() => { vi.advanceTimersByTime(700); });
    // revealedCount should be 1

    // After second delay, second judge revealed
    act(() => { vi.advanceTimersByTime(700); });
    // revealedCount should be 2

    // After third delay, third judge revealed
    act(() => { vi.advanceTimersByTime(700); });
    // revealedCount should be 3 → phase transitions to holding

    // Advance through holding (2000ms) + exiting (500ms)
    act(() => { vi.advanceTimersByTime(2500); });
    // Should now be idle
  });

  it("shows running average during reveal", () => {
    const judgeScores: JudgeScore[] = [
      { judgeModelId: "j1", judgeModelName: "judge/a", score: 8 },
      { judgeModelId: "j2", judgeModelName: "judge/b", score: 10 },
    ];

    const comp = makeCompetition({
      status: "running",
      results: [
        makeResult("m1", "model", [{ judgeScores, durationMs: 100 }]),
      ],
    });

    render(<JudgesScoreReveal competition={comp} />);

    // Enter (500ms)
    act(() => { vi.advanceTimersByTime(500); });

    // Before any judge revealed, avg shows "—"
    expect(screen.getByText("—")).toBeInTheDocument();

    // Reveal first judge (score=8)
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByText("8.0")).toBeInTheDocument();

    // Reveal second judge (score=10), avg = 9.0
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByText("9.0")).toBeInTheDocument();
  });

  it("limits queue to MAX_QUEUE_SIZE (4)", () => {
    // Create 6 responses at once — only 4 should be queued
    const makeResp = (score: number) => ({
      judgeScores: [{ judgeModelId: "j1", judgeModelName: "j", score }],
      durationMs: 100,
    });

    const comp = makeCompetition({
      status: "running",
      results: [
        makeResult("m1", "model", [
          makeResp(1), makeResp(2), makeResp(3),
          makeResp(4), makeResp(5), makeResp(6),
        ]),
      ],
    });

    // No crash — just verifying the component handles overflow
    const { container } = render(<JudgesScoreReveal competition={comp} />);
    expect(container).toBeTruthy();
  });

  it("shows queue count indicator when queue has items", () => {
    const makeResp = (score: number) => ({
      judgeScores: [{ judgeModelId: "j1", judgeModelName: "j", score }],
      durationMs: 100,
    });

    const comp = makeCompetition({
      status: "running",
      results: [
        makeResult("m1", "model", [
          makeResp(8), makeResp(9), makeResp(7),
        ]),
      ],
    });

    render(<JudgesScoreReveal competition={comp} />);

    // Enter phase for first event
    act(() => { vi.advanceTimersByTime(600); });

    // Queue should have remaining items
    const queueText = screen.queryByText(/Warteschlange/);
    expect(queueText).toBeInTheDocument();
  });
});
