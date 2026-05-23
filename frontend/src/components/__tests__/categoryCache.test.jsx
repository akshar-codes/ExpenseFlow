import React from "react";
import { act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import CategoryProvider from "../src/context/CategoryProvider";
import CategoryContext from "../src/context/CategoryContext";
import useCategories, { clearCategoryCache } from "../src/hooks/useCategories";

// ─── Mock API ─────────────────────────────────────────────────────────────────

vi.mock("../src/api/categoryApi", () => ({
  getCategories: vi.fn(),
}));

import { getCategories } from "../src/api/categoryApi";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES = [
  { _id: "cat-1", name: "Food", type: "expense" },
  { _id: "cat-2", name: "Salary", type: "income" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps a component in CategoryProvider for integration-style tests.
 */
// const withProvider = (ui) => render(<CategoryProvider>{ui}</CategoryProvider>);

/**
 * Renders useCategories hook inside CategoryProvider.
 */
const renderWithProvider = () =>
  renderHook(() => useCategories(), {
    wrapper: ({ children }) => <CategoryProvider>{children}</CategoryProvider>,
  });

// ══════════════════════════════════════════════════════════════════════════════
// PART 2 — Category Cache
// ══════════════════════════════════════════════════════════════════════════════

describe("category caching behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial load ─────────────────────────────────────────────────────────

  describe("initial data fetch", () => {
    it("exposes an empty categories array while loading", async () => {
      // Never resolves during this test
      getCategories.mockReturnValue(new Promise(() => {}));

      const { result } = renderWithProvider();

      expect(result.current.categories).toEqual([]);
      expect(result.current.loading).toBe(true);
    });

    it("populates categories after a successful fetch", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].name).toBe("Food");
    });

    it("sets error when the API call fails", async () => {
      getCategories.mockRejectedValue(new Error("Network error"));

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(result.current.categories).toEqual([]);
    });
  });

  // ── CategoryProvider calls getCategories only once on mount ───────────────

  describe("fetch deduplication", () => {
    it("calls getCategories exactly once on mount", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(getCategories).toHaveBeenCalledTimes(1);
    });
  });

  // ── invalidate (re-fetch) ─────────────────────────────────────────────────

  describe("invalidate triggers a fresh fetch", () => {
    it("calls getCategories again when invalidate is invoked", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(getCategories).toHaveBeenCalledTimes(1);

      // Re-fetch on demand (e.g. after adding a category)
      const updatedCategories = [
        ...MOCK_CATEGORIES,
        { _id: "cat-3", name: "Transport", type: "expense" },
      ];
      getCategories.mockResolvedValue(updatedCategories);

      act(() => {
        // Access invalidate through context since useCategories exposes
        // categories/loading/error but not invalidate directly.
        // We test via the context value consumed inside the provider test below.
      });

      // Access invalidate from context directly
      const contextResult = renderHook(
        () => React.useContext(CategoryContext),
        {
          wrapper: ({ children }) => (
            <CategoryProvider>{children}</CategoryProvider>
          ),
        },
      );

      await waitFor(() =>
        expect(contextResult.result.current.loading).toBe(false),
      );

      act(() => {
        contextResult.result.current.invalidate();
      });

      await waitFor(() =>
        expect(contextResult.result.current.categories).toHaveLength(3),
      );

      // Called once on mount + once on invalidate = 2 total
      expect(getCategories.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── clearCategoryCache ────────────────────────────────────────────────────

  describe("clearCategoryCache", () => {
    it("is a no-op function that does not throw", () => {
      // Per useCategories.js the cache is held in-context (no module-level
      // cache map); clearCategoryCache is a stub exported for the auth flow.
      expect(() => clearCategoryCache()).not.toThrow();
    });

    it("can be called multiple times without error", () => {
      expect(() => {
        clearCategoryCache();
        clearCategoryCache();
        clearCategoryCache();
      }).not.toThrow();
    });
  });

  // ── useCategories default values ─────────────────────────────────────────

  describe("useCategories hook defaults", () => {
    it("returns default context values when consumed outside a provider", () => {
      // CategoryContext has a default value: { categories: [], loading: false, error: null }
      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // ── Logout invalidates category state ────────────────────────────────────

  describe("logout category invalidation", () => {
    it("resets categories to empty after clearCategoryCache + unmount", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result, unmount } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.categories).toHaveLength(2);

      // Simulate logout: clear cache then unmount (provider is torn down)
      act(() => {
        clearCategoryCache();
      });
      unmount();

      // A fresh mount should start from empty state
      getCategories.mockReturnValue(new Promise(() => {})); // hang to test initial state
      const { result: freshResult } = renderWithProvider();

      expect(freshResult.current.categories).toEqual([]);
    });

    it("re-fetches categories on remount after logout", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { unmount } = renderWithProvider();
      await waitFor(() => expect(getCategories).toHaveBeenCalledTimes(1));

      unmount();
      clearCategoryCache();

      // New provider mount (simulating post-login remount)
      const freshCategories = [
        { _id: "cat-new", name: "Bills", type: "expense" },
      ];
      getCategories.mockResolvedValue(freshCategories);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.categories[0].name).toBe("Bills");
      // Two total mounts → two fetch calls
      expect(getCategories).toHaveBeenCalledTimes(2);
    });
  });

  // ── Abort on unmount ──────────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("does not update state after the provider is unmounted", async () => {
      let resolveCategories;
      getCategories.mockReturnValue(
        new Promise((res) => {
          resolveCategories = res;
        }),
      );

      const { result, unmount } = renderWithProvider();

      unmount();

      // Resolve after unmount — should not trigger a state update warning
      await act(async () => {
        resolveCategories(MOCK_CATEGORIES);
        // Allow microtask queue to flush
        await Promise.resolve();
      });

      // result is stale after unmount; no error thrown is the passing condition
      expect(result.current.categories).toEqual([]);
    });
  });
});
