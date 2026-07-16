import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reports are stored on local disk under backend/generated-reports/<userId>/.

const REPORTS_ROOT = path.resolve(__dirname, "../../generated-reports");

export const ensureReportDir = async (userId) => {
  const dir = path.join(REPORTS_ROOT, String(userId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const resolveReportPath = (userId, fileName) =>
  path.join(REPORTS_ROOT, String(userId), fileName);

export const deleteReportFile = async (filePath) => {
  try {
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (err) {
    // Non-fatal — the Report document is the source of truth for the API;
    // a stray file can be cleaned up manually or by a future retention job.
    console.warn(
      `[reportStorage] Failed to delete file ${filePath}:`,
      err.message,
    );
  }
};
