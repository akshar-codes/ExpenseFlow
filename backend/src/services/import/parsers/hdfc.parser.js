import {
  guessColumnMap,
  buildStatementNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Date", "Txn Date", "Value Date"],
  description: ["Narration", "Description", "Transaction Remarks"],
  debit: ["Withdrawal Amt.", "Withdrawal Amt", "Debit"],
  credit: ["Deposit Amt.", "Deposit Amt", "Credit"],
  refNo: ["Chq./Ref.No.", "Chq/Ref No", "Ref No", "Cheque/Reference No"],
  balance: ["Closing Balance", "Balance"],
};

const normalizeRow = buildStatementNormalizer();

export default {
  id: "hdfc",
  label: "HDFC Bank",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasNarration = headers.some((h) => /narration/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasNarration ? 0.15 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
