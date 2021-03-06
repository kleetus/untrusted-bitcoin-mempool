'use strict'

var LRU = require('lru-cache');
var assert = require('assert');
var Peer = require('./peer');

var PeerPool = function(opts) {
  this._opts = opts || {};
  this._peerHostList = this._opts.peerHostList || [];
  this._onTx = this._opts.onTx || function() {};
  this._onBlock = this._opts.onBlock || function() {};
  this._peerObjList = {};
  this._cache = LRU({ max: 10 * 1000 });
};

PeerPool.prototype.create = function() {
  var self = this;
  self._peerHostList.forEach(function(host) {
    var peer = self._create(host);
    self._peerObjList[peer.address] = peer;
  });

  return self._peerObjList;
};

PeerPool.prototype._create = function(host) {
  var peer = new Peer({
    host: host,
    onTx: this._onTx,
    onBlock: this._onBlock,
    onInv: this._onInv,
    pool: this._pool //this is so the peer can call my inv listener with the problem context
  });
  peer.setupListeners();
  peer.createAddress();
  return peer;
};

//this is called A LOT, so I'd like this to be compiled by the optimizing compiler
//and not the generic compiler
PeerPool.prototype._onInv = function(message) {
  // TODO: assumes inv object ids are unique across peers
  var self = this; //this will be the peerpool instance

  var invObjs = [];
  message.inventory.forEach(function(inv) {
    if (!self._cache.peek(inv)) {
      self._cache.set(inv, peer.address);
      invObjs.push(inv);
    }
  });

  if (invObjs.length > 0) {
    peer.getData(invObjs);
  }
};

module.exports = PeerPool;
