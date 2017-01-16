'use strict'

var async = require('async');
var https = require('https');
var _ = require('lodash');
var exports = {};

exports.getPeerList = function(opts, callback) {
  var getListOpts = {
    allowIpv6: opts.allowIpv6 || false,
    minPeerCount: opts.minPeerCount || 50,
    maxPeerCount: opts.maxPeerCount || 100,
    url: 'https://bitnodes.21.co/api/v1/nodes/leaderboard/?limit=100',
    list: []
  }
  _getList(getListOpts, callback);
};

var _getList = function(opts, callback) {
  var data = '';
  var req = https.request(opts.url, function(res) {
    res.on('data', function(chunk) {
      data += chunk;
    });
    res.on('error', function(err) {
      callback(err);
    });
    res.on('end', function() {
      try {
        data = JSON.parse(data);
        opts.list = _.filter(data.results, function(result) {
          return opts.allowIpv6 ||
            result.node.split(':')[0].match(/\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/g);
        });
        if (opts.list.length >= opts.minPeerCount && opts.list.length <= opts.maxPeerCount) {
          return callback(null, opts.list.map(function(item) { return item.node; }));
        }
        opts.url = data.next;
        _getList();
      } catch(e) {
        callback(e);
      }
    });
  });
  req.write('');
  req.end();
};

module.exports = exports;


