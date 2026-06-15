import React, { useEffect, useState, useCallback } from "react";

import AddIcon from "@mui/icons-material/Add";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { useGoals } from "../hooks/useGoals";
import { GoalCard } from "../components/goals/GoalCard";
import { GoalFormDialog } from "../components/goals/GoalFormDialog";
import { GoalDetailPanel } from "../components/goals/GoalDetailPanel";

const STATUS_OPTIONS = ["", "active", "completed", "paused", "cancelled"];
const PRIORITY_OPTIONS = ["", "low", "medium", "high"];
const SORT_OPTIONS = [
  { value: "createdAt", label: "Date Created" },
  { value: "targetDate", label: "Target Date" },
  { value: "targetAmount", label: "Target Amount" },
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

export function GoalsPage() {
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

  // ── Dialog handlers ─────────────────────────────────────────────────────────

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
      // Refresh to pick up server-computed fields
      await load(filters);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrackChangesIcon fontSize="medium" className="text-indigo-500" />
              Financial Goals
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Track your savings and spending targets
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <AddIcon fontSize="small" />
            New Goal
          </button>
        </div>

        {/* API error banner */}
        {error && (
          <div
            className="flex items-center justify-between gap-3 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <ErrorOutlinedIcon fontSize="small" className="flex-shrink-0" />
              {error}
            </div>
            <button onClick={clearError} aria-label="Dismiss error">
              <CloseIcon fontSize="small" />
            </button>
          </div>
        )}

        {/* Search + filter bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                placeholder="Search goals…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {filters.search && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setFilter("search", "")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showFilters || hasActiveFilters ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
              aria-expanded={showFilters}
            >
              <FilterListIcon fontSize="small" />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
            </button>

            {/* Sort */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilter("sortBy", e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Sort order"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <RefreshIcon fontSize="small" /> Reset
              </button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s || "All statuses"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilter("priority", e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p || "All priorities"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Goal grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/4" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Target
              size={48}
              className="text-gray-300 dark:text-gray-600 mb-4"
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {hasActiveFilters
                ? "No goals match your filters"
                : "No goals yet"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Create your first financial goal to start tracking your progress."}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <AddIcon fontSize="small" /> Create Goal
              </button>
            )}
          </div>
        ) : (
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
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} goals
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("page", pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeftIcon fontSize="small" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilter("page", pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRightIcon fontSize="small" />
              </button>
            </div>
          </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="alertdialog"
          aria-labelledby="delete-confirm-title"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3
              id="delete-confirm-title"
              className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              Delete Goal
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm.title}</strong>? This action cannot be
              undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-3" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
