'use strict'

var _ = require('lodash');
var fs = require('fs');

var Mempool = function(opts) {
  this._opts = opts || {};
  this._maxSize = this._opts.maxSize || 1E9;
  this._txs = [];
};

Mempool.prototype._makeRoom = function() {
  var diff = this._txs.length - (this._maxSize - 1);
  if (diff > 0) {
    this._txs.splice(0, diff);
  }
};

Mempool.prototype._validateArg = function(arg) {
  if (_.isString(arg) && arg.length === 64) {
    return true;
  }
  return false;
};

Mempool.prototype.add = function(hash) {
  if (this._validateArg(hash)) {
    if (this._txs.indexOf(hash) !== -1) {
      return 1;
    }
    this._makeRoom();
    var preAddLength = this._txs.length;
    return (this._txs.push(hash) - preAddLength);
  }
  return 0;
};

Mempool.prototype.removeBatch = function(batch, callback) {
  var startingLength = this._txs.length;
  var res = [batch.length, startingLength, startingLength];
  if (_.isArray(batch)) {
    var toRemove = [];
    for(var i = 0; i < batch.length; i++) {
      toRemove.push(batch[i].reverse().toString('hex'));
    }
    var diff = _.difference(toRemove, this._txs);
    res[2] = _.pullAll(this._txs, toRemove).length;
    if (batch.length > (startingLength - res[2])) {
      var data = JSON.stringify({ difference: diff });
      fs.writeFile('./block-' + this.blockHeight + '.json', data, function(err) {
        if(err) {
          return callback(err);
        }
        callback(null, res);
      });
    } else {
      callback(null, res);
    }
  } else {
    callback(new Error('batch was not an array'));//block tx count to remove, starting mempool length, ending mempool length
  }
};

Mempool.prototype.addBatch = function(batch) {
  if (_.isArray(batch)) {
    batch.forEach(this.add);
  }
};

module.exports = Mempool;
