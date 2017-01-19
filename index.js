'use strict'
/*
1, Connect to peer(s) and collect a mempool.
2. When a block comes in, remove all the block txs from the mempool.
3. There should be at least 1 tx that WAS in the block but was NOT the mempool, the coinbase tx
4. Of the txs thare are not the coinbase tx and WERE in the block, but in the mempool, go query blockchain.info
5. If blockchain.info has the transaction -and- has a host ip that relayed it, then we SHOULD have had this tx, so print this tx and the host that relayed it.
*/
var p2p = require('bitcore-p2p');
var async = require('async');
var Peer = p2p.Peer;
var messages = new p2p.Messages();
var Mempool = require('./mempool');
var Blockchain = require('./blockchain');
var PeerListRetriever = require('./peer-retriever');
var PeerPool = require('./peer-pool');
var myPeers = require('mypeers.json');

var UntrustedMempool = function(opts) {
  this._opts = opts || {};
  this._peerHostList = this._opts.peerHostList || ['seeds.bitnodes.io'];
  this._peerObjList = this._opts.peerObjList || {};
  this._mempool = this._opts.mempool || new Mempool();
  this._currentHash = null;
  this._prevHash = null;
};

UntrustedMempool.prototype.create = function() {
  var self = this;
  var peerKeys = Object.keys(self._peerObjList);

  if (peerKeys.length === 0) {
    var peerPool = new PeerPool({
      peerHostList: self._peerHostList,
      onTx: self.onTx,
      onBlock: self.onBlock.bind(self)
    });
    self._peerObjList = peerPool.create();
    peerKeys = Object.keys(self._peerObjList);
  }

  console.log(peerKeys);
  peerKeys.forEach(function(peerKey) {
    self._peerObjList[peerKey].connect();
  });

};

UntrustedMempool.prototype._connectBlock = function(block) {
  this._currentHash = block.header.hash.toString('hex');
  this._prevHash = block.header.prevHash.reverse().toString('hex');
  return true;
};

UntrustedMempool.prototype._validateBlock = function(block) {
  return block.validMerkleRoot() &&
         block.header &&
         block.header.validProofOfWork() &&
         block.header.validTimestamp() &&
         block.transactions &&
         block.transactions.length > 0;
};

UntrustedMempool.prototype.onBlock = function(message) {

  var viableBlock = this._validateBlock(message.block) && this._connectBlock(messaage.block);

  console.log('*******************************************************************************');
  console.log('New Block Hash is: ', this.currentHash);
  console.log('Prev Block Hash is: ', this.prevHash);
  console.log('New Block has: ' + message.block.getTransactionHashes().length + ' txs');
  var preRemove = this._mempool.length;
  var afterRemove = this._mempool.removeBatch(message.block.getTransactionHashes());
  console.log('Memory Pool size before applying block: ', preRemove);
  console.log('Final length of mempool: ', afterRemove);
  console.log('*******************************************************************************');
};

UntrustedMempool.prototype.onTx = function(message, peer) {
  var txid = message.transaction.hash.toString('hex');
  var metaTx = { ip: peer.ip };
  this._mempool.add(txid, metaTx);
};

var peerListRetriever = new PeerListRetriever();
var untrustedMempool = new UntrustedMempool({ peerHostList: myPeers });
untrustedMempool.create();
//peerListRetriever.getPeerList(function(err, peerList) {
//  if(err) {
//    throw err;
//  }
//  console.log(peerList);
//  process.exit(0);
//  var untrustedMempool = new UntrustedMempool({ peerHostList: ['192.168.3.5'] });
//  untrustedMempool.create();
//});
