import {
  drawSectionTitle,
  drawKeyValueGrid,
  drawTable,
  formatINR,
} from "../pdfDrawHelpers.js";
import { drawBarChart } from "../chartHelpers.js";
import { PDF_THEME } from "../theme.js";

const { colors, fonts, fontSizes } = PDF_THEME;

export const renderIncomeExpenseSection = (
  doc,
  { summary, monthlyTrend, expenseByCategory, incomeByCategory },
) => {
  drawSectionTitle(doc, "Income & Expense Summary", {
    subtitle: "Overview of cash flow for the selected period",
  });

  drawKeyValueGrid(doc, [
    {
      label: "Total Income",
      value: formatINR(summary.income),
      color: colors.income,
    },
    {
      label: "Total Expenses",
      value: formatINR(summary.expense),
      color: colors.expense,
    },
    {
      label: "Net Balance",
      value: formatINR(summary.balance),
      color: summary.balance >= 0 ? colors.income : colors.expense,
    },
    { label: "Savings Rate", value: `${summary.savingsRate}%` },
    { label: "Transactions", value: String(summary.transactionCount) },
    { label: "Avg. Transaction", value: formatINR(summary.avgTransaction) },
  ]);

  doc.moveDown(1);

  if (monthlyTrend?.length > 1) {
    drawBarChart(doc, {
      data: monthlyTrend,
      valueKey: "income",
      secondaryKey: "expense",
      barColor: colors.income,
      secondaryColor: colors.expense,
      labelKey: "label",
      title: "Income vs Expense Trend",
    });
    doc.moveDown(1);
  }

  if (expenseByCategory?.length) {
    doc
      .fillColor(colors.text)
      .font(fonts.bold)
      .fontSize(fontSizes.h2)
      .text("Top Expense Categories");
    doc.moveDown(0.3);
    drawTable(doc, {
      columns: [
        { key: "category", label: "Category", flex: 3 },
        {
          key: "total",
          label: "Amount",
          flex: 2,
          align: "right",
          render: (r) => formatINR(r.total),
        },
        {
          key: "share",
          label: "Share",
          flex: 1,
          align: "right",
          render: (r) =>
            `${summary.expense > 0 ? Math.round((r.total / summary.expense) * 100) : 0}%`,
        },
      ],
      rows: expenseByCategory.slice(0, 10),
    });
  }

  if (incomeByCategory?.length) {
    doc.moveDown(0.5);
    doc
      .fillColor(colors.text)
      .font(fonts.bold)
      .fontSize(fontSizes.h2)
      .text("Income Sources");
    doc.moveDown(0.3);
    drawTable(doc, {
      columns: [
        { key: "category", label: "Source", flex: 3 },
        {
          key: "total",
          label: "Amount",
          flex: 2,
          align: "right",
          render: (r) => formatINR(r.total),
        },
      ],
      rows: incomeByCategory.slice(0, 10),
    });
  }
};
