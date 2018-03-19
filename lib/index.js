'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shouldBePure = exports.shallBePure = exports.isThisPure = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _proxyequal = require('proxyequal');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

var nothing = 'PROXY_EQUAL_NOTHING';

var emptyArray = [];

var defaultOptions = {
  cacheSize: 1,
  shallowCheck: true,
  equalCheck: true,
  strictArity: false,
  nestedEquality: true,
  safe: false
};

function updateCacheLine(cache, lineId, value) {
  for (var i = lineId; i < cache.length - 1; i++) {
    cache[i] = cache[i + 1];
  }
  cache[cache.length - 1] = value;
}

function shallowEqualHit(cache, args) {
  for (var i = 0; i < cache.length; ++i) {
    var found = cache[i];
    var _found = found,
        lineArgs = _found.args,
        lineAffected = _found.affected,
        lineValue = _found.result;


    if (args.length !== lineArgs.length) {
      continue;
    }

    for (var j = 0; j < args.length; ++j) {
      var a = args[j];
      var b = lineArgs[j];
      var useAffected = lineAffected[j] ? lineAffected[j].useAffected : [];
      var resultAffected = lineAffected[j] ? lineAffected[j].resultAffected : [];
      if (a === b || (typeof a === 'undefined' ? 'undefined' : _typeof(a)) === 'object' && (useAffected.length === 0 || (0, _proxyequal.proxyShallowEqual)(a, b, useAffected)) && (resultAffected.length === 0 || (0, _proxyequal.proxyCompare)(a, b, resultAffected))) {
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

function addAffected(affected, object) {
  var key = (0, _proxyequal.getProxyKey)(object);
  affected[key.fingerPrint].resultAffected.push(key.suffix);
}

function deproxifyResult(result, affected, returnPureValue) {

  var isInProxy = (0, _proxyequal.isProxyfied)(result);
  if (isInProxy) {
    addAffected(affected, result);
    return (0, _proxyequal.deproxify)(result);
  }

  if ((typeof result === 'undefined' ? 'undefined' : _typeof(result)) === 'object') {
    var sub = Array.isArray(result) ? [] : {};
    var altered = false;
    for (var i in result) {
      if (result.hasOwnProperty(i)) {
        var data = result[i];
        var newResult = deproxifyResult(data, affected, false);
        if (data && newResult !== nothing) {
          altered = true;
          sub[i] = newResult;
        } else {
          sub[i] = data;
        }
      }
    }
    if (altered) {
      return sub;
    }
    return returnPureValue ? result : nothing;
  }

  return returnPureValue ? result : nothing;
}

function callIn(that, cache, args, func, memoizationDepth) {
  var proxyMap = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : [];

  var proxies = args.map(function (arg, index) {
    if (arg && (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object') {
      var map = proxyMap[index];
      if (!map) {
        return proxyMap[index] = (0, _proxyequal.proxyState)(arg, index);
      }
      map.reset();
      return map.replaceState(arg);
    }
    return undefined;
  });
  var callArgs = args.map(function (arg, index) {
    return proxies[index] ? proxies[index].state : arg;
  });
  var preResult = func.call.apply(func, [that].concat(_toConsumableArray(callArgs)));
  var spreadDetected = false;
  var affected = proxies.map(function (proxy) {
    if (proxy) {
      spreadDetected |= proxy.spreadDetected;
      var _affected = proxy.affected || emptyArray;
      return {
        useAffected: [].concat(_toConsumableArray(_affected)),
        resultAffected: []
      };
    }
    return undefined;
  });
  var result = deproxifyResult(preResult, affected, true);
  var cacheLine = { args: args, affected: affected, result: result, callArgs: callArgs };
  if (cache.length < memoizationDepth) {
    cache.push(cacheLine);
  } else {
    updateCacheLine(cache, 0, cacheLine);
  }

  if (spreadDetected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('memoize-state: object spread detected in ', func, '. Consider refactoring.');
    }
  }

  return result;
}

function transferProperties(source, target) {
  var keys = Object.getOwnPropertyNames(source);

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = keys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var key = _step.value;

      var descriptor = Object.getOwnPropertyDescriptor(source, key);
      try {
        Object.defineProperty(target, key, descriptor);
      } catch (e) {
        // nop
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

function compareAffected(a, b) {
  if (!Array.isArray(a)) {
    return compareAffected(Object.values(a), Object.values(b));
  }
  if (a.length !== b.length) {
    return false;
  }
  for (var i = 0; i < a.length; i++) {
    if (_typeof(a[i]) === 'object') {
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

function isolatedCall(safeCache, args, func) {
  callIn(this, safeCache, args, func, 1);
  return safeCache;
}

function purityCheck(cache, safeCache, func) {

  var preAffected = cache[0].affected;
  var postAffected = safeCache[0].affected;

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

function memoize(func) {
  var _options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var options = Object.assign({}, defaultOptions, _options);

  var cache = [];

  var proxyMap = {};

  var runTimes = 0;
  var executeTimes = 0;
  var cacheHit = 0;
  var cacheMiss = 0;

  var resultSafeChecked = false;
  var memoizationDisabled = false;

  var lastCallWasMemoized = false;

  function functor() {
    runTimes++;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (options.strictArity && func.length) {
      args.length = Math.min(func.length, args.length);
    }

    if (!options.nestedEquality) {
      proxyMap = {};
    }

    if (memoizationDisabled) {
      cacheMiss++;
      return func.call.apply(func, [this].concat(args));
    }

    var result = shallowEqualHit(cache, args);

    lastCallWasMemoized = Boolean(result);

    if (!result) {
      var safeCache = void 0;
      if (options.safe && !resultSafeChecked) {
        resultSafeChecked = true;
        safeCache = isolatedCall([], args, func);
      }

      cacheMiss++;
      result = callIn(this, cache, args, func, options.cacheSize, proxyMap);
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

  transferProperties(func, functor);

  Object.defineProperty(functor, 'toString', {
    configurable: true,
    writable: false,
    enumerable: false,
    value: function toString() {
      return '/* memoized by memoize-state */\n' + String(func);
    }
  });

  Object.defineProperty(functor, 'getAffectedPaths', {
    value: function value() {
      var result = [];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = cache[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var line = _step2.value;

          var lineAffected = line.affected;
          for (var argN = 0; argN < lineAffected.length; argN++) {
            if (!result[argN]) {
              result[argN] = {};
            }
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = (0, _proxyequal.collectValuables)(lineAffected[argN].useAffected)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var key = _step3.value;

                result[argN][key] = true;
              }
            } catch (err) {
              _didIteratorError3 = true;
              _iteratorError3 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }
              } finally {
                if (_didIteratorError3) {
                  throw _iteratorError3;
                }
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return result.map(function (values) {
        return Object.keys(values);
      });
    },
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(functor, 'cacheStatistics', {
    get: function get() {
      return {
        ratio: cacheHit / cacheMiss,
        memoizationDisabled: memoizationDisabled,
        lastCallArgs: cache[cache.length - 1].callArgs,

        cacheHit: cacheHit,
        cacheMiss: cacheMiss,

        runTimes: runTimes,
        executeTimes: executeTimes,
        lastCallWasMemoized: lastCallWasMemoized,

        cache: cache
      };
    },
    configurable: true,
    enumerable: false
  });

  return functor;
}

var shallowTest = function shallowTest(a, b, onTrigger) {
  for (var _len2 = arguments.length, errorMessage = Array(_len2 > 3 ? _len2 - 3 : 0), _key2 = 3; _key2 < _len2; _key2++) {
    errorMessage[_key2 - 3] = arguments[_key2];
  }

  if (a === b) {
    return true;
  }

  if (a && !b || b && !b || (typeof a === 'undefined' ? 'undefined' : _typeof(a)) !== (typeof b === 'undefined' ? 'undefined' : _typeof(b))) {
    return false;
  }

  var errors = [];

  if (Array.isArray(a)) {

    if (a.length !== b.length) {
      return false;
    }

    for (var idx = 0; idx < a.length; idx++) {
      if (a[idx] !== b[idx]) {
        errors.push(idx);
      }
    }
  } else {

    var keysA = Object.keys(a);
    var keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(b);

    for (var _idx = 0; _idx < keysA.length; _idx++) {
      var key = keysA[_idx];

      if (!bHasOwnProperty(key)) {
        return false;
      }
      if (a[key] !== b[key]) {
        errors.push(key);
      }
    }
  }

  if (errors.length && errorMessage) {
    var error = errorMessage.map(function (err) {
      return typeof err === 'string' ? err.replace('$KEYS$', errors.join(',')) : err;
    });
    if (onTrigger) {
      onTrigger.apply(undefined, _toConsumableArray(error));
    } else {
      var _console;

      (_console = console).error.apply(_console, _toConsumableArray(error));
    }
  }
  return !errors.length;
};

var isThisPure = exports.isThisPure = function isThisPure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'isThisPure';
  return shallowTest(fnCall(), fnCall(), false, message + ':result is not equal at [$KEYS$]');
};

var shallBePure = exports.shallBePure = function shallBePure(fnCall) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$message = _ref.message,
      message = _ref$message === undefined ? 'shouldBePure' : _ref$message,
      _ref$checkAffectedKey = _ref.checkAffectedKeys,
      checkAffectedKeys = _ref$checkAffectedKey === undefined ? true : _ref$checkAffectedKey,
      _ref$onTrigger = _ref.onTrigger,
      onTrigger = _ref$onTrigger === undefined ? false : _ref$onTrigger;

  var memoized = checkAffectedKeys ? memoize(fnCall, { safe: true }) : memoize(fnCall);
  var lastResult = null;
  var lastMemoizedResult = null;

  function functor() {
    var mresult = memoized.apply(undefined, arguments);
    var fresult = fnCall.apply(undefined, _toConsumableArray(memoized.cacheStatistics.lastCallArgs));

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

  transferProperties(fnCall, functor);

  return functor;
};

var shouldBePure = exports.shouldBePure = function shouldBePure(fnCall, options) {
  return process.env.NODE_ENV === 'production' ? fnCall : shallBePure(fnCall, options);
};

exports.default = memoize;