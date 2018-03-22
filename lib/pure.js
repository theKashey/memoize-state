'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shouldBePure = exports.shallBePure = exports.isThisPure = undefined;

var _functionDouble = require('function-double');

var _functionDouble2 = _interopRequireDefault(_functionDouble);

var _utils = require('./utils');

var _memoize = require('./memoize');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var isThisPure = exports.isThisPure = function isThisPure(fnCall) {
  var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'isThisPure';
  return (0, _utils.shallowTest)(fnCall(), fnCall(), false, message + ':result is not equal at [$KEYS$]');
};

var shallBePure = exports.shallBePure = function shallBePure(fnCall) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$message = _ref.message,
      message = _ref$message === undefined ? 'shouldBePure' : _ref$message,
      _ref$checkAffectedKey = _ref.checkAffectedKeys,
      checkAffectedKeys = _ref$checkAffectedKey === undefined ? true : _ref$checkAffectedKey,
      _ref$onTrigger = _ref.onTrigger,
      onTrigger = _ref$onTrigger === undefined ? false : _ref$onTrigger;

  var memoized = checkAffectedKeys ? (0, _memoize.memoize)(fnCall, { safe: true }) : (0, _memoize.memoize)(fnCall);
  var lastResult = null;
  var lastMemoizedResult = null;

  function functor() {
    var mresult = memoized.apply(undefined, arguments);
    var fresult = fnCall.apply(undefined, _toConsumableArray(memoized.cacheStatistics.lastCallArgs));

    functor.isPure = !memoized.cacheStatistics.memoizationDisabled;

    if (functor.isPure && lastResult) {
      if (lastResult !== fresult) {
        if (lastMemoizedResult === mresult) {
          functor.isPure = (0, _utils.shallowTest)(lastResult, fresult, onTrigger, message, fnCall, '`s result is not equal at [$KEYS$], while should be equal');
        }
      }
    }
    lastResult = fresult;
    lastMemoizedResult = mresult;
    return fresult;
  }

  return (0, _functionDouble2.default)(functor, fnCall);
};

var shouldBePure = exports.shouldBePure = function shouldBePure(fnCall, options) {
  return process.env.NODE_ENV === 'production' ? fnCall : shallBePure(fnCall, options);
};