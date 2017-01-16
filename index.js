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

var UntrustedMempool = function(opts) {
  this._opts = opts || {};
  this._peerHostList = this._opts.peerHostList || ['seeds.bitnodes.io'];
  // if peers are passed in, we'll assume that listeners are already set on each peer and all that's needed to call the connect method
  this._peerObjList = this._opts.peerObjList || {};
  this._mempool = this._opts.mempool || new Mempool();
  this._blockchain = this._opts.blockchain || new Blockchain({ startingBlock: 447879 });
  this._currentHash = null;
  this._prevHash = null;
};

UntrustedMempool.prototype.create = function() {
  var self = this;
  var peerKeys = Object.keys(self._peerObjList);
  if (peerKeys.length === 0) {
    var peerFactory = new PeerPool({
      peerHostList: self._peerHostList,
      onTx: self.onTx.bind(self),
      onBlock: self.onBlock.bind(self)
    });
    self._peerObjList = peerFactory.create();
  }

  peerKeys.forEach(function(peerKey) {
    self._peerObjList[peerKey].connect();
  });

  self._blockchain.startMonitor();

};

UntrustedMempool.prototype._connectBlock = function(block) {
  //this is an untrusted mempool,so we aren't going to do any reorg checks
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

  this._mempool.removeBatch(message.block.getTransactionHashes(), function(err, res) {
    if(err) {
      return console.log(err.message);
    }
    console.log('Memory Pool size before applying block: ', res[1]);
    console.log('Removed tx count: ', (res[1]-res[2]));
    console.log('Final length of mempool: ', res[2]);
    console.log('Count of txs that were in block, but apparently not in our mempool: ', (res[0]-(res[1]-res[2])));
    console.log('*******************************************************************************');
  });
};

UntrustedMempool.prototype.onTx = function(message) {
  var txid = message.transaction.hash.toString('hex');
  if (this._mempool.add(txid, 'tx') !== 1) {
    console.log('Failed to add: ' + txid + ' to the mempool');
  }
};

var peerListRetriever = new PeerListRetriever();
var untrustedMempool = new UntrustedMempool({ peerHostList: ['192.168.3.5'] });
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
