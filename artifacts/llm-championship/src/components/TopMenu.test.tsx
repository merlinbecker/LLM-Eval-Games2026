import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock dependencies before importing TopMenu
vi.mock("@/lib/vault/vault-store", () => ({
  useVault: vi.fn(),
}));

vi.mock("@/lib/background-activities", () => ({
  useBackgroundActivities: vi.fn(),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useLocation: vi.fn(() => ["/"]),
}));

import { useVault } from "@/lib/vault/vault-store";
import { useBackgroundActivities } from "@/lib/background-activities";
import { TopMenu } from "./TopMenu";

const mockUseVault = vi.mocked(useVault);
const mockUseBackgroundActivities = vi.mocked(useBackgroundActivities);

function buildVaultMock(overrides: Partial<ReturnType<typeof useVault>> = {}): ReturnType<typeof useVault> {
  return {
    status: "unlocked",
    vault: null,
    error: null,
    synced: true,
    createVault: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
    importVault: vi.fn(),
    exportVault: vi.fn(),
    addGateway: vi.fn(),
    removeGateway: vi.fn(),
    addDataset: vi.fn(),
    updateDataset: vi.fn(),
    removeDataset: vi.fn(),
    addConfiguredModel: vi.fn(),
    removeConfiguredModel: vi.fn(),
    ...overrides,
  };
}

function buildActivityMock(overrides: Partial<ReturnType<typeof useBackgroundActivities>> = {}): ReturnType<typeof useBackgroundActivities> {
  return {
    activities: [],
    runningActivities: [],
    runningCount: 0,
    unacknowledgedCount: 0,
    acknowledge: vi.fn(),
    acknowledgeAll: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseVault.mockReturnValue(buildVaultMock());
  mockUseBackgroundActivities.mockReturnValue(buildActivityMock());
});

describe("TopMenu", () => {
  it("renders navigation links", () => {
    render(<TopMenu />);
    expect(screen.getByText("Arena")).toBeInTheDocument();
    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.getByText("Gateways & Models")).toBeInTheDocument();
    expect(screen.getByText("New Competition")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
  });

  it("shows Lock and Export buttons when unlocked", () => {
    render(<TopMenu />);
    expect(screen.getByText("Lock")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("hides Lock and Export buttons when locked", () => {
    mockUseVault.mockReturnValue(buildVaultMock({ status: "locked" }));
    render(<TopMenu />);
    expect(screen.queryByText("Lock")).not.toBeInTheDocument();
    expect(screen.queryByText("Export")).not.toBeInTheDocument();
  });

  it("calls lock when Lock button clicked", async () => {
    const lock = vi.fn();
    mockUseVault.mockReturnValue(buildVaultMock({ lock }));
    const user = userEvent.setup();

    render(<TopMenu />);
    await user.click(screen.getByText("Lock"));
    expect(lock).toHaveBeenCalled();
  });

  it("calls exportVault when Export button clicked", async () => {
    const exportVault = vi.fn();
    mockUseVault.mockReturnValue(buildVaultMock({ exportVault }));
    const user = userEvent.setup();

    render(<TopMenu />);
    await user.click(screen.getByText("Export"));
    expect(exportVault).toHaveBeenCalled();
  });
});

describe("ActivityDropdown", () => {
  it("does not render when no activities exist", () => {
    render(<TopMenu />);
    expect(screen.queryByText("JOBS")).not.toBeInTheDocument();
  });

  it("renders JOBS button when activities exist", () => {
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [{
        id: 1,
        type: "competition_run",
        status: "running",
        title: "Test Run",
        acknowledged: false,
        createdAt: "2026-03-24T00:00:00.000Z",
      }],
      runningCount: 1,
    }));

    render(<TopMenu />);
    expect(screen.getByText("JOBS")).toBeInTheDocument();
  });

  it("shows badge with combined running + unacknowledged count", () => {
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [{
        id: 1,
        type: "competition_run",
        status: "completed",
        title: "Done",
        acknowledged: false,
        createdAt: "2026-03-24T00:00:00.000Z",
      }],
      runningCount: 1,
      unacknowledgedCount: 2,
    }));

    render(<TopMenu />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows activity details", async () => {
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [{
        id: 1,
        type: "competition_run",
        status: "completed",
        title: "Wettbewerb #1",
        acknowledged: false,
        createdAt: "2026-03-24T00:00:00.000Z",
      }],
      unacknowledgedCount: 1,
    }));

    const user = userEvent.setup();
    render(<TopMenu />);
    await user.click(screen.getByText("JOBS"));

    expect(screen.getByText("Background Jobs")).toBeInTheDocument();
    expect(screen.getByText("Wettbewerb #1")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows ACK button for unacknowledged completed activities", async () => {
    const acknowledge = vi.fn();
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [{
        id: 5,
        type: "dataset_generate",
        status: "completed",
        title: "Gen DS",
        acknowledged: false,
        createdAt: "2026-03-24T00:00:00.000Z",
      }],
      unacknowledgedCount: 1,
      acknowledge,
    }));

    const user = userEvent.setup();
    render(<TopMenu />);
    await user.click(screen.getByText("JOBS"));
    await user.click(screen.getByText("ACK"));

    expect(acknowledge).toHaveBeenCalledWith(5);
  });

  it("shows ACK ALL button and calls acknowledgeAll", async () => {
    const acknowledgeAll = vi.fn();
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [
        { id: 1, type: "competition_run", status: "completed", title: "A", acknowledged: false, createdAt: "2026-03-24T00:00:00.000Z" },
        { id: 2, type: "dataset_generate", status: "error", title: "B", acknowledged: false, createdAt: "2026-03-24T00:00:00.000Z" },
      ],
      unacknowledgedCount: 2,
      acknowledgeAll,
    }));

    const user = userEvent.setup();
    render(<TopMenu />);
    await user.click(screen.getByText("JOBS"));
    await user.click(screen.getByText("ACK ALL"));

    expect(acknowledgeAll).toHaveBeenCalled();
  });

  it("shows error text for errored activities", async () => {
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [{
        id: 1,
        type: "competition_run",
        status: "error",
        title: "Broken",
        error: "API timeout",
        acknowledged: false,
        createdAt: "2026-03-24T00:00:00.000Z",
      }],
    }));

    const user = userEvent.setup();
    render(<TopMenu />);
    await user.click(screen.getByText("JOBS"));

    expect(screen.getByText("API timeout")).toBeInTheDocument();
  });

  it("shows progress text for running activities", async () => {
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [{
        id: 1,
        type: "competition_run",
        status: "running",
        title: "Running",
        progress: "Model A: item 3/10",
        acknowledged: false,
        createdAt: "2026-03-24T00:00:00.000Z",
      }],
      runningCount: 1,
    }));

    const user = userEvent.setup();
    render(<TopMenu />);
    await user.click(screen.getByText("JOBS"));

    expect(screen.getByText("Model A: item 3/10")).toBeInTheDocument();
  });

  it("does not show ACK button for running activities", async () => {
    mockUseBackgroundActivities.mockReturnValue(buildActivityMock({
      activities: [{
        id: 1,
        type: "competition_run",
        status: "running",
        title: "Running",
        acknowledged: false,
        createdAt: "2026-03-24T00:00:00.000Z",
      }],
      runningCount: 1,
    }));

    const user = userEvent.setup();
    render(<TopMenu />);
    await user.click(screen.getByText("JOBS"));

    expect(screen.queryByText("ACK")).not.toBeInTheDocument();
  });
});
