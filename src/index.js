import {memoize} from "./memoize";
import {shallBePure, shouldBePure, isThisPure} from "./pure";

export {
  shouldBePure,
  shallBePure,
  isThisPure
};

export default memoize;