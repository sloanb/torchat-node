var net = require('net');
var TCProtocol = require('./tcprotocol.js');
var buddyManager = require('./buddyManager.js');
var conf = require('../conf/torchat-node.js');
var bunyan = require('bunyan');
var cliGUI = require('./cliGUI.js')
var log = bunyan.createLogger({
    name: 'torchat-node',
    streams: [{
        level: 'info',
        path: conf.logPath + '/torchat-node.log'
    }, {
        level: 'error',
        path: conf.logPath + '/torchat-node-errors.log'
    }]
});

var TCListener = function(options) {
    var module = {},
        _host = '127.0.0.1',
        _port = (conf.servicePort) ? conf.servicePort : '11009',
        _server = null;

    var tcProtocol = new TCProtocol({
        listener: null,
        buddyManager: buddyManager,
        conf: conf,
        logger: log
    });

    var gui = new cliGUI({
        buddyManager: buddyManager
    });
    gui.showMainMenu();

    // @TODO clean this up using command pattern. 
    // Done to simple test event mapping from tcprotocol
    var protocolResponseRouter = function(buddy, command, encoded) {
        if (buddy) {
            if (command === 'status') {
                buddy.status = encoded;
                return;
            } else if (command === 'ping' || command === 'pong') {
                // ignore for now
                return;
            } else if (command === 'message') {
                gui.showMessage(buddy, encoded);
            } else if (command === 'client') {
                buddy.client.name = encoded;
            } else if (command === 'version') {
                buddy.client.version = encoded;
            } else if (command === 'profile_name') {
                buddy.profile.name = encoded;
            } else if (command === 'profile_text') {
                buddy.profile.description = encoded;
            } else if (command === 'add_me') {
                // Add to buddy list
            } else {
                console.log("Something happened. Dont' know " + command);
            }

        }
    };

    /**
     * Starts the TorChat listener
     * @param {Function} callback - fn(err, duplex stream)
     */
    module.listen = function(callback) {
        var _server = net.createServer(function(listener) {
            var that = this;
            log.info("Listener created ");
            listener.on('readable', function() {
                var chunk;
                while (null !== (chunk = listener.read())) {
                    log.info("Chunky:", chunk);
                    var buffedString = chunk.toString('utf8');
                    tcProtocol.commandRouter(buffedString, listener);
                }
            });

            listener.on('connection', function() {
                // When a connection is received we wait for 15 seconds for a ping
                // if no ping is received we close it down
                log.info("Connection received by " + that.listener.remoteAddress);
                listener.setTimeout(15000);
            });


            listener.on('timeout', function() {
                log.info("You aren't talking so we are walking");
                listener.end();
            });

            listener.on('end', function() {
                log.info("listening connection dropped");
            });

            tcProtocol.on('buddyData', protocolResponseRouter);
        });
        _server.listen(_port, function() {
            log.info("TorChat server listening on port " + _port);
        });

    };

    return module;
};

module.exports = TCListener;
