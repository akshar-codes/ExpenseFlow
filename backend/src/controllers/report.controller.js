import fs from "fs";
import {
  generateReportService,
  listReportsService,
  getReportService,
  getReportFileService,
  deleteReportService,
  emailReportService,
} from "../services/report.service.js";
import { ServiceError } from "../utils/ServiceError.js";

const handleError = (err, res, next) => {
  if (err instanceof ServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  next(err);
};

// @route   POST /api/reports/generate
// @access  Private
export const generateReport = async (req, res, next) => {
  try {
    const report = await generateReportService(req.user._id, req.body);
    res.status(201).json(report);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/reports
// @access  Private
export const listReports = async (req, res, next) => {
  try {
    const result = await listReportsService(req.user._id, req.query);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/reports/:id
// @access  Private
export const getReport = async (req, res, next) => {
  try {
    const report = await getReportService(req.user._id, req.params.id);
    res.status(200).json(report);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   GET /api/reports/:id/download
// @access  Private
export const downloadReport = async (req, res, next) => {
  try {
    const report = await getReportFileService(req.user._id, req.params.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${report.fileName}"`,
    );

    const stream = fs.createReadStream(report.filePath);
    stream.on("error", () =>
      handleError(
        new ServiceError("Failed to stream report file", 500),
        res,
        next,
      ),
    );
    stream.pipe(res);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   POST /api/reports/:id/email
// @access  Private
export const emailReport = async (req, res, next) => {
  try {
    const result = await emailReportService(
      req.user._id,
      req.params.id,
      req.body,
    );
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

// @route   DELETE /api/reports/:id
// @access  Private
export const deleteReport = async (req, res, next) => {
  try {
    await deleteReportService(req.user._id, req.params.id);
    res.status(200).json({ message: "Report deleted" });
  } catch (err) {
    handleError(err, res, next);
  }
};
