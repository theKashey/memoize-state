import {callIn} from './call';

function compareAffected(a, b) {
  if (!Array.isArray(a)) {
    return compareAffected(Object.values(a), Object.values(b));
  }
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

export function isolatedCall(safeCache, args, func, proxyMap) {
  callIn(this, safeCache, args, func, 1, proxyMap);
  return safeCache;
}

export function purityCheck(cache, safeCache, func) {

  const preAffected = cache[0].affected;
  const postAffected = safeCache[0].affected;

  if (!compareAffected(preAffected, postAffected)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('memoize-state:', func, 'is not pure, or memoized internally. Skipping');
      console.warn('used state keys before', preAffected);
      console.warn('used state keys after', postAffected);
    }
    return false;
  }
  return true;
}

export const shallowTest = (a, b, onTrigger, ...errorMessage) => {
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
        errors.push(idx);
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
    const error = errorMessage.map(err => typeof err === 'string' ? err.replace('$KEYS$', errors.join(',')) : err);
    if (onTrigger) {
      onTrigger(...error);
    } else {
      console.error(...error)
    }
  }
  return !errors.length;
};
