import React, { useState, useEffect, useRef } from "react";
import { X, Target } from "lucide-react";

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["active", "paused", "cancelled"];
const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#14b8a6",
];
const PRESET_ICONS = [
  "target",
  "home",
  "car",
  "graduation-cap",
  "heart",
  "plane",
  "shopping-bag",
  "briefcase",
  "star",
  "gift",
];

const TOMORROW = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
})();

const EMPTY_FORM = {
  title: "",
  description: "",
  targetAmount: "",
  currentAmount: "",
  targetDate: "",
  priority: "medium",
  category: "",
  status: "active",
  icon: "target",
  color: "#6366f1",
};

function toFormValues(goal) {
  if (!goal) return EMPTY_FORM;
  return {
    title: goal.title ?? "",
    description: goal.description ?? "",
    targetAmount:
      goal.targetAmount !== undefined ? String(goal.targetAmount) : "",
    currentAmount:
      goal.currentAmount !== undefined ? String(goal.currentAmount) : "",
    targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
    priority: goal.priority ?? "medium",
    category: goal.category ?? "",
    status: goal.status ?? "active",
    icon: goal.icon ?? "target",
    color: goal.color ?? "#6366f1",
  };
}

export function GoalFormDialog({
  open,
  onClose,
  onSubmit,
  editGoal = null,
  loading = false,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const titleRef = useRef(null);

  const isEdit = Boolean(editGoal);

  useEffect(() => {
    if (open) {
      setForm(toFormValues(editGoal));
      setErrors({});
      setApiError(null);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, editGoal]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (form.title.trim().length > 100)
      errs.title = "Title must be ≤ 100 characters";
    const target = parseFloat(form.targetAmount);
    if (!form.targetAmount || isNaN(target) || target <= 0)
      errs.targetAmount = "Target amount must be a positive number";
    const current = parseFloat(form.currentAmount);
    if (form.currentAmount !== "" && (isNaN(current) || current < 0))
      errs.currentAmount = "Current amount must be ≥ 0";
    if (!form.targetDate) errs.targetDate = "Target date is required";
    else if (!isEdit && form.targetDate < TOMORROW)
      errs.targetDate = "Target date must be in the future";
    if (form.description.length > 500)
      errs.description = "Description must be ≤ 500 characters";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      targetAmount: parseFloat(form.targetAmount),
      currentAmount:
        form.currentAmount !== "" ? parseFloat(form.currentAmount) : 0,
      targetDate: form.targetDate,
      priority: form.priority,
      category: form.category.trim(),
      status: form.status,
      icon: form.icon,
      color: form.color,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setApiError(err.message);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${form.color}20` }}
            >
              <Target size={18} style={{ color: form.color }} />
            </div>
            <h2
              id="goal-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {isEdit ? "Edit Goal" : "New Goal"}
            </h2>
          </div>
          <button
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4">
            {apiError && (
              <div
                className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
                role="alert"
              >
                {apiError}
              </div>
            )}

            {/* Title */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                htmlFor="goal-title"
              >
                Title{" "}
                <span aria-hidden="true" className="text-red-500">
                  *
                </span>
              </label>
              <input
                id="goal-title"
                ref={titleRef}
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Emergency Fund"
                maxLength={100}
                className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.title ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                htmlFor="goal-description"
              >
                Description
              </label>
              <textarea
                id="goal-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional notes about this goal"
                rows={2}
                maxLength={500}
                className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Amounts row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="goal-target-amount"
                >
                  Target Amount{" "}
                  <span aria-hidden="true" className="text-red-500">
                    *
                  </span>
                </label>
                <input
                  id="goal-target-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.targetAmount}
                  onChange={(e) => set("targetAmount", e.target.value)}
                  placeholder="10000"
                  className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.targetAmount ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                />
                {errors.targetAmount && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.targetAmount}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="goal-current-amount"
                >
                  Current Amount
                </label>
                <input
                  id="goal-current-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentAmount}
                  onChange={(e) => set("currentAmount", e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.currentAmount ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                />
                {errors.currentAmount && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.currentAmount}
                  </p>
                )}
              </div>
            </div>

            {/* Target Date + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="goal-target-date"
                >
                  Target Date{" "}
                  <span aria-hidden="true" className="text-red-500">
                    *
                  </span>
                </label>
                <input
                  id="goal-target-date"
                  type="date"
                  value={form.targetDate}
                  min={isEdit ? undefined : TOMORROW}
                  onChange={(e) => set("targetDate", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.targetDate ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                />
                {errors.targetDate && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.targetDate}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="goal-category"
                >
                  Category
                </label>
                <input
                  id="goal-category"
                  type="text"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="e.g. Savings"
                  maxLength={50}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Priority + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="goal-priority"
                >
                  Priority
                </label>
                <select
                  id="goal-priority"
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="goal-status"
                >
                  Status
                </label>
                <select
                  id="goal-status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color picker */}
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${form.color === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => set("color", c)}
                    aria-label={`Select color ${c}`}
                    aria-pressed={form.color === c}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  className="w-7 h-7 rounded-full border-2 border-gray-300 cursor-pointer"
                  title="Custom color"
                  aria-label="Custom color picker"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {isEdit ? "Save Changes" : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
