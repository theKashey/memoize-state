import {memoize} from './memoize';

const applyFunctions = (value, fn) => Object.assign({}, value, fn(value) || {});

const memoizedFlow = (functions) => {
  const flow = functions.map(memoize);
  return (input) => flow.reduce(applyFunctions, input);
};

// alias
const memoizedPipe = memoizedFlow;

export {
  memoizedFlow,
  memoizedPipe,
};
