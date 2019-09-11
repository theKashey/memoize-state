import {
  proxyState,
  deproxify,
  isProxyfied,
  isKnownObject,
  getProxyKey
} from 'proxyequal';
import {updateCacheLine} from './cache';

const nothing = {is: 'PROXY_EQUAL_NOTHING'};
const emptyArray = [];

function addAffected(callGeneration, affected, object) {
  const key = getProxyKey(object);
  if (key.fingerPrint.callGeneration === callGeneration) {
    affected[key.fingerPrint.index].resultAffected.push(key.suffix);
    return true;
  }
  return false;
}

let cycleMap = null;
let userShouldDive = null;
const knownPOD = new WeakSet();


const defaultShouldDiveCheck = (line, key, object) => {
  // default check - is not React owner
  if (key === '_owner' && object.$$typeof) {
    // React-specific: avoid traversing React elements' _owner.
    //  _owner contains circular references
    // and is not needed when comparing the actual elements (and not their owners)
    // .$$typeof and ._store on just reasonable markers of a react element
    return false;
  }

  // could not ACCESS XMLHttpRequest
  if (global.XMLHttpRequest && line.constructor === global.XMLHttpRequest) {
    return false;
  }

  return true;
};

let shouldDive = (line, key, object) => (
  typeof line === 'object' &&
  // !knownPOD.has(line) &&
  !isKnownObject(line) &&
  (
    isProxyfied(line) ||
    userShouldDive(line, key, object, defaultShouldDiveCheck)
  )
);

function forEachIn(obj, iterator) {
  if (Array.isArray(obj)) {
    obj.forEach((_, index) => iterator(index));
  }
  Object.keys(obj).forEach(iterator);
}

function deproxifyResult(callGeneration, result, affected, returnPureValue, deepDive = false) {
  const unaffectedResult = returnPureValue ? result : nothing;

  if (!result) {
    return result;
  }

  if (typeof result === 'object') {
    if (knownPOD.has(result)) {
      return unaffectedResult;
    }

    const isInProxy = isProxyfied(result);
    if (isInProxy) {
      if (addAffected(callGeneration, affected, result)) {
        const preResult = deproxify(result);

        return deepDive
          ? preResult
          : deproxifyResult(callGeneration, preResult, affected, true, true);
      }
    }

    const sub = Array.isArray(result) ? [] : {};
    let altered = false;

    if (result && Object.getOwnPropertyDescriptor(result, '__proxyequal_scanEnd')) {
      Object.defineProperty(result, '__proxyequal_scanEnd', {
        value: 'here was spread guard',
        configurable: true,
        enumerable: false,
      });
    }

    forEachIn(result, i => {
        const data = result[i];
        let newResult = data;
        if (data && shouldDive(data, i, result)) {
          if (!cycleMap.has(data)) {
            cycleMap.set(data, nothing);
            newResult = deproxifyResult(callGeneration, data, affected, false, deepDive);
            cycleMap.set(data, newResult);
            // knownPOD.add(newResult === nothing ? data : newResult);
          } else {
            newResult = cycleMap.get(data)
          }
        }
        if (data && newResult !== nothing && newResult !== data) {
          altered = true;
          sub[i] = newResult
        } else {
          sub[i] = data;
        }
      }
    );

    if (altered) {
      return sub;
    }
    knownPOD.add(result);
    return unaffectedResult;
  }

  return unaffectedResult;
}

export function callIn(that, cache, args, func, memoizationDepth, proxyMap = [], options = {}) {
  const proxies = args.map((arg, index) => {
    if (arg && typeof arg === 'object') {
      const map = proxyMap[index];
      if (!map) {
        return proxyMap[index] = proxyState(arg, {callGeneration: proxyMap, index});
      }
      map.reset();
      return map.replaceState(arg);
    }
    return undefined
  });
  const callArgs = args.map((arg, index) => proxies[index] ? proxies[index].state : arg);

  //call the real function
  const preResult = func.call(that, ...callArgs);
  proxies.forEach(proxy => proxy && proxy.seal())

  let spreadDetected = [];
  const affected = proxies
    .map(proxy => {
      if (proxy) {
        if (proxy.spreadDetected !== false) {
          spreadDetected.push(proxy.spreadDetected);
        }
        const affected = proxy.affected || emptyArray;

        return {
          useAffected: [...affected],
          resultAffected: []
        };
      }
      return undefined;
    });

  cycleMap = new WeakMap();
  userShouldDive = options.deproxifyShouldDive || defaultShouldDiveCheck;
  const result = deproxifyResult(proxyMap, preResult, affected, true);
  const cacheLine = {args, affected, result, callArgs};
  if (cache.length < memoizationDepth) {
    cache.push(cacheLine)
  } else {
    updateCacheLine(cache, 0, cacheLine);
  }

  if (spreadDetected.length > 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'memoize-state: object spread detected in ', func,
        '. Keys affected: ', spreadDetected.map(key => key ? key : 'root'),
        '. This is no-op.'
      );
    }
  }

  return result;
}
