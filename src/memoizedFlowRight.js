import {memoizedFlow} from './memoizedFlow';

const memoizedFlowRight = (functions) => {
  const reversedFunctions = Array.from(functions).reverse();
  return memoizedFlow(reversedFunctions);
};

// alias
const memoizedCompose = memoizedFlowRight;

export {
  memoizedFlowRight,
  memoizedCompose,
};
