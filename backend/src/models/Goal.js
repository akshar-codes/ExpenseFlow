import mongoose from "mongoose";

export const GOAL_STATUS = Object.freeze({
  ACTIVE: "active",
  COMPLETED: "completed",
  PAUSED: "paused",
  CANCELLED: "cancelled",
});

export const GOAL_PRIORITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(GOAL_PRIORITY),
      default: GOAL_PRIORITY.MEDIUM,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(GOAL_STATUS),
      default: GOAL_STATUS.ACTIVE,
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "target",
    },
    color: {
      type: String,
      trim: true,
      match: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
      default: "#6366f1",
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Virtuals ──────────────────────────────────────────────────────────────────

goalSchema.virtual("progressPercentage").get(function () {
  if (this.targetAmount <= 0) return 0;
  const pct = (this.currentAmount / this.targetAmount) * 100;
  return Math.min(Math.round(pct * 100) / 100, 100);
});

goalSchema.virtual("remainingAmount").get(function () {
  const rem = this.targetAmount - this.currentAmount;
  return Math.max(Math.round(rem * 100) / 100, 0);
});

goalSchema.virtual("daysRemaining").get(function () {
  const now = new Date();
  const target = new Date(this.targetDate);
  const diffMs = target - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

goalSchema.virtual("isOverdue").get(function () {
  return (
    this.status === GOAL_STATUS.ACTIVE && new Date() > new Date(this.targetDate)
  );
});

// ── Indexes ───────────────────────────────────────────────────────────────────

goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, priority: 1 });
goalSchema.index({ user: 1, targetDate: 1 });
goalSchema.index({ user: 1, createdAt: -1 });

// ── Pre-save hook: auto-complete when currentAmount >= targetAmount ────────────

goalSchema.pre("save", function (next) {
  if (
    this.currentAmount >= this.targetAmount &&
    this.status === GOAL_STATUS.ACTIVE
  ) {
    this.status = GOAL_STATUS.COMPLETED;
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  }

  // Reopen if amount goes back below target (e.g. correction)
  if (
    this.currentAmount < this.targetAmount &&
    this.status === GOAL_STATUS.COMPLETED
  ) {
    this.status = GOAL_STATUS.ACTIVE;
    this.completedAt = null;
  }

  next();
});

export const Goal = mongoose.model("Goal", goalSchema);
