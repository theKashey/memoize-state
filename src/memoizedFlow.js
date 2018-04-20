import {memoize} from './memoize';

const applyFunctions = (value, fn) => Object.assign({}, value, fn(value) || {});

const memoizedFlow = (functions) => {
  const flow = functions.map(memoize);
  return (input) => flow.reduce(applyFunctions, input);
};

const memoizedFlowRight = (functions) => memoizedFlow(Array.from(functions).reverse());

// aliases
const memoizedPipe = memoizedFlow;
const memoizedCompose = memoizedFlowRight;

export {
  memoizedFlowRight,
  memoizedCompose,

  memoizedFlow,
  memoizedPipe,
};
