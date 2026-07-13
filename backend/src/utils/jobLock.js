import mongoose from "mongoose";

const jobLockSchema = new mongoose.Schema({
  job: { type: String, required: true, unique: true },
  lockedAt: { type: Date, required: true, default: Date.now },
  lockedBy: { type: String },
});

jobLockSchema.index({ lockedAt: 1 }, { expireAfterSeconds: 600 });

const JobLock =
  mongoose.models.JobLock || mongoose.model("JobLock", jobLockSchema);

export const acquireJobLock = async (jobName, ttlMs = 9 * 60 * 1000) => {
  const lockedBy = `${process.env.HOSTNAME || "unknown"}:${process.pid}`;
  const staleThreshold = new Date(Date.now() - ttlMs);

  try {
    await JobLock.findOneAndUpdate(
      {
        job: jobName,
        lockedAt: { $lt: staleThreshold }, // only stale locks can be stolen
      },
      { $set: { lockedAt: new Date(), lockedBy } },
      { upsert: true },
    );
    return true;
  } catch (err) {
    // E11000: a fresh (non-stale) lock document already exists for this job
    if (err.code === 11000) return false;
    console.error(`[jobLock:${jobName}] Lock acquisition error:`, err.message);
    return false;
  }
};

export const releaseJobLock = async (jobName) => {
  try {
    await JobLock.deleteOne({ job: jobName });
  } catch (err) {
    console.warn(
      `[jobLock:${jobName}] Lock release failed (non-fatal):`,
      err.message,
    );
  }
};

export default JobLock;
