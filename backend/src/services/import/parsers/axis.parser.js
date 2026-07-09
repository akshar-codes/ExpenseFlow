import {
  guessColumnMap,
  buildStatementNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Tran Date", "Transaction Date", "Date"],
  description: ["Particulars", "Transaction Particulars", "Description"],
  debit: ["Debit", "Withdrawal Amt"],
  credit: ["Credit", "Deposit Amt"],
  refNo: ["Chq No", "Ref No"],
  balance: ["Balance", "Closing Balance"],
};

const normalizeRow = buildStatementNormalizer();

export default {
  id: "axis",
  label: "Axis Bank",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasTranDate = headers.some((h) => /tran\s*date/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasTranDate ? 0.15 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
