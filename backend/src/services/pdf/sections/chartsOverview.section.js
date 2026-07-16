import { drawSectionTitle } from "../pdfDrawHelpers.js";
import { drawPieChart } from "../chartHelpers.js";

export const renderChartsSection = (
  doc,
  { expenseByCategory, incomeByCategory },
) => {
  drawSectionTitle(doc, "Visual Breakdown", {
    subtitle: "Category-wise distribution",
  });

  if (expenseByCategory?.length) {
    drawPieChart(doc, {
      data: expenseByCategory.slice(0, 8),
      valueKey: "total",
      labelKey: "category",
      title: "Expenses by Category",
    });
    doc.moveDown(1.5);
  }

  if (incomeByCategory?.length) {
    drawPieChart(doc, {
      data: incomeByCategory.slice(0, 8),
      valueKey: "total",
      labelKey: "category",
      title: "Income by Source",
    });
  }
};
