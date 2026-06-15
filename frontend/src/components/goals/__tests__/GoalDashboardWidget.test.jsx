import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GoalDashboardWidget } from "../components/goals/GoalDashboardWidget";

// ── Mock useGoals ─────────────────────────────────────────────────────────────

vi.mock("../hooks/useGoals", () => ({
  useGoals: vi.fn(),
}));

import { useGoals } from "../hooks/useGoals";

const MOCK_DASHBOARD = {
  activeGoals: [
    {
      _id: "g1",
      title: "Vacation Fund",
      targetAmount: 5000,
      currentAmount: 2500,
      targetDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      status: "active",
      color: "#6366f1",
      progressPercentage: 50,
      remainingAmount: 2500,
      daysRemaining: 60,
      isOverdue: false,
    },
    {
      _id: "g2",
      title: "New Laptop",
      targetAmount: 1200,
      currentAmount: 900,
      targetDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      status: "active",
      color: "#22c55e",
      progressPercentage: 75,
      remainingAmount: 300,
      daysRemaining: 20,
      isOverdue: false,
    },
  ],
  recentlyCompleted: [
    {
      _id: "g3",
      title: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 10000,
      targetDate: new Date().toISOString(),
      status: "completed",
      color: "#6366f1",
      progressPercentage: 100,
      remainingAmount: 0,
      daysRemaining: 0,
      completedAt: new Date().toISOString(),
    },
  ],
  statistics: {
    overall: {
      totalGoals: 3,
      totalTarget: 16200,
      totalCurrent: 13400,
      overallProgress: 82.72,
    },
    byStatus: {
      active: { count: 2, totalTarget: 6200, totalCurrent: 3400 },
      completed: { count: 1, totalTarget: 10000, totalCurrent: 10000 },
    },
  },
};

function renderWidget() {
  return render(
    <MemoryRouter>
      <GoalDashboardWidget />
    </MemoryRouter>,
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

describe("GoalDashboardWidget — loading", () => {
  beforeEach(() => {
    useGoals.mockReturnValue({
      fetchDashboard: () => new Promise(() => {}), // never resolves
    });
  });

  it("renders a skeleton loader while fetching", () => {
    renderWidget();
    // pulse skeletons have animate-pulse class on the container
    const pulse = document.querySelector(".animate-pulse");
    expect(pulse).toBeTruthy();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe("GoalDashboardWidget — error", () => {
  beforeEach(() => {
    useGoals.mockReturnValue({
      fetchDashboard: vi.fn().mockRejectedValue(new Error("Network error")),
    });
  });

  it("renders error message on fetch failure", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText(/failed to load goals/i)).toBeTruthy();
    });
  });
});

// ── Successful load ───────────────────────────────────────────────────────────

describe("GoalDashboardWidget — data", () => {
  beforeEach(() => {
    useGoals.mockReturnValue({
      fetchDashboard: vi.fn().mockResolvedValue(MOCK_DASHBOARD),
    });
  });

  it("renders the widget heading", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText("Financial Goals")).toBeTruthy();
    });
  });

  it("renders the 'View all' link pointing to /goals", async () => {
    renderWidget();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /view all/i });
      expect(link.getAttribute("href")).toBe("/goals");
    });
  });

  it("renders overall savings progress section", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText(/overall savings progress/i)).toBeTruthy();
      expect(screen.getByText("82.7%")).toBeTruthy();
    });
  });

  it("renders active goals", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText("Vacation Fund")).toBeTruthy();
      expect(screen.getByText("New Laptop")).toBeTruthy();
    });
  });

  it("renders progress percentage for each active goal", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText("50%")).toBeTruthy();
      expect(screen.getByText("75%")).toBeTruthy();
    });
  });

  it("flags goals with fewer than 30 days remaining", async () => {
    renderWidget();
    await waitFor(() => {
      // New Laptop has 20 days remaining — should be in red class
      const laptopRow = screen.getByText("New Laptop").closest("div");
      const daysEl = laptopRow
        ?.closest(".py-3")
        ?.querySelector("[class*='text-red']");
      expect(daysEl).toBeTruthy();
    });
  });

  it("renders recently completed section", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText(/recently completed/i)).toBeTruthy();
      expect(screen.getByText("Emergency Fund")).toBeTruthy();
    });
  });

  it("shows Done ✓ for completed goals", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText("Done ✓")).toBeTruthy();
    });
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe("GoalDashboardWidget — empty state", () => {
  beforeEach(() => {
    useGoals.mockReturnValue({
      fetchDashboard: vi.fn().mockResolvedValue({
        activeGoals: [],
        recentlyCompleted: [],
        statistics: {
          overall: {
            totalGoals: 0,
            totalTarget: 0,
            totalCurrent: 0,
            overallProgress: 0,
          },
          byStatus: {},
        },
      }),
    });
  });

  it("shows empty state with create link when no active goals", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.getByText(/no active goals/i)).toBeTruthy();
      expect(screen.getByText(/create your first goal/i)).toBeTruthy();
    });
  });

  it("does not render the overall progress section when totalTarget is 0", async () => {
    renderWidget();
    await waitFor(() => {
      expect(screen.queryByText(/overall savings progress/i)).toBeNull();
    });
  });
});
