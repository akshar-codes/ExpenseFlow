// Central design tokens for PDF report generation.
// Mirrors the app's dashboard palette, adapted for a printable white-background
// document (dark-theme colors don't translate well to print/paper).

export const PDF_THEME = Object.freeze({
  page: {
    size: "A4",
    margin: 48,
  },
  colors: {
    text: "#18181b",
    textMuted: "#52525b",
    textSubtle: "#71717a",
    border: "#e4e4e7",
    borderStrong: "#a1a1aa",
    background: "#ffffff",
    sectionBg: "#f4f4f5",
    zebraRow: "#fafafa",
    accent: "#6366f1",
    accentDark: "#4f46e5",
    income: "#16a34a",
    expense: "#dc2626",
    warning: "#d97706",
    positive: "#16a34a",
    white: "#ffffff",
    gradeColors: {
      A: "#16a34a",
      B: "#65a30d",
      C: "#d97706",
      D: "#ea580c",
      F: "#dc2626",
    },
    pie: [
      "#6366f1",
      "#16a34a",
      "#dc2626",
      "#d97706",
      "#a78bfa",
      "#0ea5e9",
      "#ec4899",
      "#14b8a6",
      "#84cc16",
      "#f43f5e",
    ],
  },
  fonts: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    oblique: "Helvetica-Oblique",
  },
  fontSizes: {
    title: 26,
    h1: 18,
    h2: 13,
    body: 10,
    small: 8.5,
    label: 8,
  },
});
