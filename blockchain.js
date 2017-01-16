'use strict'

var blockexplorer = require('blockchain.info/blockexplorer');
var async = require('async');

var Blockchain = function(opts) {
  this._MAX_INT = Math.pow(2, 32) - 1;
  this._opts = opts || {};
  this._opts._blockexplorer = blockexplorer;
  this._startingBlock = this._opts.startingBlock || 1;
  this._lastProcessedBlock = this._startingBlock;
  this._syncing = false;
  this.currentHeight = this._MAX_INT;
};

Blockchain.prototype.startMonitor = function() {
  setInterval(this._getRelayHostsForFile.bind(this), 5000);
};

Blockchain.prototype._getRelayHostsForFile = function() {

  if (this._syncing) {
    return;
  }
  var self = this;

  async.whilst(function() {

    return (self._lastProcessedBlock <= self.currentHeight);

  }, function(whilstNext) {

    self._syncing = true;

    var file;
    try {

      var fileName = './block-' + self._lastProcessedBlock++ + '.json';
      file = require(fileName);
      console.log('Processing file: ' + fileName + ' tx count: ' + file.difference.length);
      async.eachSeries(file.difference, function(tx, next) {
        self._getRelayHostForTx(tx, function(res) {
          console.log('Blockchain.info reports that: ' + res + ' relayed tx: ' + tx);
          setTimeout(next, 1000);
        });
      }, whilstNext);

    } catch(e) {
      console.log('File: ' + fileName + ' does not exist, reading the next file');
      setImmediate(whilstNext);
    }
  }, function() {
    self._syncing = false;
  });
};

Blockchain.prototype._getRelayHostForTx = function(tx, callback) {
  this._opts._blockexplorer.getTx(tx).then(this._parseHost).then(callback).catch(function() {
    console.log('Querying blockchain.info for: ' + tx + ' failed');
    callback();
  });
};

Blockchain.prototype._parseHost = function(res) {
  return res.relayed_by;
};

module.exports = Blockchain;
