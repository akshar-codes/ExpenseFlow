import { PDF_THEME } from "./theme.js";

const { colors, fonts, fontSizes } = PDF_THEME;

// ─── Formatting ─────────────────────────────────────────────────────────────

export const formatINR = (value) => {
  const num = Number(value ?? 0);
  return `Rs. ${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

// ─── Layout primitives ──────────────────────────────────────────────────────

/**
 * Adds a new page if the given height would overflow the current page.
 * Returns true if a page break occurred.
 */
export const ensureSpace = (doc, requiredHeight) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + requiredHeight > bottom) {
    doc.addPage();
    return true;
  }
  return false;
};

export const drawDivider = (doc, { color = colors.border } = {}) => {
  doc.moveDown(0.3);
  doc
    .strokeColor(color)
    .lineWidth(0.75)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);
};

export const drawSectionTitle = (doc, text, { subtitle } = {}) => {
  ensureSpace(doc, 60);
  doc
    .fillColor(colors.accent)
    .font(fonts.bold)
    .fontSize(fontSizes.h1)
    .text(text.toUpperCase(), { characterSpacing: 0.5 });

  if (subtitle) {
    doc
      .moveDown(0.15)
      .fillColor(colors.textMuted)
      .font(fonts.regular)
      .fontSize(fontSizes.body)
      .text(subtitle);
  }

  doc.moveDown(0.4);
  drawDivider(doc, { color: colors.accent });
  doc.fillColor(colors.text).font(fonts.regular).fontSize(fontSizes.body);
};

/**
 * Renders a responsive grid of {label, value, color} stat cells.
 */
export const drawKeyValueGrid = (doc, items, { columns = 3 } = {}) => {
  const usableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = usableWidth / columns;
  const rowHeight = 46;
  const rows = Math.ceil(items.length / columns);
  ensureSpace(doc, rowHeight * rows + 10);

  const startX = doc.page.margins.left;
  const startY = doc.y;

  items.forEach((item, idx) => {
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const x = startX + col * colWidth;
    const y = startY + row * rowHeight;

    doc
      .fillColor(colors.textSubtle)
      .font(fonts.regular)
      .fontSize(fontSizes.label)
      .text(String(item.label).toUpperCase(), x, y, {
        width: colWidth - 12,
        characterSpacing: 0.4,
      });

    doc
      .fillColor(item.color || colors.text)
      .font(fonts.bold)
      .fontSize(fontSizes.h2)
      .text(String(item.value), x, y + 12, { width: colWidth - 12 });
  });

  doc.y = startY + rowHeight * rows;
  doc.x = startX;
};

/**
 * Renders a simple bordered table with a header row, zebra striping, and
 * automatic pagination (re-draws the header row on each new page).
 */
export const drawTable = (doc, { columns, rows, zebra = true }) => {
  const usableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const totalFlex = columns.reduce((s, c) => s + (c.flex ?? 1), 0);
  const colWidths = columns.map(
    (c) => (usableWidth * (c.flex ?? 1)) / totalFlex,
  );
  const rowHeight = 22;
  const startX = doc.page.margins.left;

  const drawHeaderRow = () => {
    ensureSpace(doc, rowHeight + 4);
    let x = startX;
    const y = doc.y;
    doc.rect(startX, y, usableWidth, rowHeight).fill(colors.sectionBg);
    columns.forEach((col, i) => {
      doc
        .fillColor(colors.textMuted)
        .font(fonts.bold)
        .fontSize(fontSizes.small)
        .text(col.label.toUpperCase(), x + 6, y + 6, {
          width: colWidths[i] - 12,
          align: col.align || "left",
        });
      x += colWidths[i];
    });
    doc.y = y + rowHeight;
  };

  drawHeaderRow();

  rows.forEach((row, rIdx) => {
    if (ensureSpace(doc, rowHeight)) {
      drawHeaderRow();
    }
    let x = startX;
    const y = doc.y;

    if (zebra && rIdx % 2 === 1) {
      doc.rect(startX, y, usableWidth, rowHeight).fill(colors.zebraRow);
    }

    columns.forEach((col, i) => {
      const cellValue = col.render
        ? col.render(row)
        : String(row[col.key] ?? "");
      doc
        .fillColor(col.color?.(row) || colors.text)
        .font(fonts.regular)
        .fontSize(fontSizes.small)
        .text(cellValue, x + 6, y + 6, {
          width: colWidths[i] - 12,
          align: col.align || "left",
        });
      x += colWidths[i];
    });

    doc.y = y + rowHeight;
  });

  doc.moveDown(0.5);
};

export const drawProgressBar = (
  doc,
  { x, y, width, height = 8, percentage, color, trackColor = colors.border },
) => {
  const clamped = Math.max(0, Math.min(100, percentage ?? 0));
  doc.roundedRect(x, y, width, height, height / 2).fill(trackColor);
  if (clamped > 0) {
    doc
      .roundedRect(x, y, (width * clamped) / 100, height, height / 2)
      .fill(color);
  }
};

// ─── Running header / footer ────────────────────────────────────────────────

/**
 * Draws a slim running header at the top of every page after the cover page.
 * Must be attached BEFORE any addPage() calls so it fires on subsequent pages.
 */
export const attachRunningHeader = (doc, { title, skipFirstPage = true }) => {
  let pageIndex = 0;
  doc.on("pageAdded", () => {
    pageIndex += 1;
    if (skipFirstPage && pageIndex === 1) return;

    doc
      .fillColor(colors.textSubtle)
      .font(fonts.regular)
      .fontSize(fontSizes.label)
      .text(title, doc.page.margins.left, 20, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "left",
      });
    doc
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .moveTo(doc.page.margins.left, 34)
      .lineTo(doc.page.width - doc.page.margins.right, 34)
      .stroke();
    doc.y = doc.page.margins.top;
    doc.x = doc.page.margins.left;
  });
};

/**
 * Must be called once, right before doc.end(), with { bufferPages: true }
 * set when the PDFDocument was constructed. Adds "Page X of Y" + a footer
 * label to every buffered page.
 */
export const finalizeWithFooters = (doc, { generatedFor }) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 30;
    doc
      .fillColor(colors.textSubtle)
      .font(fonts.regular)
      .fontSize(fontSizes.label)
      .text(
        `${generatedFor} · Generated by ExpenseTracker`,
        doc.page.margins.left,
        bottom,
        {
          width: 300,
          align: "left",
        },
      );
    doc.text(
      `Page ${i - range.start + 1} of ${range.count}`,
      doc.page.width - doc.page.margins.right - 150,
      bottom,
      { width: 150, align: "right" },
    );
  }
};
