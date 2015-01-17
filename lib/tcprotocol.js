var socks = require('./socks.js');
var net = require('net');
var Writable = require('stream').Writable;
var util = require('util');
var Buddy = require('./buddy.js');

var commandMap = {
    ping: 'receivePing',
    pong: 'receivePong',
    client: 'client',
    version: 'version',
    status: 'status',
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

function TCProtocol(options) {
    Writable.call(this);
    this.version = '1.0';
    this.lf = '00x0a';
    this.listener = options.listener;
    this.sender = options.sender;
    this.failedCommands = 0;
    this.buddyManager = options.buddyManager;
    this.MAX_FAIL_CONN = 5;
    this.MAX_FAIL_PING = 5;
    bind.call(this);
    startPoller.call(this);
};

util.inherits(TCProtocol, Writable);

function commandRouter(command) {
    console.log("Command Debug:", command);
    var lines = command.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (null == line || "" == line) break;
        line = line.replace(/(\r\n|\n|\r)/gm, '');
        var pmap = line.split(' ');
        var cmd = pmap[0];
        pmap.shift(); // Get rid of that pesky cmd so we send only encoded
        var encoded = pmap.toString().replace(/,/gm, ' ');
        var fcall = this[commandMap[cmd]];
        if (typeof fcall === 'function') {
            this.failedCommands = 0;
            fcall.call(this, encoded);
        } else {
            // We don't want peopel jsut running crazy on us
            // if too many failed commands happen we are going to kill them
            if (this.failedCommands >= 9) {
                this.listener.end();
                console.log("Terminating client connection from " + this.listener.remoteAddress);
            } else {
                this.failedCommands++;
                this.listener.write("Unknown command. Attempt " + this.failedCommands + "\n");
            }

        }
    }
};

function bind() {
    var that = this;
    this.listener.on('readable', function() {
        console.log("tcprotocol read");
        console.log("From: ", that.listener.remoteAddress);
        var chunk;
        while (null !== (chunk = that.listener.read())) {
            console.log("Chunky:", chunk);
            var buffedString = chunk.toString('utf8');
            commandRouter.call(that, buffedString);
        }
    });

    this.listener.on('connection', function() {
        // When a connection is received we wait for 15 seconds for a ping
        // if no ping is received we close it down
        console.log("Connection received by " + that.listener.remoteAddress);
        that.listener.setTimeout(15000);
    });


    this.listener.on('timeout', function() {
        console.log("You aren't talking so we are walking");
        that.listener.end();
    });

    this.listener.on('end', function() {
        console.log("listening connection dropped");
    });
};

function decodeLF(input) {
    return input.replace(/\\n/gm, '\n').replace(/\\/ / gm, '\\');
};

function encodeLF(input) {
    return input.replace(/\\/gm, '\\/').replace(/\n/gm, '\\n');
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
function outboundConnection(buddy, callback) {
    var that = this;
    socks.connection({
            socksHost: '127.0.0.1',
            socksPort: '9050',
            targetHost: buddy.address + '.onion',
            targetPort: 11009
        },
        function(err, socket) {
            if (!err) {
                buddy.outboundConnection = {
                    buddyAddress: buddy.address,
                    socket: socket
                };

                (function(b) {
                    socket.on('end', function() {
                        console.log("Socket ended. Attempting to kick her off again");
                        console.log("Socket for " + b.address);

                        b.totalFailedConnection++;
                        if (b.totalFailedConnection < that.MAX_FAIL_CONN) {
                            setInterval(function(io) {
                                outboundConnection(b, function(err) {
                                    if (err) {
                                        console.log("Reconnection attempt failed");
                                        return;
                                    }
                                    this.clearInterval();
                                });
                            }, 15000);
                        }
                    });

                    socket.on('error', function(err) {
                        console.log("An error occured on an outbound connection");
                        console.log(err);
                        b.outboundConnection = null;
                        b.totalFailedConnection++;
                    });
                })(buddy);

                callback(null, buddy.outboundConnection);
            } else {
                b.totalFailedConnection++;
                callback(err, null);
                return;
            }
        });
};


function startPoller() {
    var that = this;
    setInterval(function() {
        that.buddyManager.buddies.forEach(function(buddy, i, a) {
            if (buddy.outboundConnection === null && !buddy.isConnected() && buddy.totalFailedConnections < that.MAX_FAIL_CONN) {
                console.log("Attempting connection to " + buddy.address);
                outboundConnection(buddy, function(err, connection) {
                    if (err) {
                        console.log("Unable to connect to " + buddy.address + ". Will reattempt later");
                        buddy.totalFailedConnection++;
                        buddy.outboundConnection = null;
                    }

                    console.log("Connection reastabliash with " + buddy.address);
                });
            }
        });
    }, 15000);
};

TCProtocol.prototype._write = function(chunk, enc, next) {

};

/**
 * Ping is a message received from a to request connectiivty/authorization
 * to communicate over TorChat with. Ping messages must be answered with a
 * pong. The pong must contain the same random string as the ping.
 */
TCProtocol.prototype.receivePing = function(encoded) {
    var that = this;
    var data = encoded.split(' ');
    var address = data[0];
    var authToken = data[1];
    console.log("recievePing called");
    console.log("address:", data[0]);
    console.log("auth:", data[1]);

    // @TODO Lookup buddy by authToken
    this.buddyManager.buddyByAuthToken(authToken, function(err, buddy) {
        if (err) {
            // Implement an event to handle this
            console.log(err);
            return;
        }

        if (buddy) {
            // Nice we found a pal let's be safe and ensure this pal has a matching address
            // to go with is fancy authToken
            // @TODO BUG NOT SAFE waiting to happen needs to be in a closure
            if (buddy.address !== address) {
                // Whoa! there cowboy something isn't right I dont' trust you
                // one bit. Shutting her down
                if (buddy.inboundConnection) {
                    buddy.inboundConnection.end('Security credentials mismatch. You have been ended');
                    buddy.inboundConnection = null;
                }
            } else {
                // We have an existing buddy in place lets check connectivity
                if (!buddy.outboundConnection) {
                    outboundConnection(buddy, function(err, connection) {
                        // Clean up!
                        that.sendPong(buddy, function(err) {
                            if (err) {
                                console.log("Unable to send pong to buddy " + buddy.address);
                                return;
                            }
                            buddy.totalFailedConnection = 0;
                        });
                    });
                } else {
                    that.sendPong(buddy, function(err) {
                        if (err) {
                            console.log("Unable to send pong to buddy " + buddy.address);
                            return;
                        }
                        buddy.totalFailedConnection = 0;
                    });
                }
            }
        } else {
            // This incoming request doesn't appear to be on our buddy list.
            // Lets run through some rules and add them if they play nice
            var bud = new Buddy({
                address: address,
                authToken: authToken,
                name: 'unknown',
                profile: {
                    name: '',
                    description: ''
                }
            });
            bud.authToken = authToken;
            outboundConnection(bud, function(err, connection) {
                if (err) {
                    console.log("Unable to contact our friend for a pong. Tor seems to be down");
                    console.log(err);
                    return;
                }
                that.buddyManager.addBuddy(bud);
                that.sendPong(bud, function(err) {
                    if (err) {
                        console.log("Unable to send pong to our friend");
                        console.log(err);
                        return;
                    }
                });
            })
        }
    });
};

TCProtocol.prototype.sendPong = function(buddy, callback) {
    if (!buddy || !buddy.authToken || "" === buddy.authToken) {
        callback(new Error("Unable to send pong. No buddy to send to or empty authToken"));
        return;
    }

    if (buddy.outboundConnection !== null) {
        console.log("Replying with a pong to our friend");
        buddy.outboundConnection.socket.write('pong ' + buddy.authToken + '\n');
        buddy.outboundConnection.socket.write('client torchat-node\n'); // @TODO use from conf
        buddy.outboundConnection.socket.write('version 0.0.1\n'); // @TODO use from conf
        buddy.outboundConnection.socket.write('profile_name ' + buddy.profile.name + '\n');
        buddy.outboundConnection.socket.write('profile_text ' + buddy.profile.description + '\n');
        buddy.outboundConnection.socket.write('add_me \n');
        buddy.outboundConnection.socket.write('status available\n');
        buddy.outboundConnection.socket.write('message Can we be friends?\n');
        callback(null);
    } else {
        console.log("Unable to send pong. No outbound connection. Waiting for poller to create one");
    }
};

TCProtocol.prototype.recievePong = function() {
    console.log("Pong called");
};

TCProtocol.prototype.send = function() {
    console.log("Send called");
};

TCProtocol.prototype.receive = function() {
    console.log("receive called");
};

TCProtocol.prototype.client = function() {
    console.log("client called");
};

TCProtocol.prototype.version = function() {
    console.log("version called");
};

TCProtocol.prototype.status = function() {
    console.log("status called");
};


TCProtocol.prototype.profileName = function() {
    console.log("profileName called");
};

TCProtocol.prototype.profileText = function() {
    console.log("profileText called");
};

/**
 * Maps to the add_me on the spec protocol
 */
TCProtocol.prototype.friendRequest = function() {
    console.log("friendRequest called");
};

TCProtocol.prototype.removeRequest = function() {
    console.log("removeRequest called");
};

TCProtocol.prototype.message = function() {
    console.log("message called");
};

TCProtocol.prototype.filename = function() {
    console.log("filename called");
};

TCProtocol.prototype.filedata = function() {
    console.log("filedata called");
};

TCProtocol.prototype.filedataOk = function() {
    console.log("filedataOk called");
};

TCProtocol.prototype.filedataError = function() {
    console.log("filedataError called");
};

TCProtocol.prototype.fileStopSending = function() {
    console.log("fileStopSending called");
};

TCProtocol.prototype.fileStopReceiving = function() {
    console.log("fileStopReceiving called");
};

module.exports = TCProtocol;
