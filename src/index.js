import {proxyCompare, collectShallows, collectValuables, proxyState,} from 'proxyequal';

function updateCacheLine(cache, lineId, value) {
  for (let i = lineId; i < cache.length - 1; i++) {
    cache[i] = cache[i + 1];
  }
  cache[cache.length - 1] = value;
}

function buildCompare(test) {
  return function (cache, args) {
    for (let i = 0; i < cache.length; ++i) {
      let found = cache[i];
      const [lineArgs, lineAffected, lineValue] = found;

      if (args.length !== lineArgs.length) {
        continue;
      }

      for (let j = 0; j < args.length; ++j) {
        const a = args[j];
        const b = lineArgs[j];
        const affected = lineAffected[j][test];
        if (a === b || (typeof a === 'object' && affected.length > 0 && proxyCompare(a, b, affected))) {
          //pass
        } else {
          found = null;
          break;
        }
      }
      if (found) {
        updateCacheLine(cache, i, found);
        return lineValue;
      }
    }
    return undefined;
  }
}

function callIn(cache, args, func, memoizationDepth) {
  const proxies = args.map(state => state && typeof state === 'object' ? proxyState(state) : state);
  const newArgs = proxies.map(({state}) => state);
  const result = func(...newArgs);
  const affected = proxies.map(({affected}) => [collectShallows(affected), collectValuables(affected)]);
  const cacheLine = [args, affected, result];
  if (cache.length < memoizationDepth) {
    cache.push(cacheLine)
  } else {
    updateCacheLine(cache, 0, cacheLine);
  }
  return result;
}

const shallowHit = buildCompare(0);
const equalHit = buildCompare(1);

function memoize(func, memoizationDepth = 1) {
  const cache = [];

  function functor(...args) {
    return shallowHit(cache, args) || equalHit(cache, args) || callIn(cache, args, func, memoizationDepth);
  }

  return functor;
}

const shallowTest = (a, b, errorMessage) => {
  if (a === b) {
    return true;
  }

  if (a && !b || b && !b || typeof a !== typeof b) {
    return false;
  }

  const errors = [];

  if (Array.isArray(a)) {

    if (a.length !== b.length) {
      return false;
    }

    for (let idx = 0; idx < a.length; idx++) {
      if (a[idx] !== b[idx]) {
        errors.push(key);
      }
    }

  } else {

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    const bHasOwnProperty = Object.prototype.hasOwnProperty.bind(b);

    for (let idx = 0; idx < keysA.length; idx++) {
      const key = keysA[idx];

      if (!bHasOwnProperty(key)) {
        return false;
      }
      if (a[key] !== b[key]) {
        errors.push(key);
      }
    }
  }

  if (errors.length && errorMessage) {
    console.error(errorMessage.replace('$KEYS$', errors.join(',')))
  }
  return !errors.length;
};

export const isThisPure = (fnCall, message = 'isThisPure') =>
  shallowTest(fnCall(), fnCall(), message + ':result is not equal at [$KEYS$]');

export const shallBePure = (fnCall, message = 'shouldBePure') => {
  const memoized = memoize(fnCall, 1);
  let lastResult = null;
  let lastMemoizedResult = null;

  function functor(...args) {
    const mresult = memoized(...args);
    const fresult = fnCall(...args);
    functor.isPure = true;
    if (lastResult) {
      if (lastResult !== fresult) {
        if (lastMemoizedResult === mresult) {
          functor.isPure = shallowTest(lastResult, fresult, message + ' `' + fnCall.name + '`\'s result is not equal at [$KEYS$], while should be equal');
        }
      }
    }
    lastResult = fresult;
    lastMemoizedResult = mresult;
    return fresult;
  }

  return functor;
};

export const shouldBePure = (fnCall, message = 'shouldBePure') => (
  process.env.NODE_ENV === 'production'
    ? fnCall
    : shallBePure(fnCall, message)
);

export default memoize;