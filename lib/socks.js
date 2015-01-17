var socks = require('socks-client'),
    _ = require('underscore');

/**
 * @module socksProxy
 */
var socksProxy = (function() {
    var _socketConnection,
        socksHost = '127.0.0.1',
        socksPort = '9050',
        that = this;

    // private
    var _init = function() {
        console.log("We have a sox module loaded. Boom!");
    };

    /**
     * Returns a socket connection from a socks5 proxy
     * @param {Object} options - options to connect to socks5 proxy
     * @param {Function} callback - fn(err, connection)
     */
    function _connection(options, callback) {
        // quick sanity check on options
        _containsRequiredArgs(options, function(err, valid) {
            if (!valid) {
                callback(err, null);
                return;
            }

            options.callback = callback;
            socks.createConnection({
                proxy: {
                    ipaddress: options.socksHost,
                    port: options.socksPort,
                    type: 5
                },
                target: {
                    host: options.targetHost,
                    port: options.targetPort
                }
            }, function(err, socket) {
                if (err) {
                    callback(err, null);
                    return;
                }

                callback(null, socket);
            });
        });
    };

    function _containsRequiredArgs(args, callback) {
        if (!args) {
            callback(that, 'No options specified we could default but I\'m mean');
            return;
        }

        if (_.isUndefined(args.socksHost) || _.isUndefined(args.socksPort)) {
            callback(new Error("You must specify both host and port options"), null);
            return;
        }

        callback(null, true);
    };

    // public
    return {
        init: _init,
        connection: _connection
    };
})();
module.exports = socksProxy;
