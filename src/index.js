import {proxyCompare, collectShallows, collectValuables, proxyState, deproxify, isProxyfied} from 'proxyequal';

const emptyArray = [];

const defaultOptions = {
  cacheSize: 1,
  shallowCheck: true,
  equalCheck: true,
  safe: false
};

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
        const affected = lineAffected[j] && lineAffected[j][test] || emptyArray;
        if (a === b || (typeof a === 'object' && (affected.length === 0 || proxyCompare(a, b, affected)))) {
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

function deproxifyResult(result) {
  const object = deproxify(result);
  if (typeof object === 'object' && !isProxyfied(result)) {
    const sub = Array.isArray(object) ? [] : {};
    for (let i in object) {
      if (object.hasOwnProperty(i)) {
        sub[i] = isProxyfied(object[i]) ? deproxify(object[i]) : object[i]
      }
    }
    return sub;
  }
  return object;
}

function callIn(that, cache, args, func, memoizationDepth) {
  const proxies = args.map(arg => arg && typeof arg === 'object' ? proxyState(arg) : undefined);
  const newArgs = args.map((arg, index) => proxies[index] ? proxies[index].state : arg);
  const result = deproxifyResult(func.call(that, ...newArgs));
  const affected = proxies
    .map(proxy => {
      if (proxy) {
        const affected = proxy.affected || emptyArray;
        return [collectShallows(affected), collectValuables(affected)]
      }
      return undefined;
    });
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

function transferProperties(source, target) {
  const keys = Object.getOwnPropertyNames(source);

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    try {
      Object.defineProperty(target, key, descriptor);
    } catch (e) {
    }
  }
}

function compareAffected(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (typeof a[i] === 'object') {
      if (!compareAffected(a[i], b[i])) {
        return false;
      }
    } else {
      if (a[i] !== b[i]) {
        return false;
      }
    }
  }
  return true;
}


function memoize(func, _options = {}) {
  const options = Object.assign({}, defaultOptions, _options);

  const cache = [];

  let runTimes = 0;
  let executeTimes = 0;
  let cacheHit = 0;
  let cacheMiss = 0;

  let memoizationDisabled = false;

  function functor(...args) {
    runTimes++;

    if (memoizationDisabled) {
      cacheMiss++;
      return func.call(this, ...args);
    }

    let result = (options.shallowCheck && shallowHit(cache, args)) || (options.equalCheck && equalHit(cache, args));

    if (!result) {
      cacheMiss++;
      result = callIn(this, cache, args, func, options.cacheSize)
      executeTimes++;

      // test for internal memoization
      if (options.safe) {
        // run second time
        const preAffected = cache[0][1];
        callIn(this, cache, args, func, options.cacheSize);
        const postAffected = cache[0][1];

        executeTimes++;

        if (!compareAffected(preAffected, postAffected)) {
          memoizationDisabled = 1;
          if (process.env.NODE_ENV !== 'production') {
            console.warn('memoize-state:', func, 'is not pure, or memoized internally. Skipping');
            console.warn('used state keys before', preAffected);
            console.warn('used state keys after', postAffected);
          }
        }
      }
    } else {
      cacheHit++;
    }

    return result;
  }

  transferProperties(func, functor);

  Object.defineProperty(functor, 'cacheStatistics', {
    get: () => ({
      ratio: cacheHit / cacheHit,
      memoizationDisabled,

      cacheHit,
      cacheHit,

      runTimes,
      executeTimes,
    }),
    configurable: true
  });

  return functor;
}

const shallowTest = (a, b, ...errorMessage) => {
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
    console.error.call(console, errorMessage.map(err => typeof err === 'string' ? err.replace('$KEYS$', errors.join(',')) : err))
  }
  return !errors.length;
};

export const isThisPure = (fnCall, message = 'isThisPure') =>
  shallowTest(fnCall(), fnCall(), message + ':result is not equal at [$KEYS$]');

export const shallBePure = (fnCall, message = 'shouldBePure') => {
  const memoizedUnsafe = memoize(fnCall);
  const memoizedSafe = memoize(fnCall, {safe: true});
  let lastResult = null;
  let lastMemoizedResult = null;

  function functor(...args) {
    memoizedSafe(...args);

    const mresult = memoizedUnsafe(...args);
    const fresult = fnCall(...args);

    functor.isPure = !memoizedSafe.cacheStatistics.memoizationDisabled;

    if (functor.isPure && lastResult) {
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