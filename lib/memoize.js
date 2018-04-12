'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.memoize = memoize;

var _proxyequal = require('proxyequal');

var _functionDouble = require('function-double');

var _functionDouble2 = _interopRequireDefault(_functionDouble);

var _cache = require('./cache');

var _call = require('./call');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultOptions = {
  cacheSize: 1,
  shallowCheck: true,
  equalCheck: true,
  strictArity: false,
  nestedEquality: true,
  safe: false
};

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

    var result = (0, _cache.shallowEqualHit)(cache, args);

    lastCallWasMemoized = Boolean(result);

    if (!result) {
      var safeCache = void 0;
      if (options.safe && !resultSafeChecked) {
        resultSafeChecked = true;
        safeCache = (0, _utils.isolatedCall)([], args, func);
      }

      cacheMiss++;
      result = (0, _call.callIn)(this, cache, args, func, options.cacheSize, proxyMap);
      executeTimes++;

      if (safeCache) {
        memoizationDisabled = !(0, _utils.purityCheck)(cache, safeCache, func);
      }
      // test for internal memoization
    } else {
      cacheHit++;
    }

    return result;
  }

  var memoizedFunction = (0, _functionDouble2.default)(functor, func, {
    toString: function toString(func) {
      return '/* memoized by memoize-state */\n' + String(func);
    },
    name: function name(func) {
      return 'ms_' + func.name;
    }
  });

  Object.defineProperty(memoizedFunction, 'getAffectedPaths', {
    value: function value() {
      var result = [];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = cache[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var line = _step.value;

          var lineAffected = line.affected;
          for (var argN = 0; argN < lineAffected.length; argN++) {
            if (!result[argN]) {
              result[argN] = {};
            }
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = (0, _proxyequal.collectValuables)(lineAffected[argN].useAffected)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var key = _step2.value;

                result[argN][key] = true;
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

      return result.map(function (values) {
        return Object.keys(values);
      });
    },
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(memoizedFunction, 'cacheStatistics', {
    get: function get() {
      return {
        ratio: cacheHit / cacheMiss,
        memoizationDisabled: memoizationDisabled,
        lastCallArgs: cache.length && cache[cache.length - 1].callArgs,

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

  return memoizedFunction;
}