import {collectValuables} from 'proxyequal';
import functionDouble from 'function-double';
import {shallowEqualHit} from './cache';
import {callIn} from './call';
import {isolatedCall, purityCheck} from './utils';

const defaultOptions = {
  cacheSize: 1,
  shallowCheck: true,
  equalCheck: true,
  strictArity: false,
  nestedEquality: true,
  safe: false
};

export function memoize(func, _options = {}) {
  const options = Object.assign({}, defaultOptions, _options);

  const cache = [];

  let proxyMap = {};

  let runTimes = 0;
  let executeTimes = 0;
  let cacheHit = 0;
  let cacheMiss = 0;

  let resultSafeChecked = false;
  let memoizationDisabled = false;

  let lastCallWasMemoized = false;

  function functor(...args) {
    runTimes++;
    if (options.strictArity && func.length) {
      args.length = Math.min(func.length, args.length);
    }

    if (!options.nestedEquality) {
      proxyMap = {};
    }

    if (memoizationDisabled) {
      cacheMiss++;
      return func.call(this, ...args);
    }

    let result = (shallowEqualHit(cache, args));

    lastCallWasMemoized = Boolean(result);

    if (!result) {
      let safeCache;
      if (options.safe && !resultSafeChecked) {
        resultSafeChecked = true;
        safeCache = isolatedCall([], args, func, options.isolatedCheck ? [] : proxyMap);
      }

      cacheMiss++;
      result = callIn(this, cache, args, func, options.cacheSize, proxyMap, options.flags);
      executeTimes++;

      if (safeCache) {
        memoizationDisabled = !purityCheck(cache, safeCache, func);
      }
      // test for internal memoization

    } else {
      cacheHit++;
    }

    return result;
  }

  const memoizedFunction = functionDouble(functor, func, {
    toString: func => '/* memoized by memoize-state */\n' + String(func),
    name: func => 'ms_' + func.name
  });

  Object.defineProperty(memoizedFunction, 'getAffectedPaths', {
    value: function () {
      const result = [];
      for (let line of cache) {
        const lineAffected = line.affected;
        for (let argN = 0; argN < lineAffected.length; argN++) {
          if (!result[argN]) {
            result[argN] = {};
          }
          for (let key of collectValuables(lineAffected[argN].useAffected)) {
            result[argN][key] = true;
          }
        }
      }
      return result.map(values => Object.keys(values));
    },
    configurable: true,
    enumerable: false,
  });

  Object.defineProperty(memoizedFunction, 'cacheStatistics', {
    get: () => ({
      ratio: cacheHit / cacheMiss,
      memoizationDisabled,
      lastCallArgs: cache.length && cache[cache.length - 1].callArgs,

      cacheHit,
      cacheMiss,

      runTimes,
      executeTimes,
      lastCallWasMemoized,

      cache
    }),
    configurable: true,
    enumerable: false,
  });

  return memoizedFunction;
}
