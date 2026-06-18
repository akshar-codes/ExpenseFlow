import mongoose from "mongoose";

/**
 * Contribution — a deposit toward a Goal's currentAmount.
 *
 * Contributions can be:
 *   - manual  : user adds money explicitly through the UI
 *   - linked  : derived from an existing Transaction (e.g. "allocate ₹5,000
 *               of my Salary transaction to my Emergency Fund")
 *
 * When a Contribution is created, the linked Goal's currentAmount is
 * incremented by `amount`.  When a Contribution is undone (soft-deleted via
 * isUndone), the amount is subtracted back.  Hard deletes are never performed
 * so audit history is always intact.
 */

export const CONTRIBUTION_SOURCE = Object.freeze({
  MANUAL: "manual",
  LINKED: "linked",
});

const contributionSchema = new mongoose.Schema(
  {
    // ── Ownership ───────────────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true,
    },

    // ── Core fields ─────────────────────────────────────────────────────────
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    // Date the contribution is attributed to (defaults to now).
    // Allows back-dating ("I actually saved this last week").
    date: {
      type: Date,
      default: Date.now,
    },

    // "manual" | "linked"
    source: {
      type: String,
      enum: Object.values(CONTRIBUTION_SOURCE),
      default: CONTRIBUTION_SOURCE.MANUAL,
    },

    // Optional: the Transaction that funded this contribution
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    // ── Soft-undo ────────────────────────────────────────────────────────────
    // We never hard-delete contributions; we reverse the amount and record
    // the undo timestamp for audit purposes.
    isUndone: {
      type: Boolean,
      default: false,
      index: true,
    },

    undoneAt: {
      type: Date,
      default: null,
    },

    // Snapshot of the goal's currentAmount *before* this contribution was
    // applied, so we can always reconstruct history.
    snapshotBefore: {
      type: Number,
      default: null,
    },

    // Snapshot after (= snapshotBefore + amount)
    snapshotAfter: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary query: user's contributions for a goal, sorted by date desc
contributionSchema.index({ user: 1, goal: 1, date: -1 });

// Monthly savings chart: all contributions by user in date range
contributionSchema.index({ user: 1, date: -1, isUndone: 1 });

// Prevent re-linking the same transaction to the same goal twice
contributionSchema.index(
  { goal: 1, transaction: 1 },
  {
    unique: true,
    partialFilterExpression: {
      transaction: { $type: "objectId" },
      isUndone: false,
    },
    name: "contributions_goal_transaction_unique",
  },
);

export default mongoose.model("Contribution", contributionSchema);
