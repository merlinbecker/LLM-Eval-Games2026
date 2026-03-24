import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BackgroundActivityProvider, useBackgroundActivities } from "./background-activities";
import type { Activity } from "@workspace/api-client-react";

// Mock the API client hooks
const mockMutate = vi.fn();  
vi.mock("@workspace/api-client-react", async () => {
  const actual = await vi.importActual("@workspace/api-client-react");
  return {
    ...actual,
    useListActivities: vi.fn(() => ({ data: [] })),
    useAcknowledgeActivity: vi.fn(() => ({ mutate: mockMutate })),
    getListActivitiesQueryKey: () => ["activities"] as const,
    getListDatasetsQueryKey: () => ["datasets"] as const,
    getListCompetitionsQueryKey: () => ["competitions"] as const,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAddDataset = vi.fn();
vi.mock("@/lib/vault/vault-store", () => ({
  useVault: vi.fn(() => ({
    vault: { datasets: [] },
    addDataset: mockAddDataset,
  })),
}));

import { useListActivities } from "@workspace/api-client-react";
import { toast } from "sonner";

const mockUseListActivities = vi.mocked(useListActivities);

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    type: "competition_run",
    status: "running",
    title: "Test Run",
    acknowledged: false,
    createdAt: "2026-03-24T00:00:00.000Z",
    ...overrides,
  };
}

function TestConsumer() {
  const ctx = useBackgroundActivities();
  return (
    <div>
      <span data-testid="running">{ctx.runningCount}</span>
      <span data-testid="unacked">{ctx.unacknowledgedCount}</span>
      <span data-testid="total">{ctx.activities.length}</span>
      <button onClick={() => ctx.acknowledge(1)}>ack</button>
      <button onClick={() => ctx.acknowledgeAll()}>ackAll</button>
    </div>
  );
}

function renderWithProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BackgroundActivityProvider>
        <TestConsumer />
      </BackgroundActivityProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseListActivities.mockReturnValue({ data: [] } as ReturnType<typeof useListActivities>);
});

describe("BackgroundActivityProvider", () => {
  it("provides default empty state", () => {
    renderWithProvider();
    expect(screen.getByTestId("running").textContent).toBe("0");
    expect(screen.getByTestId("unacked").textContent).toBe("0");
    expect(screen.getByTestId("total").textContent).toBe("0");
  });

  it("counts running activities", () => {
    mockUseListActivities.mockReturnValue({
      data: [
        makeActivity({ id: 1, status: "running" }),
        makeActivity({ id: 2, status: "running" }),
        makeActivity({ id: 3, status: "completed", acknowledged: true }),
      ],
    } as ReturnType<typeof useListActivities>);

    renderWithProvider();
    expect(screen.getByTestId("running").textContent).toBe("2");
  });

  it("counts unacknowledged non-running activities", () => {
    mockUseListActivities.mockReturnValue({
      data: [
        makeActivity({ id: 1, status: "completed", acknowledged: false }),
        makeActivity({ id: 2, status: "error", acknowledged: false }),
        makeActivity({ id: 3, status: "completed", acknowledged: true }),
        makeActivity({ id: 4, status: "running" }),
      ],
    } as ReturnType<typeof useListActivities>);

    renderWithProvider();
    expect(screen.getByTestId("unacked").textContent).toBe("2");
  });

  it("shows success toast when activity transitions from running to completed", () => {
    // First render: activity is running
    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, status: "running" })],
    } as ReturnType<typeof useListActivities>);

    const { rerender } = renderWithProvider();

    // Second render: activity completed
    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, status: "completed" })],
    } as ReturnType<typeof useListActivities>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <BackgroundActivityProvider>
          <TestConsumer />
        </BackgroundActivityProvider>
      </QueryClientProvider>
    );

    expect(toast.success).toHaveBeenCalledWith("Test Run", expect.objectContaining({
      description: "Wettbewerb wurde erfolgreich abgeschlossen",
    }));
  });

  it("shows error toast when activity transitions from running to error", () => {
    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, status: "running" })],
    } as ReturnType<typeof useListActivities>);

    const { rerender } = renderWithProvider();

    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, status: "error", error: "LLM timeout" })],
    } as ReturnType<typeof useListActivities>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <BackgroundActivityProvider>
          <TestConsumer />
        </BackgroundActivityProvider>
      </QueryClientProvider>
    );

    expect(toast.error).toHaveBeenCalledWith("Test Run", expect.objectContaining({
      description: "LLM timeout",
    }));
  });

  it("shows dataset-specific message for dataset_generate completion", () => {
    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, type: "dataset_generate", status: "running", title: "Gen DS" })],
    } as ReturnType<typeof useListActivities>);

    const { rerender } = renderWithProvider();

    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, type: "dataset_generate", status: "completed", title: "Gen DS" })],
    } as ReturnType<typeof useListActivities>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <BackgroundActivityProvider>
          <TestConsumer />
        </BackgroundActivityProvider>
      </QueryClientProvider>
    );

    expect(toast.success).toHaveBeenCalledWith("Gen DS", expect.objectContaining({
      description: "Dataset wurde erfolgreich generiert",
    }));
  });

  it("does not toast when activity is already completed on first render", () => {
    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, status: "completed" })],
    } as ReturnType<typeof useListActivities>);

    renderWithProvider();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("calls mutate on acknowledge", async () => {
    mockUseListActivities.mockReturnValue({
      data: [makeActivity({ id: 1, status: "completed", acknowledged: false })],
    } as ReturnType<typeof useListActivities>);

    renderWithProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText("ack"));
    expect(mockMutate).toHaveBeenCalledWith(
      { id: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("calls mutate for each unacked activity on acknowledgeAll", async () => {
    mockUseListActivities.mockReturnValue({
      data: [
        makeActivity({ id: 1, status: "completed", acknowledged: false }),
        makeActivity({ id: 2, status: "error", acknowledged: false }),
        makeActivity({ id: 3, status: "running" }),
      ],
    } as ReturnType<typeof useListActivities>);

    renderWithProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText("ackAll"));
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });
});
