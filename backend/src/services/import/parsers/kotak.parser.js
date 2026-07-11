import {
  guessColumnMap,
  buildStatementNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Transaction Date", "Value Date", "Date"],
  description: ["Description", "Narration", "Particulars"],
  debit: ["Debit", "Withdrawal (Dr)", "Withdrawal Amt", "Withdrawal Amt."],
  credit: ["Credit", "Deposit (Cr)", "Deposit Amt", "Deposit Amt."],
  refNo: ["Chq/Ref No.", "Chq/Ref No", "Cheque/Ref No", "Ref No"],
  balance: ["Balance", "Closing Balance"],
};

const normalizeRow = buildStatementNormalizer();

export default {
  id: "kotak",
  label: "Kotak Mahindra Bank",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasChqRef = headers.some((h) => /chq\s*\/?\s*ref\s*no/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasChqRef ? 0.15 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
