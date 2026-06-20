import React, { useEffect, useState, useCallback } from "react";
import { useGoals } from "../hooks/useGoals";
import { GoalCard } from "../components/goals/GoalCard";
import { GoalFormDialog } from "../components/goals/GoalFormDialog";
import { GoalDetailPanel } from "../components/goals/GoalDetailPanel";
import useFonts from "../hooks/useFonts";

const STATUS_OPTIONS = ["", "active", "completed", "paused", "cancelled"];
const PRIORITY_OPTIONS = ["", "low", "medium", "high"];
const SORT_OPTIONS = [
  { value: "createdAt", label: "Date created" },
  { value: "targetDate", label: "Target date" },
  { value: "targetAmount", label: "Target amount" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
];

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  priority: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 12,
};

const selectCls =
  "bg-[#0f0f11] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/50 transition-all";

const SectionLabel = ({ children }) => (
  <p
    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3"
    style={{ fontFamily: "'Sora', sans-serif" }}
  >
    {children}
  </p>
);

// Skeleton card for loading state
const SkeletonCard = () => (
  <div
    className="rounded-xl border border-[#27272a] overflow-hidden animate-pulse"
    style={{ background: "linear-gradient(145deg, #18181b 0%, #141416 100%)" }}
  >
    <div className="pl-5 pr-4 pt-4 pb-4">
      <div className="h-4 w-3/4 bg-[#27272a] rounded mb-2" />
      <div className="h-3 w-1/2 bg-[#27272a]/60 rounded mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-16 bg-[#27272a] rounded-full" />
        <div className="h-5 w-20 bg-[#27272a] rounded-full" />
      </div>
      <div className="h-1.5 w-full bg-[#27272a] rounded-full mb-4" />
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-[#27272a] rounded" />
        <div className="h-4 w-16 bg-[#27272a] rounded" />
      </div>
    </div>
  </div>
);

export function GoalsPage() {
  useFonts();

  const {
    goals,
    pagination,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    clearError,
  } = useGoals();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [detailGoal, setDetailGoal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const load = useCallback((params) => fetchGoals(params), [fetchGoals]);

  useEffect(() => {
    load(filters);
  }, [filters]);

  function setFilter(key, value) {
    setFilters((f) => ({
      ...f,
      [key]: value,
      page: key !== "page" ? 1 : value,
    }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function openCreate() {
    setEditGoal(null);
    setDialogOpen(true);
  }

  function openEdit(goal) {
    setDetailGoal(null);
    setEditGoal(goal);
    setDialogOpen(true);
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      if (editGoal) {
        await updateGoal(editGoal._id, payload);
      } else {
        await createGoal(payload);
      }
      await load(filters);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleteError(null);
    try {
      await deleteGoal(deleteConfirm._id);
      setDeleteConfirm(null);
      await load(filters);
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.sortBy !== "createdAt" ||
    filters.sortOrder !== "desc";

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* Ambient orb */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle,#f472b6 0%,transparent 70%)",
            filter: "blur(56px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle,#6366f1 0%,transparent 70%)",
            filter: "blur(48px)",
          }}
        />
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 border-b border-[#27272a] bg-[#0a0a0c]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b] text-xs pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search goals…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg bg-[#0f0f11] border border-[#27272a] text-[#e4e4e7] placeholder:text-[#52525b] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/50 transition-all duration-150"
            />
            {filters.search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                onClick={() => setFilter("search", "")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showFilters || hasActiveFilters
                ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
                : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]"
            }`}
            aria-expanded={showFilters}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="4" y1="8" x2="12" y2="8" />
              <line x1="6" y1="12" x2="10" y2="12" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
            )}
          </button>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilter("sortBy", e.target.value)}
            className={selectCls}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => setFilter("sortOrder", e.target.value)}
            className={selectCls}
            aria-label="Sort order"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#52525b] hover:text-[#f87171] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#f87171]/8"
            >
              ✕ Clear
            </button>
          )}

          <div className="flex-1" />

          {/* New goal button */}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
            style={{
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
            }}
          >
            <span className="text-base leading-none">+</span>
            New Goal
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="border-t border-[#27272a] bg-[#0f0f11]/60">
            <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
                  Status
                </span>
                <select
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                  className={selectCls}
                  aria-label="Status"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s || "All statuses"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
                  Priority
                </span>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilter("priority", e.target.value)}
                  className={selectCls}
                  aria-label="Priority"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p || "All priorities"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 py-7 space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Financial Goals
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            Track your savings and spending targets.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#f87171]/20 bg-[#f87171]/8"
            role="alert"
          >
            <p className="text-sm text-[#f87171]">{error}</p>
            <button
              onClick={clearError}
              className="text-[#f87171]/60 hover:text-[#f87171] text-xs transition-colors shrink-0"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Goal grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <span className="text-5xl opacity-20">◎</span>
            <p className="text-sm font-medium text-[#a1a1aa]">
              {hasActiveFilters
                ? "No goals match your filters"
                : "No goals yet"}
            </p>
            <p className="text-xs text-[#52525b]">
              {hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Create a goal to start tracking your progress."}
            </p>
            <div className="flex gap-3 mt-1">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
                >
                  Clear filters
                </button>
              )}
              <button
                onClick={openCreate}
                className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
              >
                + Create goal →
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {goals.map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  onEdit={openEdit}
                  onDelete={(g) => setDeleteConfirm(g)}
                  onViewDetails={(g) => setDetailGoal(g)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#52525b] tabular-nums">
                  <span className="text-[#a1a1aa]">
                    {(pagination.page - 1) * pagination.limit + 1}–
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}
                  </span>{" "}
                  of <span className="text-[#a1a1aa]">{pagination.total}</span>{" "}
                  goals
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilter("page", pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    ← Prev
                  </button>
                  <span className="px-3 text-xs text-[#52525b] tabular-nums">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setFilter("page", pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <GoalFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        editGoal={editGoal}
        loading={submitting}
      />

      {detailGoal && (
        <GoalDetailPanel
          goal={detailGoal}
          onClose={() => setDetailGoal(null)}
          onEdit={(g) => {
            setDetailGoal(null);
            openEdit(g);
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
          }}
          role="alertdialog"
          aria-labelledby="delete-confirm-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#27272a] p-6"
            style={{
              background: "#18181b",
              boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            <p
              id="delete-confirm-title"
              className="text-sm font-semibold text-[#e4e4e7] mb-1"
            >
              Delete goal?
            </p>
            <p className="text-xs text-[#71717a] mb-5 leading-relaxed">
              <span className="text-[#a1a1aa] font-medium">
                {deleteConfirm.title}
              </span>{" "}
              will be permanently removed and cannot be recovered.
            </p>
            {deleteError && (
              <p className="text-xs text-[#f87171] mb-3" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteError(null);
                }}
                className="flex-1 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-lg border border-[#f87171]/30 bg-[#f87171]/10 text-sm text-[#f87171] hover:bg-[#f87171]/20 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
