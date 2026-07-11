import {
  guessColumnMap,
  buildStatementNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Transaction Date", "Value Date", "Date"],
  description: [
    "Particulars",
    "Narration",
    "Description",
    "Transaction Remarks",
  ],
  debit: ["Debit", "Withdrawal Amount", "Debit Amount"],
  credit: ["Credit", "Deposit Amount", "Credit Amount"],
  refNo: ["Cheque No", "Cheque No.", "Ref No", "Reference No"],
  balance: ["Balance", "Available Balance"],
};

const normalizeRow = buildStatementNormalizer();

export default {
  id: "indusind",
  label: "Indie by IndusInd Bank",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasParticulars = headers.some((h) => /particulars/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasParticulars ? 0.1 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
