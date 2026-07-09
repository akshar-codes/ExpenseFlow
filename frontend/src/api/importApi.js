import API from "./axios";

// ─── Preview (read-only — parses a sample, no DB writes) ──────────────────────

export const previewImport = async ({ source, csvContent, columnMapping }) => {
  const res = await API.post("/import/preview", {
    source,
    csvContent,
    columnMapping,
  });
  return res.data;
};

// ─── Commit (parses all rows, dedupes, categorizes, bulk-inserts) ─────────────

export const commitImport = async ({
  source,
  csvContent,
  columnMapping,
  fileName,
  skipDuplicates,
}) => {
  const res = await API.post("/import/commit", {
    source,
    csvContent,
    columnMapping,
    fileName,
    skipDuplicates,
  });
  return res.data;
};

// ─── Batch history ─────────────────────────────────────────────────────────────

export const getImportBatches = async () => {
  const res = await API.get("/import");
  return res.data;
};

export const getImportBatch = async (id) => {
  const res = await API.get(`/import/${id}`);
  return res.data;
};

// ─── Rollback ───────────────────────────────────────────────────────────────────

export const rollbackImport = async (id) => {
  const res = await API.delete(`/import/${id}`);
  return res.data;
};
