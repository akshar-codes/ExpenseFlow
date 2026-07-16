import path from "path";
import fs from "fs";
import Report, { REPORT_SECTION_KEYS } from "../models/Report.js";
import {
  collectMonthlyReportData,
  collectCustomReportData,
} from "./pdf/reportDataCollector.js";
import { buildReportPdf } from "./pdf/pdfReportBuilder.js";
import { ensureReportDir, deleteReportFile } from "../utils/reportStorage.js";
import { sendReportEmail } from "./reportEmail.service.js";
import { ServiceError } from "../utils/ServiceError.js";
import logger from "../config/logger.js";

const MAX_CUSTOM_RANGE_DAYS = 366;

// ─── Generate ─────────────────────────────────────────────────────────────

export const generateReportService = async (userId, body) => {
  const { type, month, year, startDate, endDate, sections } = body;

  let periodQuery;
  if (type === "monthly") {
    if (!month || !year) {
      throw new ServiceError(
        "month and year are required for monthly reports",
        400,
      );
    }
    periodQuery = { month: Number(month), year: Number(year) };
  } else {
    if (!startDate || !endDate) {
      throw new ServiceError(
        "startDate and endDate are required for custom reports",
        400,
      );
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s > e)
      throw new ServiceError("startDate must be on or before endDate", 400);

    const days = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (days > MAX_CUSTOM_RANGE_DAYS) {
      throw new ServiceError(
        `Custom range cannot exceed ${MAX_CUSTOM_RANGE_DAYS} days`,
        400,
      );
    }
    periodQuery = { startDate: s, endDate: e };
  }

  const report = await Report.create({
    user: userId,
    type,
    ...(type === "monthly"
      ? { month: periodQuery.month, year: periodQuery.year }
      : { startDate: periodQuery.startDate, endDate: periodQuery.endDate }),
    sectionsIncluded: sections?.length ? sections : REPORT_SECTION_KEYS,
    status: "generating",
  });

  try {
    const data =
      type === "monthly"
        ? await collectMonthlyReportData(
            userId,
            periodQuery.month,
            periodQuery.year,
          )
        : await collectCustomReportData(
            userId,
            periodQuery.startDate,
            periodQuery.endDate,
          );

    const dir = await ensureReportDir(userId);
    const fileName = `${type}-report-${report._id}.pdf`;
    const filePath = path.join(dir, fileName);

    await buildReportPdf({
      data,
      sections: report.sectionsIncluded,
      writeStream: fs.createWriteStream(filePath),
    });

    const { size } = fs.statSync(filePath);

    report.status = "completed";
    report.fileName = fileName;
    report.filePath = filePath;
    report.fileSizeBytes = size;
    report.generatedAt = new Date();
    await report.save();

    logger.info(
      { reportId: report._id, userId: String(userId), type },
      "report.service: report generated successfully",
    );

    return report;
  } catch (err) {
    report.status = "failed";
    report.error = err.message;
    await report.save();

    logger.error(
      { err, reportId: report._id, userId: String(userId) },
      "report.service: report generation failed",
    );

    throw err instanceof ServiceError
      ? err
      : new ServiceError("Failed to generate report", 500);
  }
};

// ─── List / Get ─────────────────────────────────────────────────────────────

export const listReportsService = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments({ user: userId }),
  ]);

  return {
    reports,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 0 },
  };
};

export const getReportService = async (userId, reportId) => {
  const report = await Report.findOne({ _id: reportId, user: userId });
  if (!report) throw new ServiceError("Report not found", 404);
  return report;
};

// ─── Download ───────────────────────────────────────────────────────────────

export const getReportFileService = async (userId, reportId) => {
  const report = await getReportService(userId, reportId);

  if (report.status !== "completed" || !report.filePath) {
    throw new ServiceError("Report is not available for download", 409);
  }
  if (!fs.existsSync(report.filePath)) {
    throw new ServiceError("Report file is missing on the server", 410);
  }

  return report;
};

// ─── Delete ─────────────────────────────────────────────────────────────────

export const deleteReportService = async (userId, reportId) => {
  const report = await getReportService(userId, reportId);
  if (report.filePath) {
    await deleteReportFile(report.filePath);
  }
  await report.deleteOne();
};

// ─── Email ──────────────────────────────────────────────────────────────────

export const emailReportService = async (userId, reportId, { to }) => {
  const report = await getReportFileService(userId, reportId);

  try {
    await sendReportEmail({
      to,
      reportType: report.type,
      periodLabel:
        report.type === "monthly"
          ? `${report.month}/${report.year}`
          : `${report.startDate?.toISOString().slice(0, 10)} to ${report.endDate?.toISOString().slice(0, 10)}`,
      filePath: report.filePath,
      fileName: report.fileName,
    });

    report.emailHistory.push({ to, success: true });
    await report.save();
    return { success: true };
  } catch (err) {
    report.emailHistory.push({ to, success: false, error: err.message });
    await report.save();

    logger.error(
      { err, reportId, userId: String(userId) },
      "report.service: failed to email report",
    );
    throw new ServiceError("Failed to send report email", 502);
  }
};
