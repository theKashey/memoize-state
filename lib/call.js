'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.callIn = callIn;

var _proxyequal = require('proxyequal');

var _cache = require('./cache');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var nothing = 'PROXY_EQUAL_NOTHING';
var emptyArray = [];

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

    if (result && Object.getOwnPropertyDescriptor(result, '__proxyequal_scanEnd')) {
      Object.defineProperty(result, '__proxyequal_scanEnd', {
        value: 'here was spread guard',
        configurable: true,
        enumerable: false
      });
    }

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

  //call the real function
  var preResult = func.call.apply(func, [that].concat(_toConsumableArray(callArgs)));
  proxies.forEach(function (proxy) {
    return proxy && proxy.seal();
  });

  var spreadDetected = [];
  var affected = proxies.map(function (proxy) {
    if (proxy) {
      if (proxy.spreadDetected !== false) {
        spreadDetected.push(proxy.spreadDetected);
      }
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
    (0, _cache.updateCacheLine)(cache, 0, cacheLine);
  }

  if (spreadDetected.length > 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('memoize-state: object spread detected in ', func, '. Keys affected: ', spreadDetected.map(function (key) {
        return key ? key : 'root';
      }), '. This is no-op.');
    }
  }

  return result;
}