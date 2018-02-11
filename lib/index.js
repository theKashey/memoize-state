'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shouldBePure = exports.shallBePure = exports.isThisPure = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _proxyequal = require('proxyequal');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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
        if (a === b || (typeof a === 'undefined' ? 'undefined' : _typeof(a)) === 'object' && (0, _proxyequal.proxyCompare)(a, b, lineAffected[j][test])) {
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

function callIn(cache, args, func, memoizationDepth) {
  var proxies = args.map(function (state) {
    return state && (typeof state === 'undefined' ? 'undefined' : _typeof(state)) === 'object' ? (0, _proxyequal.proxyState)(state) : state;
  });
  var newArgs = proxies.map(function (_ref) {
    var state = _ref.state;
    return state;
  });
  var result = func.apply(undefined, _toConsumableArray(newArgs));
  var affected = proxies.map(function (_ref2) {
    var affected = _ref2.affected;
    return [(0, _proxyequal.collectShallows)(affected), (0, _proxyequal.collectValuables)(affected)];
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

function memoize(func) {
  var memoizationDepth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

  var cache = [];

  function functor() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return shallowHit(cache, args) || equalHit(cache, args) || callIn(cache, args, func, memoizationDepth);
  }

  return functor;
}

var shallowTest = function shallowTest(a, b, errorMessage) {
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
      var _key2 = keysA[_idx];

      if (!bHasOwnProperty(_key2)) {
        return false;
      }
      if (a[_key2] !== b[_key2]) {
        errors.push(_key2);
      }
    }
  }

  if (errors.length && errorMessage) {
    console.error(errorMessage.replace('$KEYS$', errors.join(',')));
  }
  return !errors.length;
};

var isThisPure = exports.isThisPure = function isThisPure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'isThisPure';
  return shallowTest(fnCall(), fnCall(), message + ':result is not equal at [$KEYS$]');
};

var shallBePure = exports.shallBePure = function shallBePure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'shouldBePure';

  var memoized = memoize(fnCall, 1);
  var lastResult = null;
  var lastMemoizedResult = null;

  function functor() {
    var mresult = memoized.apply(undefined, arguments);
    var fresult = fnCall.apply(undefined, arguments);
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

var shouldBePure = exports.shouldBePure = function shouldBePure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'shouldBePure';
  return process.env.NODE_ENV === 'production' ? fnCall : shallBePure(fnCall, message);
};

exports.default = memoize;