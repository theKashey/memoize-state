"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isThisPure = exports.shallBePure = exports.shouldBePure = undefined;

var _memoize = require("./memoize");

var _pure = require("./pure");

exports.shouldBePure = _pure.shouldBePure;
exports.shallBePure = _pure.shallBePure;
exports.isThisPure = _pure.isThisPure;
exports.default = _memoize.memoize;