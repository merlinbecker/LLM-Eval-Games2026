import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RetroWindow,
  RetroButton,
  RetroInput,
  RetroTextarea,
  RetroSelect,
  RetroCombobox,
  RetroBadge,
  RetroDialog,
  RetroFormField,
  RetroError,
  RobotIcon,
  PodiumIcon,
  TrophyIcon,
} from "./retro";

// ─── RetroWindow ───

describe("RetroWindow", () => {
  it("renders title and children", () => {
    render(<RetroWindow title="Test Window">Hello</RetroWindow>);
    expect(screen.getByText("Test Window")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    render(<RetroWindow title="Win" onClose={onClose}>Body</RetroWindow>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render close button without onClose", () => {
    render(<RetroWindow title="Win">Body</RetroWindow>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not toggle when not collapsible", async () => {
    render(
      <RetroWindow title="Static">
        <p>Visible</p>
      </RetroWindow>,
    );
    await userEvent.click(screen.getByText("Static"));
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("close button stopPropagation does not trigger collapse", async () => {
    const onClose = vi.fn();
    render(
      <RetroWindow title="Both" onClose={onClose}>
        <p>Content</p>
      </RetroWindow>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
    // Content should still be visible (close didn't collapse)
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

// ─── RetroButton ───

describe("RetroButton", () => {
  it("renders children", () => {
    render(<RetroButton>Click Me</RetroButton>);
    expect(screen.getByRole("button", { name: "Click Me" })).toBeInTheDocument();
  });

  it("handles click", async () => {
    const onClick = vi.fn();
    render(<RetroButton onClick={onClick}>Go</RetroButton>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("can be disabled", () => {
    render(<RetroButton disabled>Disabled</RetroButton>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<RetroButton variant="primary">P</RetroButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-mac-black");

    rerender(<RetroButton variant="secondary">S</RetroButton>);
    expect(screen.getByRole("button").className).toContain("bg-mac-white");

    rerender(<RetroButton variant="danger">D</RetroButton>);
    expect(screen.getByRole("button").className).toContain("border-dashed");
  });

  it("applies size classes", () => {
    const { rerender } = render(<RetroButton size="sm">S</RetroButton>);
    expect(screen.getByRole("button").className).toContain("text-xs");

    rerender(<RetroButton size="lg">L</RetroButton>);
    expect(screen.getByRole("button").className).toContain("text-base");
  });
});

// ─── RetroInput ───

describe("RetroInput", () => {
  it("renders with placeholder", () => {
    render(<RetroInput placeholder="Enter value" />);
    expect(screen.getByPlaceholderText("Enter value")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    render(<RetroInput />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "hello");
    expect(input).toHaveValue("hello");
  });
});

// ─── RetroTextarea ───

describe("RetroTextarea", () => {
  it("renders with placeholder", () => {
    render(<RetroTextarea placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });
});

// ─── RetroSelect ───

describe("RetroSelect", () => {
  it("renders options", () => {
    render(
      <RetroSelect>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </RetroSelect>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});

// ─── RetroCombobox ───

describe("RetroCombobox", () => {
  const options = [
    { value: "gpt-4", label: "GPT-4" },
    { value: "claude", label: "Claude 3" },
    { value: "gemini", label: "Gemini Pro" },
  ];

  it("shows placeholder when no value selected", () => {
    render(<RetroCombobox options={options} value="" onChange={vi.fn()} />);
    expect(screen.getByText("-- SELECT --")).toBeInTheDocument();
  });

  it("shows selected value label", () => {
    render(<RetroCombobox options={options} value="claude" onChange={vi.fn()} />);
    expect(screen.getByText("Claude 3")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows all options", async () => {
    render(<RetroCombobox options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("GPT-4")).toBeInTheDocument();
    expect(screen.getByText("Claude 3")).toBeInTheDocument();
    expect(screen.getByText("Gemini Pro")).toBeInTheDocument();
  });

  it("filters options by search text", async () => {
    render(<RetroCombobox options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    const searchInput = screen.getByPlaceholderText("Search...");
    await userEvent.type(searchInput, "claude");
    expect(screen.getByText("Claude 3")).toBeInTheDocument();
    expect(screen.queryByText("GPT-4")).toBeNull();
    expect(screen.queryByText("Gemini Pro")).toBeNull();
  });

  it("shows 'No results' for unmatched search", async () => {
    render(<RetroCombobox options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.type(screen.getByPlaceholderText("Search..."), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("calls onChange on option selection", async () => {
    const onChange = vi.fn();
    render(<RetroCombobox options={options} value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByText("Claude 3"));
    expect(onChange).toHaveBeenCalledWith("claude");
  });

  it("closes dropdown after selection", async () => {
    const onChange = vi.fn();
    render(<RetroCombobox options={options} value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByText("GPT-4"));
    // Search input should be gone (dropdown closed)
    expect(screen.queryByPlaceholderText("Search...")).toBeNull();
  });

  it("does not open when disabled", async () => {
    render(<RetroCombobox options={options} value="" onChange={vi.fn()} disabled />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.queryByPlaceholderText("Search...")).toBeNull();
  });

  it("uses custom placeholder", () => {
    render(
      <RetroCombobox options={options} value="" onChange={vi.fn()} placeholder="Pick one" />,
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("filters by value in addition to label", async () => {
    render(<RetroCombobox options={options} value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.type(screen.getByPlaceholderText("Search..."), "gpt-4");
    expect(screen.getByText("GPT-4")).toBeInTheDocument();
    expect(screen.queryByText("Claude 3")).toBeNull();
  });
});

// ─── RetroBadge ───

describe("RetroBadge", () => {
  it("renders children", () => {
    render(<RetroBadge>LIVE</RetroBadge>);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });
});

// ─── RetroDialog ───

describe("RetroDialog", () => {
  it("renders title and children", () => {
    render(
      <RetroDialog title="Confirm" onClose={vi.fn()}>
        <p>Dialog body</p>
      </RetroDialog>,
    );
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Dialog body")).toBeInTheDocument();
  });

  it("calls onClose when overlay clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <RetroDialog title="X" onClose={onClose}>
        body
      </RetroDialog>,
    );
    // Click the outer overlay div
    const overlay = container.firstChild as HTMLElement;
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when dialog content clicked", async () => {
    const onClose = vi.fn();
    render(
      <RetroDialog title="X" onClose={onClose}>
        <button>Inner</button>
      </RetroDialog>,
    );
    await userEvent.click(screen.getByText("Inner"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── RetroFormField ───

describe("RetroFormField", () => {
  it("renders label and children", () => {
    render(
      <RetroFormField label="Name">
        <input data-testid="inp" />
      </RetroFormField>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByTestId("inp")).toBeInTheDocument();
  });
});

// ─── RetroError ───

describe("RetroError", () => {
  it("renders error message", () => {
    render(<RetroError>Something went wrong</RetroError>);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

// ─── SVG Icons ───

describe("SVG Icons", () => {
  it("renders RobotIcon", () => {
    const { container } = render(<RobotIcon className="w-5" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders PodiumIcon", () => {
    const { container } = render(<PodiumIcon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders TrophyIcon", () => {
    const { container } = render(<TrophyIcon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
