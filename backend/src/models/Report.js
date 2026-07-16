import mongoose from "mongoose";

const REPORT_TYPES = ["monthly", "custom"];
const REPORT_STATUSES = ["generating", "completed", "failed"];

// Single source of truth for selectable report sections — imported by the
// PDF builder, the Joi validator, and the frontend section-picker.
export const REPORT_SECTION_KEYS = Object.freeze([
  "cover",
  "income",
  "expense",
  "charts",
  "budget",
  "goals",
  "health",
  "aiSummary",
]);

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    success: { type: Boolean, required: true },
    error: { type: String, default: null },
  },
  { _id: false },
);

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: REPORT_TYPES,
      required: true,
    },

    // Populated when type === "monthly"
    month: { type: Number, min: 1, max: 12, default: null },
    year: { type: Number, default: null },

    // Populated when type === "custom"
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    sectionsIncluded: {
      type: [String],
      enum: REPORT_SECTION_KEYS,
      default: REPORT_SECTION_KEYS,
    },

    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "generating",
    },

    fileName: { type: String, default: null },
    filePath: { type: String, default: null },
    fileSizeBytes: { type: Number, default: null },

    error: { type: String, default: null },

    emailHistory: { type: [emailLogSchema], default: [] },

    generatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Primary query: a user's report history, most recent first.
reportSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
