import {
  guessColumnMap,
  buildWalletNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Date", "Transaction Date", "Time"],
  description: ["Description", "Details", "Transaction Details"],
  amount: ["Amount", "Amount (INR)"],
  type: ["Type", "Transaction Type"],
  refNo: ["Transaction ID", "UPI Ref No", "Ref No"],
};

const normalizeRow = buildWalletNormalizer();

export default {
  id: "googlepay",
  label: "Google Pay",
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
