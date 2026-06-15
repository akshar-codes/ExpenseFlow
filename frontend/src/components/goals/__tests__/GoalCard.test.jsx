import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GoalCard } from "../components/goals/GoalCard";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_GOAL = {
  _id: "goal_1",
  title: "Emergency Fund",
  description: "6 months of expenses",
  targetAmount: 10000,
  currentAmount: 4500,
  targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  priority: "high",
  category: "Savings",
  status: "active",
  icon: "shield",
  color: "#6366f1",
  progressPercentage: 45,
  remainingAmount: 5500,
  daysRemaining: 90,
  isOverdue: false,
  createdAt: new Date().toISOString(),
};

function renderCard(overrides = {}, handlers = {}) {
  return render(
    <GoalCard
      goal={{ ...BASE_GOAL, ...overrides }}
      onEdit={handlers.onEdit ?? vi.fn()}
      onDelete={handlers.onDelete ?? vi.fn()}
      onViewDetails={handlers.onViewDetails ?? vi.fn()}
    />,
  );
}

// ── Render ────────────────────────────────────────────────────────────────────

describe("GoalCard — render", () => {
  it("renders title and category", () => {
    renderCard();
    expect(screen.getByText("Emergency Fund")).toBeTruthy();
    expect(screen.getByText("Savings")).toBeTruthy();
  });

  it("renders the status badge", () => {
    renderCard();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("renders priority badge", () => {
    renderCard();
    expect(screen.getByText(/high priority/i)).toBeTruthy();
  });

  it("renders saved and target amounts", () => {
    renderCard();
    // $4,500 saved, $10,000 goal
    expect(screen.getByText("$4,500")).toBeTruthy();
    expect(screen.getByText("$10,000")).toBeTruthy();
  });

  it("renders days remaining for active goal", () => {
    renderCard();
    expect(screen.getByText(/90d left/i)).toBeTruthy();
  });

  it("renders 'Past due' when daysRemaining is 0 or negative", () => {
    renderCard({ daysRemaining: -5 });
    expect(screen.getByText("Past due")).toBeTruthy();
  });

  it("renders Overdue badge when isOverdue=true", () => {
    renderCard({ isOverdue: true });
    expect(screen.getByText(/overdue/i)).toBeTruthy();
  });

  it("renders completion date for completed goal", () => {
    const completedAt = "2025-03-15T00:00:00.000Z";
    renderCard({
      status: "completed",
      progressPercentage: 100,
      daysRemaining: 0,
      completedAt,
    });
    expect(screen.getByText(/done/i)).toBeTruthy();
  });

  it("renders a progress bar with correct aria attributes", () => {
    renderCard({ progressPercentage: 45 });
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("45");
    expect(progressBar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("has data-testid=goal-card", () => {
    renderCard();
    expect(screen.getByTestId("goal-card")).toBeTruthy();
  });
});

// ── Interactions ──────────────────────────────────────────────────────────────

describe("GoalCard — interactions", () => {
  it("calls onViewDetails when title is clicked", () => {
    const onViewDetails = vi.fn();
    renderCard({}, { onViewDetails });
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));
    expect(onViewDetails).toHaveBeenCalledTimes(1);
    expect(onViewDetails).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "goal_1" }),
    );
  });

  it("opens context menu on MoreVertical click", async () => {
    renderCard();
    fireEvent.click(screen.getByLabelText("Goal actions"));
    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();
    });
  });

  it("calls onEdit with the goal when Edit is clicked", async () => {
    const onEdit = vi.fn();
    renderCard({}, { onEdit });
    fireEvent.click(screen.getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "goal_1" }),
    );
  });

  it("calls onDelete with the goal when Delete is clicked", async () => {
    const onDelete = vi.fn();
    renderCard({}, { onDelete });
    fireEvent.click(screen.getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "goal_1" }),
    );
  });

  it("closes the action menu after an action is chosen", async () => {
    const onEdit = vi.fn();
    renderCard({}, { onEdit });
    fireEvent.click(screen.getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() => expect(screen.queryByText("Delete")).toBeNull());
  });

  it("closes menu on outside click", async () => {
    renderCard();
    fireEvent.click(screen.getByLabelText("Goal actions"));
    await waitFor(() => screen.getByText("Edit"));
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText("Edit")).toBeNull());
  });
});

// ── Status variants ───────────────────────────────────────────────────────────

describe("GoalCard — status variants", () => {
  it("shows Completed badge for completed goals", () => {
    renderCard({ status: "completed", progressPercentage: 100 });
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("shows Paused badge for paused goals", () => {
    renderCard({ status: "paused" });
    expect(screen.getByText("Paused")).toBeTruthy();
  });

  it("shows Cancelled badge for cancelled goals", () => {
    renderCard({ status: "cancelled" });
    expect(screen.getByText("Cancelled")).toBeTruthy();
  });
});

// ── GoalProgressBar via GoalCard ──────────────────────────────────────────────

describe("GoalCard — progress bar completeness", () => {
  it("shows Completed label in progress bar at 100%", () => {
    renderCard({ progressPercentage: 100 });
    expect(screen.getByText(/completed ✓/i)).toBeTruthy();
  });

  it("does not show Completed label below 100%", () => {
    renderCard({ progressPercentage: 99 });
    expect(screen.queryByText(/completed ✓/i)).toBeNull();
  });
});
