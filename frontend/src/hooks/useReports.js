import { useState, useEffect, useCallback } from "react";
import {
  generateReport as generateReportAPI,
  getReports,
  downloadReport as downloadReportAPI,
  emailReport as emailReportAPI,
  deleteReport as deleteReportAPI,
} from "../api/reportApi";

const useReports = () => {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = await getReports(params);
      setReports(data.reports ?? []);
      setPagination(
        data.pagination ?? { total: 0, page: 1, pages: 1, limit: 10 },
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load report history.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generate = useCallback(
    async (payload) => {
      setGenerating(true);
      setError("");
      try {
        const report = await generateReportAPI(payload);
        await fetchReports();
        return report;
      } catch (err) {
        const message =
          err?.response?.data?.message || "Failed to generate report.";
        setError(message);
        throw new Error(message);
      } finally {
        setGenerating(false);
      }
    },
    [fetchReports],
  );

  const download = useCallback(async (report) => {
    try {
      await downloadReportAPI(report._id, report.fileName);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to download report.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const emailIt = useCallback(async (reportId, to) => {
    try {
      return await emailReportAPI(reportId, { to });
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to email report.";
      throw new Error(message);
    }
  }, []);

  const remove = useCallback(async (reportId) => {
    try {
      await deleteReportAPI(reportId);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to delete report.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  return {
    reports,
    pagination,
    loading,
    generating,
    error,
    setError,
    fetchReports,
    generate,
    download,
    emailIt,
    remove,
  };
};

export default useReports;
