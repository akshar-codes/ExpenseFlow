import { drawSectionTitle, drawKeyValueGrid } from "../pdfDrawHelpers.js";
import { PDF_THEME } from "../theme.js";

const { colors, fonts, fontSizes } = PDF_THEME;

export const renderFinancialHealthSection = (doc, { healthScore }) => {
  drawSectionTitle(doc, "Financial Health", {
    subtitle:
      "Composite score based on savings rate, budget adherence, and goal progress",
  });

  const gradeColor =
    PDF_THEME.colors.gradeColors[healthScore.grade] || colors.text;

  const cx = doc.page.margins.left + 40;
  const cy = doc.y + 40;

  doc.circle(cx, cy, 38).lineWidth(8).strokeColor(colors.border).stroke();
  if (healthScore.score != null) {
    doc.circle(cx, cy, 38).lineWidth(8).strokeColor(gradeColor).stroke();
  }
  doc
    .fillColor(gradeColor)
    .font(fonts.bold)
    .fontSize(20)
    .text(healthScore.grade || "-", cx - 15, cy - 12, {
      width: 30,
      align: "center",
    });

  doc
    .fillColor(colors.text)
    .font(fonts.regular)
    .fontSize(fontSizes.body)
    .text(healthScore.summary || "No summary available.", cx + 60, cy - 20, {
      width: doc.page.width - doc.page.margins.right - (cx + 60),
    });

  doc.y = cy + 60;
  doc.x = doc.page.margins.left;

  drawKeyValueGrid(doc, [
    {
      label: "Score",
      value: healthScore.score != null ? `${healthScore.score} / 100` : "N/A",
    },
    { label: "Grade", value: healthScore.grade || "N/A", color: gradeColor },
    { label: "Basis", value: healthScore.source },
  ]);
};
