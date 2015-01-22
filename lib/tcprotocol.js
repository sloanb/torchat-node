var socks = require('./socks.js');
var net = require('net');
var EventEmitter = require('events').EventEmitter;
var Writable = require('stream').Writable;
var util = require('util');
var Buddy = require('./buddy.js');

var commandMap = {
    ping: 'receivePing',
    pong: 'receivePong',
    client: 'client',
    status: 'status',
    version: 'receiveVersion',
    profile_name: 'profileName',
    profile_text: 'profileText',
    profile_avatar_alpha: 'profileAvatarAlpha',
    profile_avatar_avatar: 'profileAvatar',
    add_me: 'friendRequest',
    remove_me: 'removeRequest',
    message: 'message',
    filename: 'fileName',
    filedata: 'filedata',
    filedata_ok: 'filedataOk',
    filedata_error: 'filedataError',
    file_stop_sending: 'filedataSending',
    file_stop_receiving: 'fileStopReceiving',
};

var log = null;

function TCProtocol(options) {
    EventEmitter.call(this);
    this.version = '1.0';
    this.lf = '00x0a';
    this.listener = options.listener;
    this.sender = options.sender;
    log = (options.logger) ? options.logger : console;
    this.failedCommands = 0;
    this.buddyManager = options.buddyManager;
    this.conf = options.conf;
    this.MAX_FAIL_CONN = 5;
    this.MAX_FAIL_PING = 5;


    // Load all friends
    //loadFriends.call(this);
};


util.inherits(TCProtocol, EventEmitter);

TCProtocol.prototype.commandRouter = function(command, inboundSocket) {
    log.info("Command Debug:", command);
    var lines = command.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (null == line || "" == line) break;
        line = line.replace(/(\r\n|\n|\r)/gm, '');
        var pmap = line.split(' ');
        var cmd = pmap[0].trim(); // Trimming spaces because some clients don't play nice
        var fcall = this[commandMap[cmd]];
        pmap.shift(); // Get rid of that pesky cmd so we send only encoded
        var encoded = (pmap.length > 1) ? pmap.toString().replace(/,/gm, ' ') : pmap[0];
        if (typeof fcall === 'function') {
            this.failedCommands = 0;
            fcall.call(this, encoded, inboundSocket);
            inboundSocket.emit('buddyData', cmd, encoded);
        } else {
            // We don't want people jsut running crazy on us
            // if too many failed commands happen we are going to kill them
            if (this.failedCommands >= 9) {
                // @TODO handle inbound sockets elsewhere
                log.info("Terminating client connection do to too many failed commands");
            } else {
                this.failedCommands++;
                log.info("Unknown command '" + cmd + "'");
            }
        }
    }
};

function decodeLF(input) {
    return input.replace(/\\n/gm, '\n').replace(/\\/ / gm, '\\');
};

function encodeLF(input) {
    return input.replace(/\\/gm, '\\/').replace(/\n/gm, '\\n');
};

function loadFriends(callback) {
    log.info("Loading existing friends");
    var that = this;
    for (var i = 0; i < that.conf.buddies.length; i++) {
        var confBuddy = that.conf.buddies[i];
        var buddy = new Buddy({
            address: confBuddy.address,
            name: confBuddy.profile.alias,
            profile: {
                name: confBuddy.alias,
                description: confBuddy.profile.description
            }
        });
        (function(b) {
            if (null === b.outboundConnection || b.outboundConnection.isConnected() == false) {
                log.info("No connection to ping buddy " + b.address + ". Creating one");
                var conn = outboundConnection();
                conn.connect({
                    buddy: b,
                    address: b.address
                }, function(err, connection) {
                    that.buddyManager.addBuddy(b);
                    if (err) {
                        log.info("Unable to connect to buddy: " + b.address);
                        log.info(err);
                        if (callback) callback(err, null);
                    } else {
                        that.buddyManager.addBuddy(b);
                        that.sendPing(b);
                        // that.sendClient(b);
                        // that.sendVersion(b);
                        // that.sendProfileName(b);
                        // that.sendProfileText(b);
                        // that.sendAddMe(b);
                        // that.sendStatus(b, 'available');
                    }
                });
            } else {
                that.buddyManager.addBuddy(b);
                that.sendPing(b);
                that.sendClient(b);
                that.sendVersion(b);
                that.sendProfileName(b);
                that.sendProfileText(b);
                that.sendAddMe(b);
                that.sendStatus(b, 'available');
            }
        })(buddy);
    }
    if (callback) callback(null, that.buddyManager.buddies);
};

/**
 *
 * Creates a socks5 connection to through tor
 * You must pass in the targetHost (e.g. buddy.address.onion) and targetPort
 * @function
 * @param {Object} options - options required to create the socks5 connection
 * @param {String} options.socksHost - ip address of the tor socks5 listener
 * @param {String} options.socksPort - port of the tor socks5 listener
 * @param {String} options.targetHost - hostname of node on tor network {host}.onion
 * @param {String} options.targetPort - port of the hostname on tor network. Defaults: 11009
 * @param {Function} callback - fn(err, socket)
 */
// function outboundConnection(buddy, callback) {
//     var that = this;
//     socks.connection({
//             socksHost: '127.0.0.1',
//             socksPort: '9050',
//             targetHost: buddy.address + '.onion',
//             targetPort: 11009
//         },
//         function(err, socket) {
//             if (!err) {
//                 buddy.outboundConnection = {
//                     buddyAddress: buddy.address,
//                     socket: socket,
//                     isConnected: true
//                 };

//                 (function(b) {
//                     socket.on('end', function() {
//                         log.info('Outbound Socket ended for ' + b.address + '. Attempting to kick her off again');
//                         b.outboundConnection.isConnected = false;
//                         b.totalFailedConnection++;
//                         b.isPonged = false;
//                         if (b.totalFailedConnection < that.MAX_FAIL_CONN) {
//                             setInterval(function(io) {
//                                 outboundConnection(b, function(err) {
//                                     if (err) {
//                                         log.info("Reconnection attempt failed");
//                                         return;
//                                     }
//                                     this.clearInterval();
//                                 });
//                             }, 15000);
//                         }
//                     });

//                     socket.on('error', function(err) {
//                         log.info("An error occured on an outbound connection");
//                         log.info(err);
//                         b.outboundConnection.isConnected = false;
//                         b.outboundConnection.error = err;
//                         b.totalFailedConnection++;
//                     });
//                 })(buddy);

//                 callback(null, buddy.outboundConnection);
//             } else {
//                 buddy.outputConnections = {
//                     buddyAddress: buddy.address,
//                     socket: null,
//                     isConnected: false
//                 }
//                 buddy.totalFailedConnection++;
//                 callback(err, buddy);
//                 return;
//             }
//         });
// };


// function startPoller() {
//     var that = this;
//     log.info("Poller started");
//     setInterval(function() {
//         that.buddyManager.buddies.forEach(function(buddy, i, a) {
//             log.info("Checking status of buddy " + buddy.address);
//             if (!buddy.outboundConnection.isConnected && buddy.totalFailedConnections < that.MAX_FAIL_CONN) {
//                 log.info("Attempting connection to " + buddy.address);
//                 outboundConnection(buddy, function(err, connection) {
//                     if (err) {
//                         log.info("Unable to connect to " + buddy.address + ". Will reattempt later");
//                         buddy.totalFailedConnection++;
//                         buddy.outboundConnection.isConnected = false;
//                     }

//                     log.info("Connection reastabliash with " + buddy.address);
//                 });
//             }
//         });
//     }, 15000);
// };

TCProtocol.prototype._write = function(chunk, enc, next) {

};

/**
 * Send a simple ping to a buddy. In order for a buddy to be added to your list
 * the buddy must respond with a pong and in return send a ping and be ponged.
 */
TCProtocol.prototype.sendPing = function(buddy) {
    var that = this;

    if (buddy.outboundConnection.isConnected()) {
        buddy.outboundConnection.send('ping ' + this.conf.profile.address + ' ' + buddy.authToken + '\n');
    } else {
        log.info("Unable to ping no outbound connection in place");
    }
};

/**
 * Ping is a message received from a to request connectiivty/authorization
 * to communicate over TorChat with. Ping messages must be answered with a
 * pong. The pong must contain the same random string as the ping.
 */
TCProtocol.prototype.receivePing = function(encoded, inboundSocket) {
    var that = this;
    var data = encoded.split(' ');
    var address = data[0];
    var authToken = data[1];
    log.info("recievePing called");
    log.info("address:", data[0]);
    log.info("auth:", data[1]);

    this.buddyManager.buddyByAddress(address, function(err, buddy) {
        if (err) {
            // Implement an event to handle this
            log.info(err);
            return;
        }

        if (buddy) {
            // Nice we found a pal let's be safe and ensure this pal has a matching address
            // to go with is fancy authToken
            // @TODO BUG NOT SAFE waiting to happen needs to be in a closure
            if (buddy.address !== address) {
                // Whoa! there cowboy something isn't right I dont' trust you
                // one bit. Shutting her down
                if (buddy.inboundConnection.isConnected()) {
                    buddy.inboundConnection.close();
                    buddy.inboundConnection.socket = null;
                    buddy.inboundConnection.isConnected = false;
                }
            } else {
                // We have an existing buddy in place lets check connectivity
                if (null === buddy.outboundConnection || buddy.outboundConnection.isConnected() === false) {
                    log.info("Buddy " + buddy.address + " is on our list but doesn't have an active connection");
                    log.info("We are attempting to create one now");
                    var connection = outboundConnection();
                    connection.connect({
                        buddy: buddy,
                        address: address
                    }, function(err, socket) {
                        that.sendPing(buddy);
                        that.sendPong(buddy);
                    });
                } else {
                    that.sendPing(buddy);
                    that.sendPong(buddy, function(err) {
                        if (err) {
                            log.info("Unable to send pong to buddy " + buddy.address);
                            return;
                        }
                        buddy.totalFailedConnection = 0;
                    });
                }
                // Assign the inboundSocket to the buddy
                // @TODO add more logic around
                buddy.inboundConnection = inboundConnection.call(that, {
                    buddy: buddy,
                    socket: inboundSocket
                });
            }
        } else {
            // This incoming request doesn't appear to be on our buddy list.
            // Lets run through some rules and add them if they play nice

            // Check to see if the incoming ping is our ip.
            if (that.conf.profile.address === address) {
                // Somebody is attempting to spoof us with our own address
                // Time to kill it
                log.info("Someone attempted to ping us with our own address." +
                    " Not going to happen");
                socket.end();
                return;
            }

            var bud = new Buddy({
                address: address,
                authToken: authToken,
                name: 'unknown',
                profile: {
                    name: '',
                    description: ''
                },
            });
            bud.authToken = authToken;
            var conn = outboundConnection();
            conn.connect({
                    buddy: bud,
                    address: bud.address
                },
                function(err, connection) {
                    if (err) {
                        log.info("Unable to contact our friend for a pong. Tor seems to be done");
                        log.info(err);
                        return;
                    }
                    that.buddyManager.addBuddy(bud);
                    that.sendPing(bud);
                    that.sendPong(bud, function(err) {
                        if (err) {
                            log.info("Unable to send pong to our friend");
                            log.info(err);
                            return;
                        }
                        // Assign inboundConnection
                        bud.inboundConnection = inboundConnection.call(that,{
                            buddy: bud,
                            socket: inboundSocket
                        });
                    });
                });
        }
    });
};

TCProtocol.prototype.sendPong = function(buddy, callback) {
    if (!buddy || !buddy.authToken || "" === buddy.authToken) {
        callback(new Error("Unable to send pong. No buddy to send to or empty authToken"));
        return;
    }

    if (buddy.outboundConnection.isConnected() && !buddy.outboundConnection.pongSent()) {
        log.info("Replying with a pong to our friend " + buddy.address);
        buddy.outboundConnection.send('pong ' + buddy.authToken + '\n');
        buddy.outboundConnection.send('client ' + this.conf.client.name + '\n'); // @TODO use from conf
        buddy.outboundConnection.send('version ' + this.conf.client.version + '\n'); // @TODO use from conf
        buddy.outboundConnection.send('profile_name ' + this.conf.profile.alias + '\n');
        buddy.outboundConnection.send('profile_text ' + this.conf.profile.description + '\n');
        buddy.outboundConnection.send('add_me \n');
        buddy.outboundConnection.send('status available\n');
        buddy.outboundConnection.pongSent = true;
        //buddy.outboundConnection.socket.write('message Can we be friends?\n');
        if (callback) callback(null);
    } else {
        log.info("Unable to send pong. No outbound connection. Waiting for poller to create one");
    }
};

TCProtocol.prototype.receivePong = function() {
    log.info("Pong called");
};

TCProtocol.prototype.send = function() {
    log.info("Send called");
};

TCProtocol.prototype.receive = function() {
    log.info("receive called");
};

TCProtocol.prototype.sendClient = function(buddy) {
    if (buddy.outboundConnection.isConnected) {
        buddy.outboundConnection.send('client ' + this.conf.client.name + '\n');
    }
};

TCProtocol.prototype.client = function() {
    log.info("client called");
};

TCProtocol.prototype.sendVersion = function(buddy) {
    if (buddy.outboundConnection.isConnected) {
        buddy.outboundConnection.send('version ' + this.conf.client.version + '\n');
    }
};

TCProtocol.prototype.receiveVersion = function() {
    log.info("version called");
};

TCProtocol.prototype.sendStatus = function(buddy, status) {
    if (buddy.outboundConnection.isConnected) {
        buddy.outboundConnection.send('status ' + status + '\n');
    }
};

TCProtocol.prototype.status = function() {
    log.info("status called");
};

TCProtocol.prototype.sendProfileName = function(buddy) {
    if (buddy.outboundConnection.isConnected) {
        buddy.outboundConnection.send('profile_name ' + this.conf.profile.name + '\n');
    }
};

TCProtocol.prototype.profileName = function() {
    log.info("profileName called");
};

TCProtocol.prototype.sendProfileText = function(buddy) {
    if (buddy.outboundConnection.isConnected) {
        buddy.outboundConnection.send('profile_text ' + this.conf.profile.text + '\n');
    }
};

TCProtocol.prototype.profileText = function() {
    log.info("profileText called");
};


TCProtocol.prototype.sendAddMe = function(buddy) {
    if (buddy.outboundConnection.isConnected) {
        buddy.outboundConnection.send("add_me \n");
    }
};

/**
 * Maps to the add_me on the spec protocol
 */
TCProtocol.prototype.friendRequest = function() {
    log.info("friendRequest called");
};

TCProtocol.prototype.removeRequest = function() {
    log.info("removeRequest called");
};

TCProtocol.prototype.sendMessage = function(buddy, message) {
    if (buddy.outboundConnection.isConnected) {
        buddy.outboundConnection.send('message ' + message + '\n');
    }
};

TCProtocol.prototype.message = function(buddy, message) {
    log.info("message called");
    this.emit('message', buddy, message);
};

TCProtocol.prototype.filename = function() {
    log.info("filename called");
};

TCProtocol.prototype.filedata = function() {
    log.info("filedata called");
};

TCProtocol.prototype.filedataOk = function() {
    log.info("filedataOk called");
};

TCProtocol.prototype.filedataError = function() {
    log.info("filedataError called");
};

TCProtocol.prototype.fileStopSending = function() {
    log.info("fileStopSending called");
};

TCProtocol.prototype.fileStopReceiving = function() {
    log.info("fileStopReceiving called");
};

// Represents an inbound connection to be for traffic
// coming in through the configured tor hidden_service
// No outbound communication should traverse this connection
// and will be denied
var inboundConnection = function(options) {
    var that = this;
    var _buddy = options.buddy;
    var _socket = options.socket;
    var _isConnected = false;
    var lastPingAddress = '';
    var lastPingCookie = '';

    // Bind a event listener for data for this buddy
    _socket.on('buddyData', function(command, encoded) {
        // log.info("-------------------------------------------------------");
        // log.info("Buddy: " + _buddy.address + " received data");
        // log.info("Command: " + command);
        // log.info("Encoded:", encoded );
        // log.info("-------------------------------------------------------\n");
        that.emit('buddyData', _buddy, command, encoded);
    });
    return {
        buddy: _buddy,
        socket: _socket,
        isConnected: function() {
            return _isConnected;
        },
        lastPingAddress: function() {
            return _lastPingAddress;
        },
        lastPingCookie: function() {
            return _lastPingCookie;
        }, // Used to detect pings with fake address

        send: function(text) {
            if (null !== _socket && _isConnected) {
                this.socket.write(text);
            }
        },

        close: function() {
            if (null !== socket && _isConnected) {
                this.socket.close();
                this.isConnected = false;
            } else {
                log.info("Inbound connection for " + _buddy.address + " seems to be already closed");
            }
        },
    };
};

// Represents an outboundConnection
var outboundConnection = (function() {
    var _buddy = null;
    var _address = null;
    var _pongSent = false;
    var _isConnected = false;
    var _socket = null;

    var onConnectionEnd = function() {
        log.info("Outbound connection ended for " + _buddy.address);
        _isConnected = false;
        _pongSent = false;
        _socket = null;
    };

    function _connect(options, callback) {
        var that = this;
        _buddy = options.buddy;
        _address = options.address;

        log.info("Connecting to " + _address);
        socks.connection({
                socksHost: '127.0.0.1',
                socksPort: 9050,
                targetHost: _buddy.address + '.onion',
                targetPort: 11009
            },
            function(err, socket) {
                if (!err) {
                    _isConnected = true;
                    _socket = socket;
                    _buddy.outboundConnection = that;
                    _socket.on('end', onConnectionEnd);
                } else {
                    _isConnected = false;
                    _socket = null;
                    callback(err, null);
                    return;
                }

                callback(null, that);
            });
    };

    function _close(callback) {
        if (_isConnected) {
            _isConnected = false;
            _socket.end();
            callback(true);
        } else {
            callback(false);
        }
    };

    function _send(text, callback) {
        if (_isConnected) {
            _socket.write(text);
        } else {
            log.info("Outbound connection _isConnected:", _isConnected);
        }
    };

    function _isPongSent() {
        return _pongSent;   
    };

    return {
        connect: _connect,
        send: _send,
        close: _close,
        isConnected: function() {
            return _isConnected;
        },
        pongSent: _isPongSent
    };
});


module.exports = TCProtocol;
