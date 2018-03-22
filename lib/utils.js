'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shallowTest = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.isolatedCall = isolatedCall;
exports.purityCheck = purityCheck;

var _call = require('./call');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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
  (0, _call.callIn)(this, safeCache, args, func, 1);
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

var shallowTest = exports.shallowTest = function shallowTest(a, b, onTrigger) {
  for (var _len = arguments.length, errorMessage = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
    errorMessage[_key - 3] = arguments[_key];
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