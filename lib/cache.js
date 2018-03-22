'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.updateCacheLine = updateCacheLine;
exports.shallowEqualHit = shallowEqualHit;

var _proxyequal = require('proxyequal');

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