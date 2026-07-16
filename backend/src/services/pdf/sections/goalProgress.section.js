import {
  drawSectionTitle,
  drawProgressBar,
  formatINR,
} from "../pdfDrawHelpers.js";
import { PDF_THEME } from "../theme.js";

const { colors, fonts, fontSizes } = PDF_THEME;

export const renderGoalProgressSection = (doc, { goals }) => {
  drawSectionTitle(doc, "Financial Goals", {
    subtitle: "Progress toward active savings goals",
  });

  if (!goals?.length) {
    doc
      .fillColor(colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.body)
      .text("No active goals to report.");
    return;
  }

  goals.forEach((g) => {
    const rowHeight = 50;
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom)
      doc.addPage();

    const y = doc.y;
    doc
      .fillColor(colors.text)
      .font(fonts.bold)
      .fontSize(fontSizes.body)
      .text(g.title, doc.page.margins.left, y);

    doc
      .fillColor(colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.small)
      .text(
        `${formatINR(g.currentAmount)} of ${formatINR(g.targetAmount)} (${(g.progressPercentage ?? 0).toFixed(0)}%)`,
        doc.page.width - doc.page.margins.right - 220,
        y,
        { width: 220, align: "right" },
      );

    drawProgressBar(doc, {
      x: doc.page.margins.left,
      y: y + 18,
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      percentage: g.progressPercentage,
      color: g.progressPercentage >= 100 ? colors.income : colors.accent,
    });

    doc
      .fillColor(colors.textSubtle)
      .font(fonts.regular)
      .fontSize(fontSizes.label)
      .text(
        g.daysRemaining > 0
          ? `${g.daysRemaining} days remaining · ${g.priority} priority`
          : "Overdue",
        doc.page.margins.left,
        y + 30,
      );

    doc.y = y + rowHeight;
    doc.x = doc.page.margins.left;
  });
};
