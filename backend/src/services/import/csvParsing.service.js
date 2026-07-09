import { parseCSVToObjects } from "../../utils/csvTokenizer.js";
import { getParser } from "./parsers/index.js";
import { ServiceError } from "../../utils/ServiceError.js";

const MAX_AMOUNT = 1_000_000_000;

export const resolveParser = (source) => {
  const parser = getParser(source);
  if (!parser) {
    throw new ServiceError(`Unsupported import source: ${source}`, 400);
  }
  return parser;
};

export const tokenizeCsv = (csvContent) => {
  const { headers, rows } = parseCSVToObjects(csvContent);
  if (headers.length === 0) {
    throw new ServiceError("CSV file is empty or malformed", 400);
  }
  return { headers, rows };
};

/**
 * Merge the parser's auto-detected column map with any user-supplied
 * overrides (from the frontend's column-mapping step).
 */
export const buildColumnMapping = (parser, headers, overrides = {}) => {
  const autoMap = parser.guessColumnMap(headers);
  const cleanOverrides = Object.fromEntries(
    Object.entries(overrides || {}).filter(([, v]) => v),
  );
  return { ...autoMap, ...cleanOverrides };
};

export const validateNormalizedRow = (normalized, rowNumber) => {
  const errors = [];

  if (!normalized.date) {
    errors.push(`Row ${rowNumber}: unable to parse a valid date`);
  } else if (normalized.date > new Date()) {
    errors.push(`Row ${rowNumber}: date cannot be in the future`);
  }

  if (normalized.amount == null || normalized.amount <= 0) {
    errors.push(`Row ${rowNumber}: unable to determine a valid amount`);
  } else if (normalized.amount > MAX_AMOUNT) {
    errors.push(`Row ${rowNumber}: amount exceeds the maximum allowed value`);
  }

  if (!normalized.type || !["income", "expense"].includes(normalized.type)) {
    errors.push(
      `Row ${rowNumber}: unable to determine transaction type (income/expense)`,
    );
  }

  return errors;
};

/**
 * Normalize + validate every raw row using the given parser and column map.
 */
export const normalizeRows = (parser, rows, columnMap) => {
  return rows.map((row, idx) => {
    const rowNumber = idx + 2;
    const normalized = parser.normalizeRow(row, columnMap);
    const errors = validateNormalizedRow(normalized, rowNumber);

    return {
      rowNumber,
      raw: row,
      normalized,
      errors,
      valid: errors.length === 0,
    };
  });
};
