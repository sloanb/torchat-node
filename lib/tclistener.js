var net = require('net');
var TCProtocol = require('./tcprotocol.js');
var buddyManager = require('./buddyManager.js');
var conf = require('../conf/torchat-node.js');

var TCListener = function(options) {
    var module = {},
        _host = '127.0.0.1',
        _port = (conf.servicePort) ? conf.servicePort : '11009',
        _server = null;

    /**
     * Starts the TorChat listener
     * @param {Function} callback - fn(err, duplex stream)
     */
    module.listen = function(callback) {
        var _server = net.createServer(function(c) {
            var tcProtocol = new TCProtocol({
                listener: c,
                buddyManager: buddyManager,
                conf: conf
            });
        });
        _server.listen(_port, function() {
            console.log("TorChat server listening on port " + _port);
        });

    };

    return module;
};

module.exports = TCListener;
