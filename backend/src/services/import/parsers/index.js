import hdfc from "./hdfc.parser.js";
import sbi from "./sbi.parser.js";
import icici from "./icici.parser.js";
import axis from "./axis.parser.js";
import kotak from "./kotak.parser.js";
import indusind from "./indusind.parser.js";
import googlepay from "./googlepay.parser.js";
import phonepe from "./phonepe.parser.js";
import paytm from "./paytm.parser.js";
import navi from "./navi.parser.js";

const REGISTRY = {
  [hdfc.id]: hdfc,
  [sbi.id]: sbi,
  [icici.id]: icici,
  [axis.id]: axis,
  [kotak.id]: kotak,
  [indusind.id]: indusind,
  [googlepay.id]: googlepay,
  [phonepe.id]: phonepe,
  [paytm.id]: paytm,
  [navi.id]: navi,
};

export const getParser = (source) => REGISTRY[source] ?? null;

export const listParsers = () =>
  Object.values(REGISTRY).map((p) => ({ id: p.id, label: p.label }));

export default REGISTRY;
