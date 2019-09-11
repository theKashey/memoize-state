import {
  proxyCompare,
  proxyShallowEqual,
} from 'proxyequal';

export function updateCacheLine(cache, lineId, value) {
  for (let i = lineId; i < cache.length - 1; i++) {
    cache[i] = cache[i + 1];
  }
  cache[cache.length - 1] = value;
}

export function shallowEqualHit(cache, args) {
  for (let i = 0; i < cache.length; ++i) {
    let found = cache[i];
    const {args: lineArgs, affected: lineAffected} = found;

    if (args.length !== lineArgs.length) {
      continue;
    }

    for (let j = 0; j < args.length; ++j) {
      const a = args[j];
      const b = lineArgs[j];
      const useAffected = lineAffected[j] ? lineAffected[j].useAffected : [];
      const resultAffected = lineAffected[j] ? lineAffected[j].resultAffected : [];
      if (
        a === b || (
          typeof a === 'object'
          && (useAffected.length === 0 || proxyShallowEqual(a, b, useAffected))
          && (resultAffected.length === 0 || proxyCompare(a, b, resultAffected))
        )
      ) {
        //pass
      } else {
        found = null;
        break;
      }
    }
    if (found) {
      updateCacheLine(cache, i, found);
      return found;
    }
  }
  return undefined;
}

