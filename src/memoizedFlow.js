import memoizeState from './memoize';

export const memoizedFlow = (functions) => {
  const flow = functions.map(fn => memoizeState(fn));
  return (input => flow.reduce((value, fn) => Object.assign({}, value, fn(value)), input));
};