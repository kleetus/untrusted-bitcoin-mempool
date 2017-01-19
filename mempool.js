'use strict'

var _ = require('lodash');
var LRU = require('lru-cache');

var Mempool = function(opts) {
  this._opts = opts || {};
  this._txs = this._opts.cache || LRU(1E6);
};

Mempool.prototype.length = function() {
  return this._txs.lenght;
};

Mempool.prototype._validateArg = function(arg) {
  if (_.isString(arg) && arg.length === 64) {
    return true;
  }
  return false;
};

Mempool.prototype.add = function(hash, metaTx) {
  if (this._validateArg(hash)) {
    if (!this._txs.has(hash)) {
      this._txs.set(hash, metaTx);
    }
    return this._txs.length;
  }
  return 0;
};

Mempool.prototype.remove = function(hash) {
  if (this._validateArg(hash)) {
    this._txs.del(hash);
    return this._txs.length;
  }
  return 0;
};

Mempool.prototype.removeBatch = function(batch) {
  if (_.isArray(batch)) {
    batch.forEach(this.remove);
    return this._txs.length;
  }
  return 0;
};

Mempool.prototype.addBatch = function(batch) {
  if (_.isArray(batch)) {
    batch.forEach(this.add);
    return this._txs.length;
  }
  return 0;
};

module.exports = Mempool;
