import functionDouble from 'function-double';
import {shallowTest} from "./utils";
import {memoize} from './memoize';

export const isThisPure = (fnCall, message = 'isThisPure') =>
  shallowTest(fnCall(), fnCall(), false, message + ':result is not equal at [$KEYS$]');

export const shallBePure = (fnCall, {
  message = 'shouldBePure',
  checkAffectedKeys = true,
  onTrigger = false
} = {}) => {
  const memoized = checkAffectedKeys ? memoize(fnCall, {safe: true}) : memoize(fnCall);
  let lastResult = null;
  let lastMemoizedResult = null;

  function functor(...args) {
    const mresult = memoized(...args);
    const fresult = fnCall(...memoized.cacheStatistics.lastCallArgs);

    functor.isPure = !memoized.cacheStatistics.memoizationDisabled;

    if (functor.isPure && lastResult) {
      if (lastResult !== fresult) {
        if (lastMemoizedResult === mresult) {
          functor.isPure = shallowTest(lastResult, fresult, onTrigger, message, fnCall, '`s result is not equal at [$KEYS$], while should be equal');
        }
      }
    }
    lastResult = fresult;
    lastMemoizedResult = mresult;
    return fresult;
  }

  return functionDouble(functor, fnCall);
};

export const shouldBePure = (fnCall, options) => (
  process.env.NODE_ENV === 'production'
    ? fnCall
    : shallBePure(fnCall, options)
);