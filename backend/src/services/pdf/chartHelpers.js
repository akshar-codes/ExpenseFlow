import { PDF_THEME } from "./theme.js";
import { ensureSpace } from "./pdfDrawHelpers.js";

const { colors, fonts, fontSizes } = PDF_THEME;

/**
 * Simple grouped/single bar chart drawn with native PDFKit rectangles.
 * `data`: [{ [labelKey]: string, [valueKey]: number, [secondaryKey]?: number }]
 */
export const drawBarChart = (
  doc,
  {
    data,
    width,
    height = 160,
    barColor = colors.accent,
    secondaryColor,
    secondaryKey,
    valueKey = "value",
    labelKey = "label",
    title,
  },
) => {
  if (!data?.length) return;
  ensureSpace(doc, height + 50);

  if (title) {
    doc
      .fillColor(colors.text)
      .font(fonts.bold)
      .fontSize(fontSizes.h2)
      .text(title);
    doc.moveDown(0.3);
  }

  const chartX = doc.page.margins.left;
  const chartY = doc.y;
  const chartWidth =
    width ?? doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartHeight = height;

  const maxValue = Math.max(
    1,
    ...data.map((d) =>
      Math.max(d[valueKey] ?? 0, secondaryKey ? (d[secondaryKey] ?? 0) : 0),
    ),
  );

  const barGroupWidth = chartWidth / data.length;
  const barWidth = secondaryKey ? barGroupWidth * 0.3 : barGroupWidth * 0.5;

  doc
    .strokeColor(colors.border)
    .lineWidth(0.5)
    .moveTo(chartX, chartY + chartHeight)
    .lineTo(chartX + chartWidth, chartY + chartHeight)
    .stroke();

  data.forEach((d, i) => {
    const groupX = chartX + i * barGroupWidth;
    const primaryVal = d[valueKey] ?? 0;
    const primaryH = (primaryVal / maxValue) * (chartHeight - 20);
    const primaryX = secondaryKey
      ? groupX + barGroupWidth * 0.15
      : groupX + (barGroupWidth - barWidth) / 2;

    doc
      .rect(primaryX, chartY + chartHeight - primaryH, barWidth, primaryH)
      .fill(barColor);

    if (secondaryKey) {
      const secVal = d[secondaryKey] ?? 0;
      const secH = (secVal / maxValue) * (chartHeight - 20);
      const secX = primaryX + barWidth + 4;
      doc
        .rect(secX, chartY + chartHeight - secH, barWidth, secH)
        .fill(secondaryColor || colors.expense);
    }

    doc
      .fillColor(colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.label)
      .text(String(d[labelKey] ?? ""), groupX, chartY + chartHeight + 4, {
        width: barGroupWidth,
        align: "center",
      });
  });

  doc.y = chartY + chartHeight + 20;
  doc.x = chartX;
};

/**
 * Pie chart drawn as polygon-approximated arc slices (PDFKit has no native
 * arc-fill primitive). `data`: [{ [labelKey]: string, [valueKey]: number }]
 */
export const drawPieChart = (
  doc,
  {
    data,
    radius = 65,
    valueKey = "total",
    labelKey = "category",
    title,
    palette,
  },
) => {
  if (!data?.length) return;
  const colorPalette = palette || colors.pie;
  const total = data.reduce((s, d) => s + (d[valueKey] ?? 0), 0);
  if (total <= 0) return;

  const legendRows = Math.ceil(data.length);
  const requiredHeight = radius * 2 + 40;
  ensureSpace(doc, requiredHeight);

  if (title) {
    doc
      .fillColor(colors.text)
      .font(fonts.bold)
      .fontSize(fontSizes.h2)
      .text(title);
    doc.moveDown(0.3);
  }

  const cx = doc.page.margins.left + radius + 10;
  const cy = doc.y + radius;

  let startAngle = -Math.PI / 2;
  const segments = 72;

  data.forEach((d, i) => {
    const value = d[valueKey] ?? 0;
    const sliceAngle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const color = colorPalette[i % colorPalette.length];

    doc.moveTo(cx, cy);
    for (let s = 0; s <= segments; s++) {
      const a = startAngle + (sliceAngle * s) / segments;
      doc.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    }
    doc.lineTo(cx, cy);
    doc.fill(color);

    startAngle = endAngle;
  });

  const legendX = cx + radius + 30;
  let legendY = cy - radius;
  const maxLegendY = cy + radius - 10;

  data.forEach((d, i) => {
    if (legendY > maxLegendY) return; // keep legend within chart bounds
    const color = colorPalette[i % colorPalette.length];
    const pct = Math.round(((d[valueKey] ?? 0) / total) * 100);
    doc.rect(legendX, legendY, 8, 8).fill(color);
    doc
      .fillColor(colors.text)
      .font(fonts.regular)
      .fontSize(fontSizes.small)
      .text(`${d[labelKey]} (${pct}%)`, legendX + 12, legendY - 1, {
        width: 170,
      });
    legendY += 16;
  });

  doc.y = cy + radius + 20;
  doc.x = doc.page.margins.left;
};
