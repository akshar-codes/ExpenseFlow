import mongoose from "mongoose";

const deletionTombstoneSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

export default mongoose.model("DeletionTombstone", deletionTombstoneSchema);
