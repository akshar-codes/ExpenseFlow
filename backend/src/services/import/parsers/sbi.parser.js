import {
  guessColumnMap,
  buildStatementNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Txn Date", "Date", "Value Date"],
  description: ["Description", "Particulars", "Narration"],
  debit: ["Debit", "Withdrawal Amount", "Debit Amount"],
  credit: ["Credit", "Deposit Amount", "Credit Amount"],
  refNo: ["Ref No./Cheque No.", "Ref No", "Cheque No"],
  balance: ["Balance", "Balance (INR)"],
};

const normalizeRow = buildStatementNormalizer();

export default {
  id: "sbi",
  label: "State Bank of India",
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
