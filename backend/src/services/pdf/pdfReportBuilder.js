import PDFDocument from "pdfkit";
import { PDF_THEME } from "./theme.js";
import { attachRunningHeader, finalizeWithFooters } from "./pdfDrawHelpers.js";
import { REPORT_SECTION_KEYS } from "../../models/Report.js";

import { renderCoverPage } from "./sections/coverPage.section.js";
import { renderIncomeExpenseSection } from "./sections/incomeExpense.section.js";
import { renderChartsSection } from "./sections/chartsOverview.section.js";
import { renderBudgetAnalysisSection } from "./sections/budgetAnalysis.section.js";
import { renderGoalProgressSection } from "./sections/goalProgress.section.js";
import { renderFinancialHealthSection } from "./sections/financialHealth.section.js";
import { renderAISummarySection } from "./sections/aiSummary.section.js";

/**
 * Builds a financial report PDF and streams it to the given writable stream.
 */
export const buildReportPdf = ({ data, sections, writeStream }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PDF_THEME.page.size,
      margin: PDF_THEME.page.margin,
      bufferPages: true,
      info: {
        Title: `ExpenseTracker Report — ${data.period.label}`,
        Author: "ExpenseTracker",
        Subject: "Personal Finance Report",
      },
    });

    doc.pipe(writeStream);

    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    doc.on("error", reject);

    attachRunningHeader(doc, {
      title: `ExpenseTracker Report — ${data.period.label}`,
    });

    const include = new Set(sections?.length ? sections : REPORT_SECTION_KEYS);

    if (include.has("cover")) {
      renderCoverPage(doc, {
        user: data.user,
        period: data.period,
        summary: data.summary,
        type: data.type,
      });
    }

    doc
      .font(PDF_THEME.fonts.regular)
      .fontSize(PDF_THEME.fontSizes.body)
      .fillColor(PDF_THEME.colors.text);

    if (include.has("income") || include.has("expense")) {
      renderIncomeExpenseSection(doc, data);
      doc.moveDown(1.2);
    }

    if (include.has("charts")) {
      renderChartsSection(doc, data);
      doc.moveDown(1.2);
    }

    if (include.has("budget")) {
      renderBudgetAnalysisSection(doc, {
        budgets: data.budgets,
        unavailableReason: data.budgetsUnavailableReason,
      });
      doc.moveDown(1.2);
    }

    if (include.has("goals")) {
      renderGoalProgressSection(doc, { goals: data.goals });
      doc.moveDown(1.2);
    }

    if (include.has("health")) {
      renderFinancialHealthSection(doc, { healthScore: data.healthScore });
      doc.moveDown(1.2);
    }

    if (include.has("aiSummary")) {
      renderAISummarySection(doc, data.aiSummary);
    }

    finalizeWithFooters(doc, { generatedFor: data.user.name });

    doc.end();
  });
