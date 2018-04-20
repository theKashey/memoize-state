import {memoize} from './memoize';
import {shallBePure, shouldBePure, isThisPure} from './pure';
import {memoizedFlow, memoizedPipe, memoizedFlowRight, memoizedCompose} from './memoizedFlow';

export {
  shouldBePure,
  shallBePure,
  isThisPure,

  memoizedFlow,
  memoizedPipe,

  memoizedFlowRight,
  memoizedCompose,
};

export default memoize;
