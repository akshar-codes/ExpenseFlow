import {
  guessColumnMap,
  buildWalletNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Date", "Transaction Date"],
  description: ["Transaction Details", "Description", "Narration", "Details"],
  amount: ["Amount", "Transaction Amount"],
  type: ["Type", "Transaction Type", "Debit/Credit"],
  refNo: ["Transaction ID", "UPI Ref No", "UTR No", "Ref No"],
};

const normalizeRow = buildWalletNormalizer();

export default {
  id: "navi",
  label: "Navi",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasUpiRef = headers.some((h) => /upi\s*ref/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasUpiRef ? 0.1 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
