'use strict'

var _ = require('lodash');
var path = require('path');
var retrieverMap = { '21.co': '21-co' };

var PeerListRetriever = function(opts) {
  this._opts = opts || {};
  this._maxPeerCount = this._opts.maxPeerCount || 100;
  this._minPeerCount = this._opts.minPeerCount || 50;
  this._retriever = this._opts.retriever || '21.co';
  this._failOver = this._opts.failOver === undefined ? true : this._opts.failOver;
  this._dirPrefix = this._opts.dirPrefix || path.resolve(__dirname, '.');
  this._allowIpv6 = this._opts.allowIpv6 || false;
};

PeerListRetriever.prototype.getPeerList = function(callback) {
  var self = this;
  var next = callback;

  if (self._failOver) {
    var keys = Object.keys(retrieverMap);
    _.pull(keys, self._retriever);
    next = tryAgain;
  }

  _getPeerList();

  function _getPeerList() {
    try {
      var retriever = require(self._dirPrefix + '/' + retrieverMap[self._retriever]);
      //retrievers should export "getPeerList"
      retriever.getPeerList({
        allowIpv6: self._allowIpv6,
        minPeerCount: self._minPeerCount,
        maxPeerCount: self._maxPeerCount
      }, next)
    } catch(e) {
      console.log(e.stack);
      next(e);
    }
  }

  function tryAgain(err, list) {
    if (list) {
      console.log('calling back from tryAgain');
      return callback(null, list);
    }
    self._retriever = keys.pop();
    if (!self._retriever) {
      return callback(new Error('None of peer retrieval mechanisms worked.'));
    }
    _getPeerList();
  }

};

module.exports = PeerListRetriever;
