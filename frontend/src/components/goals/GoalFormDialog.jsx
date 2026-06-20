import React, { useState, useEffect, useRef } from "react";

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

const inputCls = [
  "w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2.5",
  "text-sm text-[#e4e4e7] placeholder:text-[#52525b]",
  "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1]/60",
  "transition-all duration-150",
].join(" ");

const inputErrCls = inputCls.replace("border-[#27272a]", "border-[#f87171]/60");

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b] mb-1.5";

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
      errs.targetAmount = "Enter a positive target amount";
    const current = parseFloat(form.currentAmount);
    if (form.currentAmount !== "" && (isNaN(current) || current < 0))
      errs.currentAmount = "Must be ≥ 0";
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
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-dialog-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#27272a]"
        style={{
          background: "#18181b",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {/* Color accent top bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{
            background: `linear-gradient(90deg, ${form.color}, ${form.color}80)`,
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#27272a]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{
                background: `${form.color}18`,
                border: `1px solid ${form.color}30`,
                color: form.color,
              }}
            >
              ◎
            </div>
            <h2
              id="goal-dialog-title"
              className="text-base font-semibold text-[#e4e4e7]"
            >
              {isEdit ? "Edit Goal" : "New Goal"}
            </h2>
          </div>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#27272a] transition-all focus:outline-none"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {apiError && (
              <div
                className="flex items-start gap-2 px-4 py-3 rounded-xl border border-[#f87171]/20 bg-[#f87171]/8 text-sm text-[#f87171]"
                role="alert"
              >
                ⚠ {apiError}
              </div>
            )}

            {/* Title */}
            <div>
              <label className={labelCls} htmlFor="goal-title">
                Title{" "}
                <span className="text-[#f87171]" aria-hidden="true">
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
                className={errors.title ? inputErrCls : inputCls}
              />
              {errors.title && (
                <p className="mt-1 text-[11px] text-[#f87171]">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className={labelCls} htmlFor="goal-description">
                Description
              </label>
              <textarea
                id="goal-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional notes…"
                rows={2}
                maxLength={500}
                className={`${errors.description ? inputErrCls : inputCls} resize-none`}
              />
              {errors.description && (
                <p className="mt-1 text-[11px] text-[#f87171]">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Amounts row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="goal-target-amount">
                  Target Amount{" "}
                  <span className="text-[#f87171]" aria-hidden="true">
                    *
                  </span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] text-sm pointer-events-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ₹
                  </span>
                  <input
                    id="goal-target-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.targetAmount}
                    onChange={(e) => set("targetAmount", e.target.value)}
                    placeholder="10000"
                    className={`${errors.targetAmount ? inputErrCls : inputCls} pl-7`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                {errors.targetAmount && (
                  <p className="mt-1 text-[11px] text-[#f87171]">
                    {errors.targetAmount}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls} htmlFor="goal-current-amount">
                  Current Amount
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] text-sm pointer-events-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ₹
                  </span>
                  <input
                    id="goal-current-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.currentAmount}
                    onChange={(e) => set("currentAmount", e.target.value)}
                    placeholder="0"
                    className={`${errors.currentAmount ? inputErrCls : inputCls} pl-7`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                {errors.currentAmount && (
                  <p className="mt-1 text-[11px] text-[#f87171]">
                    {errors.currentAmount}
                  </p>
                )}
              </div>
            </div>

            {/* Target Date + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="goal-target-date">
                  Target Date{" "}
                  <span className="text-[#f87171]" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="goal-target-date"
                  type="date"
                  value={form.targetDate}
                  min={isEdit ? undefined : TOMORROW}
                  onChange={(e) => set("targetDate", e.target.value)}
                  className={errors.targetDate ? inputErrCls : inputCls}
                />
                {errors.targetDate && (
                  <p className="mt-1 text-[11px] text-[#f87171]">
                    {errors.targetDate}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls} htmlFor="goal-category">
                  Category
                </label>
                <input
                  id="goal-category"
                  type="text"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="e.g. Savings"
                  maxLength={50}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Priority + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="goal-priority">
                  Priority
                </label>
                <select
                  id="goal-priority"
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="goal-status">
                  Status
                </label>
                <select
                  id="goal-status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className={`${inputCls} cursor-pointer`}
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
              <span className={labelCls}>Color</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#6366f1]"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "#fff" : "transparent",
                      transform: form.color === c ? "scale(1.15)" : undefined,
                    }}
                    onClick={() => set("color", c)}
                    aria-label={`Select color ${c}`}
                    aria-pressed={form.color === c}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  className="w-7 h-7 rounded-full border-2 border-[#27272a] cursor-pointer bg-transparent"
                  title="Custom color"
                  aria-label="Custom color picker"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7] transition-all disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              }}
            >
              {loading && (
                <svg
                  className="animate-spin w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
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
