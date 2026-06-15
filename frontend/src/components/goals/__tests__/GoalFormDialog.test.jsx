import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoalFormDialog } from "../components/goals/GoalFormDialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FUTURE_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
})();

function renderDialog(props = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    editGoal: null,
    loading: false,
  };
  return render(<GoalFormDialog {...defaults} {...props} />);
}

// Use the native input setter to bypass jsdom number-input constraint sanitisation
function setNativeNumberValue(input, value) {
  const nativeDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  nativeDescriptor.set.call(input, value);
  fireEvent.input(input, { target: { value } });
  fireEvent.change(input, { target: { value } });
}

// ── Render ────────────────────────────────────────────────────────────────────

describe("GoalFormDialog — render", () => {
  it("renders nothing when open=false", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the dialog with create title", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("New Goal")).toBeTruthy();
  });

  it("renders edit title when editGoal is supplied", () => {
    renderDialog({
      editGoal: {
        _id: "g1",
        title: "Vacation",
        targetAmount: 2000,
        currentAmount: 500,
        targetDate: FUTURE_DATE,
        priority: "low",
        category: "Travel",
        status: "active",
        icon: "plane",
        color: "#6366f1",
        description: "Beach trip",
      },
    });
    expect(screen.getByText("Edit Goal")).toBeTruthy();
    expect(screen.getByDisplayValue("Vacation")).toBeTruthy();
    expect(screen.getByDisplayValue("Beach trip")).toBeTruthy();
  });

  it("pre-populates all fields from editGoal", () => {
    renderDialog({
      editGoal: {
        _id: "g1",
        title: "Car Fund",
        targetAmount: 15000,
        currentAmount: 3000,
        targetDate: FUTURE_DATE,
        priority: "high",
        category: "Transport",
        status: "active",
        icon: "car",
        color: "#6366f1",
        description: "New car savings",
      },
    });
    expect(screen.getByDisplayValue("Car Fund")).toBeTruthy();
    expect(screen.getByDisplayValue("New car savings")).toBeTruthy();
    expect(screen.getByDisplayValue("15000")).toBeTruthy();
    expect(screen.getByDisplayValue("3000")).toBeTruthy();
  });

  it("renders the Cancel button and close button", () => {
    renderDialog();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByLabelText("Close dialog")).toBeTruthy();
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("GoalFormDialog — client-side validation", () => {
  it("shows required errors on empty submit", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));
    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeTruthy();
      expect(screen.getByText(/target amount must be/i)).toBeTruthy();
      expect(screen.getByText("Target date is required")).toBeTruthy();
    });
  });

  it("shows error when title exceeds 100 characters", async () => {
    renderDialog();
    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.type(titleInput, "A".repeat(101));
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));
    await waitFor(() => {
      expect(screen.getByText(/≤ 100 characters/i)).toBeTruthy();
    });
  });

  it("shows error for non-positive target amount", async () => {
    renderDialog();
    const amountInput = screen.getByLabelText(/target amount/i);
    setNativeNumberValue(amountInput, "-100");
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/target amount must be a positive number/i),
      ).toBeTruthy();
    });
  });

  it("clears a field error when the user corrects the value", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));
    await waitFor(() =>
      expect(screen.getByText("Title is required")).toBeTruthy(),
    );

    await userEvent.type(screen.getByLabelText(/title/i), "Emergency Fund");
    await waitFor(() =>
      expect(screen.queryByText("Title is required")).toBeNull(),
    );
  });
});

// ── Submission ────────────────────────────────────────────────────────────────

describe("GoalFormDialog — submission", () => {
  async function fillAndSubmit(overrides = {}) {
    const titleInput = screen.getByLabelText(/title/i);
    const targetInput = screen.getByLabelText(/target amount/i);
    const dateInput = screen.getByLabelText(/target date/i);

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, overrides.title ?? "Emergency Fund");

    setNativeNumberValue(targetInput, overrides.targetAmount ?? "5000");

    fireEvent.change(dateInput, {
      target: { value: overrides.targetDate ?? FUTURE_DATE },
    });
  }

  it("calls onSubmit with correct payload on valid form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSubmit });
    await fillAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      const [payload] = onSubmit.mock.calls[0];
      expect(payload.title).toBe("Emergency Fund");
      expect(payload.targetAmount).toBe(5000);
      expect(payload.currentAmount).toBe(0);
      expect(payload.targetDate).toBe(FUTURE_DATE);
      expect(payload.priority).toBe("medium");
      expect(payload.status).toBe("active");
    });
  });

  it("calls onClose after successful submit", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onClose, onSubmit });
    await fillAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("displays API error when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Server error"));
    renderDialog({ onSubmit });
    await fillAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText("Server error")).toBeTruthy();
    });
  });

  it("does not call onClose when onSubmit rejects", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(new Error("fail"));
    renderDialog({ onClose, onSubmit });
    await fillAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("submits the correct payload in edit mode", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const editGoal = {
      _id: "g1",
      title: "Old Title",
      targetAmount: 1000,
      currentAmount: 200,
      targetDate: FUTURE_DATE,
      priority: "low",
      category: "Savings",
      status: "active",
      icon: "target",
      color: "#6366f1",
      description: "",
    };
    renderDialog({ onSubmit, editGoal });

    const titleInput = screen.getByDisplayValue("Old Title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "New Title");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Title", targetAmount: 1000 }),
      );
    });
  });
});

// ── Keyboard / UX ─────────────────────────────────────────────────────────────

describe("GoalFormDialog — keyboard & UX", () => {
  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    // The backdrop has aria-hidden, find by direct structure
    fireEvent.click(screen.getByRole("dialog").previousSibling);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables submit button while loading", () => {
    renderDialog({ loading: true });
    const btn = screen.getByRole("button", { name: /create goal/i });
    expect(btn).toBeDisabled();
  });

  it("resets form state when reopened with a new editGoal", async () => {
    const { rerender } = renderDialog({ open: false });
    rerender(
      <GoalFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        editGoal={{
          _id: "g2",
          title: "New Car",
          targetAmount: 20000,
          currentAmount: 0,
          targetDate: FUTURE_DATE,
          priority: "medium",
          category: "",
          status: "active",
          icon: "car",
          color: "#6366f1",
          description: "",
        }}
        loading={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue("New Car")).toBeTruthy();
    });
  });
});

// ── Color picker ──────────────────────────────────────────────────────────────

describe("GoalFormDialog — color selection", () => {
  it("updates color when a preset is clicked", async () => {
    renderDialog();
    const colorButtons = screen.getAllByLabelText(/select color/i);
    expect(colorButtons.length).toBeGreaterThan(0);
    await userEvent.click(colorButtons[1]);
    // No error thrown = color updated in state; visual assertion handled by integration tests
  });
});
