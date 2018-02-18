'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shouldBePure = exports.shallBePure = exports.isThisPure = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _proxyequal = require('proxyequal');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var emptyArray = [];

var defaultOptions = {
  cacheSize: 1,
  shallowCheck: true,
  equalCheck: true,
  safe: false
};

function updateCacheLine(cache, lineId, value) {
  for (var i = lineId; i < cache.length - 1; i++) {
    cache[i] = cache[i + 1];
  }
  cache[cache.length - 1] = value;
}

function buildCompare(test) {
  return function (cache, args) {
    for (var i = 0; i < cache.length; ++i) {
      var found = cache[i];

      var _found = found,
          _found2 = _slicedToArray(_found, 3),
          lineArgs = _found2[0],
          lineAffected = _found2[1],
          lineValue = _found2[2];

      if (args.length !== lineArgs.length) {
        continue;
      }

      for (var j = 0; j < args.length; ++j) {
        var a = args[j];
        var b = lineArgs[j];
        var affected = lineAffected[j] && lineAffected[j][test] || emptyArray;
        if (a === b || (typeof a === 'undefined' ? 'undefined' : _typeof(a)) === 'object' && (affected.length === 0 || (0, _proxyequal.proxyCompare)(a, b, affected))) {
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
  };
}

function deproxifyResult(result) {
  var object = (0, _proxyequal.deproxify)(result);
  if ((typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && !(0, _proxyequal.isProxyfied)(result)) {
    var sub = Array.isArray(object) ? [] : {};
    for (var i in object) {
      if (object.hasOwnProperty(i)) {
        sub[i] = (0, _proxyequal.isProxyfied)(object[i]) ? (0, _proxyequal.deproxify)(object[i]) : object[i];
      }
    }
    return sub;
  }
  return object;
}

function callIn(that, cache, args, func, memoizationDepth) {
  var proxies = args.map(function (arg) {
    return arg && (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object' ? (0, _proxyequal.proxyState)(arg) : undefined;
  });
  var newArgs = args.map(function (arg, index) {
    return proxies[index] ? proxies[index].state : arg;
  });
  var result = deproxifyResult(func.call.apply(func, [that].concat(_toConsumableArray(newArgs))));
  var affected = proxies.map(function (proxy) {
    if (proxy) {
      var _affected = proxy.affected || emptyArray;
      return [(0, _proxyequal.collectShallows)(_affected), (0, _proxyequal.collectValuables)(_affected)];
    }
    return undefined;
  });
  var cacheLine = [args, affected, result];
  if (cache.length < memoizationDepth) {
    cache.push(cacheLine);
  } else {
    updateCacheLine(cache, 0, cacheLine);
  }
  return result;
}

var shallowHit = buildCompare(0);
var equalHit = buildCompare(1);

function transferProperties(source, target) {
  var keys = Object.getOwnPropertyNames(source);

  for (var i = 0; i < keys.length; ++i) {
    var _key = keys[i];
    var descriptor = Object.getOwnPropertyDescriptor(source, _key);
    try {
      Object.defineProperty(target, _key, descriptor);
    } catch (e) {}
  }
}

function compareAffected(a, b) {
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

function memoize(func) {
  var _options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var options = Object.assign({}, defaultOptions, _options);

  var cache = [];

  var runTimes = 0;
  var executeTimes = 0;
  var cacheHit = 0;
  var cacheMiss = 0;

  var memoizationDisabled = false;

  function functor() {
    runTimes++;

    for (var _len = arguments.length, args = Array(_len), _key2 = 0; _key2 < _len; _key2++) {
      args[_key2] = arguments[_key2];
    }

    if (memoizationDisabled) {
      cacheMiss++;
      return func.call.apply(func, [this].concat(args));
    }

    var result = options.shallowCheck && shallowHit(cache, args) || options.equalCheck && equalHit(cache, args);

    if (!result) {
      cacheMiss++;
      result = callIn(this, cache, args, func, options.cacheSize);
      executeTimes++;

      // test for internal memoization
      if (options.safe) {
        // run second time
        var preAffected = cache[0][1];
        callIn(this, cache, args, func, options.cacheSize);
        var postAffected = cache[0][1];

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
    get: function get() {
      var _ref;

      return _ref = {
        ratio: cacheHit / cacheHit,
        memoizationDisabled: memoizationDisabled,

        cacheHit: cacheHit
      }, _defineProperty(_ref, 'cacheHit', cacheHit), _defineProperty(_ref, 'runTimes', runTimes), _defineProperty(_ref, 'executeTimes', executeTimes), _ref;
    },
    configurable: true
  });

  return functor;
}

var shallowTest = function shallowTest(a, b) {
  for (var _len2 = arguments.length, errorMessage = Array(_len2 > 2 ? _len2 - 2 : 0), _key3 = 2; _key3 < _len2; _key3++) {
    errorMessage[_key3 - 2] = arguments[_key3];
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
        errors.push(key);
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
      var _key4 = keysA[_idx];

      if (!bHasOwnProperty(_key4)) {
        return false;
      }
      if (a[_key4] !== b[_key4]) {
        errors.push(_key4);
      }
    }
  }

  if (errors.length && errorMessage) {
    console.error.call(console, errorMessage.map(function (err) {
      return typeof err === 'string' ? err.replace('$KEYS$', errors.join(',')) : err;
    }));
  }
  return !errors.length;
};

var isThisPure = exports.isThisPure = function isThisPure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'isThisPure';
  return shallowTest(fnCall(), fnCall(), message + ':result is not equal at [$KEYS$]');
};

var shallBePure = exports.shallBePure = function shallBePure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'shouldBePure';

  var memoizedUnsafe = memoize(fnCall);
  var memoizedSafe = memoize(fnCall, { safe: true });
  var lastResult = null;
  var lastMemoizedResult = null;

  function functor() {
    memoizedSafe.apply(undefined, arguments);

    var mresult = memoizedUnsafe.apply(undefined, arguments);
    var fresult = fnCall.apply(undefined, arguments);

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

var shouldBePure = exports.shouldBePure = function shouldBePure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'shouldBePure';
  return process.env.NODE_ENV === 'production' ? fnCall : shallBePure(fnCall, message);
};

exports.default = memoize;