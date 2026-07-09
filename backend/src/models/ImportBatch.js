import mongoose from "mongoose";
import { IMPORT_STATUS, IMPORT_SOURCE } from "../utils/constants.js";

const importBatchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: Object.values(IMPORT_SOURCE),
      required: true,
    },

    fileName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(IMPORT_STATUS),
      default: IMPORT_STATUS.PENDING,
    },

    totalRows: { type: Number, default: 0 },
    importedCount: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    errorRows: { type: Number, default: 0 },
    categoryAutoAssignedCount: { type: Number, default: 0 },

    // Resolved column mapping used for this import (field -> CSV header name).
    columnMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    errors: {
      type: [String],
      default: [],
    },

    rolledBackAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Primary query: a user's import history, most recent first.
importBatchSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("ImportBatch", importBatchSchema);
