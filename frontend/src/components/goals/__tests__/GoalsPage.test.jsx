import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GoalsPage } from "../pages/GoalsPage";

// ── Mock useGoals ─────────────────────────────────────────────────────────────

vi.mock("../hooks/useGoals", () => ({
  useGoals: vi.fn(),
}));

import { useGoals } from "../hooks/useGoals";

const FUTURE = new Date(Date.now() + 180 * 86400000).toISOString();

const MOCK_GOALS = [
  {
    _id: "g1",
    title: "Emergency Fund",
    targetAmount: 10000,
    currentAmount: 3000,
    targetDate: FUTURE,
    priority: "high",
    category: "Savings",
    status: "active",
    color: "#6366f1",
    icon: "shield",
    progressPercentage: 30,
    remainingAmount: 7000,
    daysRemaining: 180,
    isOverdue: false,
    createdAt: new Date().toISOString(),
    description: "",
  },
  {
    _id: "g2",
    title: "Vacation Fund",
    targetAmount: 5000,
    currentAmount: 5000,
    targetDate: FUTURE,
    priority: "medium",
    category: "Travel",
    status: "completed",
    color: "#22c55e",
    icon: "plane",
    progressPercentage: 100,
    remainingAmount: 0,
    daysRemaining: 0,
    isOverdue: false,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "",
  },
];

const MOCK_PAGINATION = {
  total: 2,
  page: 1,
  limit: 12,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

function buildHook(overrides = {}) {
  return {
    goals: MOCK_GOALS,
    pagination: MOCK_PAGINATION,
    loading: false,
    error: null,
    fetchGoals: vi.fn().mockResolvedValue(undefined),
    createGoal: vi.fn().mockResolvedValue(MOCK_GOALS[0]),
    updateGoal: vi.fn().mockResolvedValue(MOCK_GOALS[0]),
    deleteGoal: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    ...overrides,
  };
}

function renderPage(hookOverrides = {}) {
  useGoals.mockReturnValue(buildHook(hookOverrides));
  return render(
    <MemoryRouter>
      <GoalsPage />
    </MemoryRouter>,
  );
}

// ── Render ────────────────────────────────────────────────────────────────────

describe("GoalsPage — render", () => {
  it("renders page heading", () => {
    renderPage();
    expect(screen.getByText("Financial Goals")).toBeTruthy();
  });

  it("renders all goal cards", () => {
    renderPage();
    expect(screen.getAllByTestId("goal-card")).toHaveLength(2);
  });

  it("renders goal titles", () => {
    renderPage();
    expect(screen.getByText("Emergency Fund")).toBeTruthy();
    expect(screen.getByText("Vacation Fund")).toBeTruthy();
  });

  it("renders New Goal button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /new goal/i })).toBeTruthy();
  });

  it("renders search input", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/search goals/i)).toBeTruthy();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe("GoalsPage — loading state", () => {
  it("renders skeleton loaders while loading", () => {
    renderPage({ loading: true, goals: [] });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe("GoalsPage — empty state", () => {
  it("shows empty state when no goals exist", () => {
    renderPage({ goals: [], pagination: { ...MOCK_PAGINATION, total: 0 } });
    expect(screen.getByText("No goals yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: /create goal/i })).toBeTruthy();
  });

  it("shows filtered empty state when filters are active", async () => {
    renderPage({ goals: [], pagination: { ...MOCK_PAGINATION, total: 0 } });
    const searchInput = screen.getByPlaceholderText(/search goals/i);
    await userEvent.type(searchInput, "xyz");
    // The filter state change triggers re-render with empty results
    await waitFor(() => {
      expect(screen.getByText("No goals match your filters")).toBeTruthy();
    });
  });
});

// ── Error banner ──────────────────────────────────────────────────────────────

describe("GoalsPage — error banner", () => {
  it("shows error banner when error is set", () => {
    renderPage({ error: "Failed to load goals" });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Failed to load goals")).toBeTruthy();
  });

  it("calls clearError when dismiss button is clicked", () => {
    const clearError = vi.fn();
    renderPage({ error: "Some error", clearError });
    fireEvent.click(screen.getByLabelText(/dismiss error/i));
    expect(clearError).toHaveBeenCalledTimes(1);
  });
});

// ── Filtering ─────────────────────────────────────────────────────────────────

describe("GoalsPage — filtering", () => {
  it("calls fetchGoals with search param on input", async () => {
    const fetchGoals = vi.fn().mockResolvedValue(undefined);
    renderPage({ fetchGoals });

    const searchInput = screen.getByPlaceholderText(/search goals/i);
    await userEvent.type(searchInput, "emergency");

    await waitFor(() => {
      const lastCall = fetchGoals.mock.calls.at(-1)[0];
      expect(lastCall.search).toBe("emergency");
      expect(lastCall.page).toBe(1);
    });
  });

  it("reveals filter panel when Filters button is clicked", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/status/i)).toBeTruthy();
      expect(screen.getByLabelText(/priority/i)).toBeTruthy();
    });
  });

  it("calls fetchGoals with status filter", async () => {
    const fetchGoals = vi.fn().mockResolvedValue(undefined);
    renderPage({ fetchGoals });

    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await waitFor(() => screen.getByLabelText(/status/i));
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "active" },
    });

    await waitFor(() => {
      const lastCall = fetchGoals.mock.calls.at(-1)[0];
      expect(lastCall.status).toBe("active");
    });
  });

  it("resets all filters when Reset button is clicked", async () => {
    const fetchGoals = vi.fn().mockResolvedValue(undefined);
    renderPage({ fetchGoals });

    // Apply a filter first
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await waitFor(() => screen.getByLabelText(/status/i));
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "active" },
    });

    await waitFor(() => screen.getByRole("button", { name: /reset/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    await waitFor(() => {
      const lastCall = fetchGoals.mock.calls.at(-1)[0];
      expect(lastCall.status).toBe("");
      expect(lastCall.page).toBe(1);
    });
  });

  it("clears search input with the X button", async () => {
    renderPage();
    const input = screen.getByPlaceholderText(/search goals/i);
    await userEvent.type(input, "test");
    await waitFor(() => screen.getByLabelText(/clear search/i));
    fireEvent.click(screen.getByLabelText(/clear search/i));
    expect(input.value).toBe("");
  });
});

// ── Create flow ───────────────────────────────────────────────────────────────

describe("GoalsPage — create flow", () => {
  it("opens GoalFormDialog when New Goal is clicked", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /new goal/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.getByText("New Goal")).toBeTruthy();
    });
  });

  it("closes dialog on Cancel", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /new goal/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

// ── Edit flow ─────────────────────────────────────────────────────────────────

describe("GoalsPage — edit flow", () => {
  it("opens edit dialog with existing data when Edit is chosen from card menu", async () => {
    renderPage();
    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Edit"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.getByText("Edit Goal")).toBeTruthy();
      expect(screen.getByDisplayValue("Emergency Fund")).toBeTruthy();
    });
  });

  it("calls updateGoal with changed payload", async () => {
    const updateGoal = vi
      .fn()
      .mockResolvedValue({ ...MOCK_GOALS[0], title: "Updated" });
    const fetchGoals = vi.fn().mockResolvedValue(undefined);
    renderPage({ updateGoal, fetchGoals });

    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() => screen.getByRole("dialog"));

    const titleInput = screen.getByDisplayValue("Emergency Fund");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateGoal).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ title: "Updated" }),
      );
    });
  });
});

// ── Delete flow ───────────────────────────────────────────────────────────────

describe("GoalsPage — delete flow", () => {
  it("opens confirmation modal when Delete is chosen", async () => {
    renderPage();
    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeTruthy();
      expect(screen.getByText(/are you sure/i)).toBeTruthy();
      expect(screen.getByText("Emergency Fund")).toBeTruthy();
    });
  });

  it("calls deleteGoal when confirmed", async () => {
    const deleteGoal = vi.fn().mockResolvedValue(undefined);
    const fetchGoals = vi.fn().mockResolvedValue(undefined);
    renderPage({ deleteGoal, fetchGoals });

    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => screen.getByRole("alertdialog"));
    // There may be multiple "Delete" buttons — find the one in the confirmation dialog
    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: /delete/i }),
    );

    await waitFor(() => {
      expect(deleteGoal).toHaveBeenCalledWith("g1");
    });
  });

  it("dismisses confirmation when Cancel is clicked", async () => {
    renderPage();
    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => screen.getByRole("alertdialog"));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("shows inline error when deleteGoal rejects", async () => {
    const deleteGoal = vi.fn().mockRejectedValue(new Error("Cannot delete"));
    renderPage({ deleteGoal });

    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => screen.getByRole("alertdialog"));

    const confirmDialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: /delete/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Cannot delete")).toBeTruthy();
    });
  });
});

// ── Detail panel ──────────────────────────────────────────────────────────────

describe("GoalsPage — detail panel", () => {
  it("opens GoalDetailPanel when goal title is clicked", async () => {
    renderPage();
    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText(/view details/i));
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /emergency fund/i }),
      ).toBeTruthy();
    });
  });

  it("closes detail panel when close button is clicked", async () => {
    renderPage();
    const cards = screen.getAllByTestId("goal-card");
    fireEvent.click(within(cards[0]).getByLabelText(/view details/i));
    await waitFor(() =>
      screen.getByRole("dialog", { name: /emergency fund/i }),
    );
    fireEvent.click(screen.getByLabelText(/close/i));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /emergency fund/i }),
      ).toBeNull(),
    );
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe("GoalsPage — pagination", () => {
  const MULTI_PAGE_PAGINATION = {
    total: 25,
    page: 1,
    limit: 12,
    totalPages: 3,
    hasNextPage: true,
    hasPrevPage: false,
  };

  it("renders pagination controls when totalPages > 1", () => {
    renderPage({ pagination: MULTI_PAGE_PAGINATION });
    expect(screen.getByLabelText("Next page")).toBeTruthy();
    expect(screen.getByLabelText("Previous page")).toBeTruthy();
  });

  it("disables Previous button on first page", () => {
    renderPage({ pagination: MULTI_PAGE_PAGINATION });
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
  });

  it("calls fetchGoals with page 2 when Next is clicked", async () => {
    const fetchGoals = vi.fn().mockResolvedValue(undefined);
    renderPage({ pagination: MULTI_PAGE_PAGINATION, fetchGoals });

    fireEvent.click(screen.getByLabelText("Next page"));
    await waitFor(() => {
      const lastCall = fetchGoals.mock.calls.at(-1)[0];
      expect(lastCall.page).toBe(2);
    });
  });

  it("does not render pagination when totalPages <= 1", () => {
    renderPage(); // MOCK_PAGINATION has totalPages: 1
    expect(screen.queryByLabelText("Next page")).toBeNull();
  });
});
