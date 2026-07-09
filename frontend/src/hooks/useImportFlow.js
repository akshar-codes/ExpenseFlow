import { useState, useCallback } from "react";
import {
  previewImport as previewImportAPI,
  commitImport as commitImportAPI,
  rollbackImport as rollbackImportAPI,
} from "../api/importApi";

export const IMPORT_STEPS = Object.freeze({
  SELECT: "select",
  MAPPING: "mapping",
  IMPORTING: "importing",
  SUMMARY: "summary",
});

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(new Error("Failed to read the selected file"));
    reader.readAsText(file);
  });

const useImportFlow = () => {
  const [step, setStep] = useState(IMPORT_STEPS.SELECT);
  const [source, setSource] = useState("");
  const [file, setFile] = useState(null);
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [progressStage, setProgressStage] = useState("");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStep(IMPORT_STEPS.SELECT);
    setSource("");
    setFile(null);
    setCsvContent("");
    setPreview(null);
    setColumnMapping({});
    setSummary(null);
    setError("");
    setLoading(false);
  }, []);

  const handleFileSelected = useCallback(
    async (selectedFile, selectedSource) => {
      setError("");

      if (!selectedSource) {
        setError("Please select a source before uploading a file.");
        return;
      }
      if (!selectedFile?.name?.toLowerCase().endsWith(".csv")) {
        setError("Only .csv files are supported.");
        return;
      }

      setLoading(true);
      setSource(selectedSource);
      setFile(selectedFile);

      try {
        const content = await readFileAsText(selectedFile);
        setCsvContent(content);

        const result = await previewImportAPI({
          source: selectedSource,
          csvContent: content,
        });

        setPreview(result);
        setColumnMapping(result.columnMapping);
        setStep(IMPORT_STEPS.MAPPING);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to parse the CSV file.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateMapping = useCallback((field, header) => {
    setColumnMapping((prev) => ({ ...prev, [field]: header }));
  }, []);

  const refreshPreviewWithMapping = useCallback(async () => {
    if (!csvContent || !source) return;
    setLoading(true);
    setError("");
    try {
      const result = await previewImportAPI({
        source,
        csvContent,
        columnMapping,
      });
      setPreview(result);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to refresh preview.");
    } finally {
      setLoading(false);
    }
  }, [csvContent, source, columnMapping]);

  const runImport = useCallback(async () => {
    setStep(IMPORT_STEPS.IMPORTING);
    setError("");
    setLoading(true);

    try {
      setProgressStage("Uploading file…");
      setProgressStage("Validating and mapping rows…");
      setProgressStage("Detecting duplicates and suggesting categories…");

      const result = await commitImportAPI({
        source,
        csvContent,
        columnMapping,
        fileName: file?.name,
        skipDuplicates,
      });

      setProgressStage("Finalising import…");
      setSummary(result);
      setStep(IMPORT_STEPS.SUMMARY);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Import failed. Please try again.",
      );
      setStep(IMPORT_STEPS.MAPPING);
    } finally {
      setLoading(false);
      setProgressStage("");
    }
  }, [source, csvContent, columnMapping, file, skipDuplicates]);

  const rollback = useCallback(async () => {
    if (!summary?.batchId) return;
    setLoading(true);
    setError("");
    try {
      await rollbackImportAPI(summary.batchId);
      setSummary((prev) => ({
        ...prev,
        status: "rolled_back",
        importedCount: 0,
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to roll back import.");
    } finally {
      setLoading(false);
    }
  }, [summary]);

  return {
    IMPORT_STEPS,
    step,
    source,
    file,
    preview,
    columnMapping,
    skipDuplicates,
    setSkipDuplicates,
    progressStage,
    summary,
    error,
    loading,
    handleFileSelected,
    updateMapping,
    refreshPreviewWithMapping,
    runImport,
    rollback,
    reset,
  };
};

export default useImportFlow;
