'use strict'

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var p2p = require('bitcore-p2p');
var messages = new p2p.Messages();
var bitcore = require('bitcore-lib');

var Peer = function(opts) {
  this._opts = opts || {};

  //event handlers
  this._onTx = this._opts.onTx || function() {};
  this._onBlock = this._opts.onBlock || function() {};
  this._onInv = this._opts.onInv || function() {};

  //p2p options
  this._host = this._opts.host || '127.0.0.1';
  this._port = this._opts.port ||
    this._host.split(':')[1] || 8333;
  this._network = this._opts.network || 'livenet';
  this._relay = this._opts.relay;
  this._socket = this._opts.socket;

  var peerOpts = {};
  if (this._socket) {
    peerOpts.socket = this._socket;
  }
  peerOpts.host = this._host;
  peerOpts.port = this._port;
  peerOpts.network = this._network;
  peerOpts.relay = this._relay;
  this._peer = new p2p.Peer(peerOpts);

  //meta options
  this._allowLogging = this._opts.allowLogging === undefined ? true : this._opts.allowLogging;
  this._id = this._opts.id;
};

util.inherits(Peer, EventEmitter);

Peer.prototype.getData = function(invObjs) {
  assert(_.isArray(invObjs), 'getData is supposed to receive an array.');
  if (invObjs.length > 0) {
    var getData = messages.GetData(invObjs);
    this._peer.sendMessage(getData);
  }
}

Peer.prototype._log = function(message) {
  if (this._allowLogging) {
    console.log(message);
  }
};

Peer.prototype.createAddress = function() {
  if (this._id) {
    this.address = this._id;
  } else {
    var pk = new bitcore.PrivateKey(this._network);
    this._privateKey = pk.toWIF();
    this.address = pk.toAddress().toString();
  }
};

Peer.prototype._ready = function() {
  this._log(peer.version + ' ' + peer.subversion + ' ' + peer.bestHeight);
  this.currentHeight = peer.bestHeight;
  //wait 1 sec to before blasting out new messages at the peer
  setTimeout(function() {
    peer.sendMessage(messages.MemPool());
  }, 1000);
};

Peer.prototype.setupListeners = function() {
  this._peer.on('ready', this._ready.bind(this));
  this._peer.on('inv', this._onInv.bind(this._peer));
  this._peer.on('tx', this._onTx);
  this._peer.on('block', this._onBlock);
};

Peer.prototype.connect = function() {
  this._peer.connect();
};

module.exports = Peer;
