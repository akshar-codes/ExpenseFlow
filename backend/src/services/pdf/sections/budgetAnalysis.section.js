import {
  drawSectionTitle,
  drawProgressBar,
  formatINR,
} from "../pdfDrawHelpers.js";
import { PDF_THEME } from "../theme.js";

const { colors, fonts, fontSizes } = PDF_THEME;

export const renderBudgetAnalysisSection = (
  doc,
  { budgets, unavailableReason },
) => {
  drawSectionTitle(doc, "Budget Analysis", {
    subtitle: "Spending against category budgets for the selected period",
  });

  if (unavailableReason) {
    doc
      .fillColor(colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.body)
      .text(unavailableReason);
    return;
  }

  if (!budgets?.length) {
    doc
      .fillColor(colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.body)
      .text("No budgets were configured for this period.");
    return;
  }

  budgets.forEach((b) => {
    const rowHeight = 46;
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom)
      doc.addPage();

    const y = doc.y;
    doc
      .fillColor(colors.text)
      .font(fonts.bold)
      .fontSize(fontSizes.body)
      .text(b.categoryName, doc.page.margins.left, y);

    doc
      .fillColor(b.exceeded ? colors.expense : colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.small)
      .text(
        `${formatINR(b.spent)} of ${formatINR(b.limit)} (${b.percentage}%)`,
        doc.page.width - doc.page.margins.right - 200,
        y,
        { width: 200, align: "right" },
      );

    drawProgressBar(doc, {
      x: doc.page.margins.left,
      y: y + 18,
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      percentage: b.percentage,
      color: b.exceeded
        ? colors.expense
        : b.percentage >= 80
          ? colors.warning
          : colors.accent,
    });

    doc.y = y + rowHeight;
    doc.x = doc.page.margins.left;
  });
};
