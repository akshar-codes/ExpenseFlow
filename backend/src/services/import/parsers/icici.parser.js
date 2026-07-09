import {
  guessColumnMap,
  buildStatementNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Transaction Date", "Value Date", "Date"],
  description: ["Transaction Remarks", "Description", "Narration"],
  debit: [
    "Withdrawal Amount (INR )",
    "Withdrawal Amount",
    "Debit Amount",
    "Debit",
  ],
  credit: [
    "Deposit Amount (INR )",
    "Deposit Amount",
    "Credit Amount",
    "Credit",
  ],
  refNo: ["Cheque Number", "Transaction Ref No", "Ref No"],
  balance: ["Balance (INR )", "Balance"],
};

const normalizeRow = buildStatementNormalizer();

export default {
  id: "icici",
  label: "ICICI Bank",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasRemarks = headers.some((h) => /remarks/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasRemarks ? 0.15 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
