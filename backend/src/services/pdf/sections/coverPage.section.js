import { PDF_THEME } from "../theme.js";
import { formatINR } from "../pdfDrawHelpers.js";

const { colors, fonts, fontSizes } = PDF_THEME;

export const renderCoverPage = (doc, { user, period, summary, type }) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  doc.rect(0, 0, pageWidth, 220).fill(colors.accent);

  doc
    .fillColor(colors.white)
    .font(fonts.bold)
    .fontSize(fontSizes.label)
    .text("EXPENSETRACKER", 48, 60, { characterSpacing: 2 });

  doc
    .fillColor(colors.white)
    .font(fonts.bold)
    .fontSize(fontSizes.title)
    .text(
      type === "monthly"
        ? "Monthly Financial Report"
        : "Custom Financial Report",
      48,
      90,
      { width: pageWidth - 96 },
    );

  doc
    .fillColor(colors.white)
    .font(fonts.regular)
    .fontSize(fontSizes.h2)
    .text(period.label, 48, 140);

  doc
    .fillColor(colors.white)
    .font(fonts.regular)
    .fontSize(fontSizes.body)
    .text(`Prepared for ${user.name} (${user.email})`, 48, 165);

  doc.y = 260;
  doc.x = 48;

  const stats = [
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
  ];

  const boxWidth = (pageWidth - 96 - 24) / 3;
  stats.forEach((s, i) => {
    const x = 48 + i * (boxWidth + 12);
    const y = doc.y;
    doc
      .roundedRect(x, y, boxWidth, 80, 8)
      .fillAndStroke(colors.sectionBg, colors.border);
    doc
      .fillColor(colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.label)
      .text(s.label.toUpperCase(), x + 14, y + 16, { width: boxWidth - 28 });
    doc
      .fillColor(s.color)
      .font(fonts.bold)
      .fontSize(fontSizes.h1)
      .text(s.value, x + 14, y + 36, { width: boxWidth - 28 });
  });

  doc.y += 110;
  doc.x = 48;

  doc
    .fillColor(colors.textSubtle)
    .font(fonts.regular)
    .fontSize(fontSizes.small)
    .text(
      `Report generated on ${new Date().toLocaleString("en-IN")}`,
      48,
      pageHeight - 80,
    );

  doc.addPage();
};
