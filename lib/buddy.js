var EventEmitter = require('events').EventEmitter;
var util = require('util');
var crypto = require('crypto');

var BUDDY_STATUS = {
    STATUS_ONLINE: 'available',
    STATUS_AWAY: 'away',
    STATUS_XA: 'xa',
    OFFLINE: 'offline'

};

function Buddy(options) {
    EventEmitter.call(this);
    //this.buddyList = options.buddyList; 
    this.address = options.address;
    this.name = options.name;
    this.profile =  {
        name: options.profile.name,
        description: options.profile.description,
        avatar: {
            data: null,
            alpha: null,
            object: null
        }
    };
    this.authToken = crypto.createHash('sha1').update(this.address).digest('hex');
    this.authToken2 = crypto.createHash('sha1').update(this.address + Math.random().toString()).digest('hex');// Not sure what this is yet
    this.outboundConnection = null; //{ isConnected: false, socket: null };
    this.inboundConnection = null; //{ isConnected: false, socket: null };
    this.status = BUDDY_STATUS.OFFLINE;
    this.client = {
        name: '',
        version: ''
    };
    this.timer = false;
    this.lastStatusTime = 0;
    this.totalFailedConnection = 0;
    this.totalUnansweredPings = 0;
    this.active = true;
    this.temporary;
    this.isPonged = false;
    this.isPinged = false;

};

util.inherits(Buddy, EventEmitter);

Buddy.prototype.isConnected = function(callback) {
    if(this.outboundConnection === null || !this.outboundConnection.isConnected) {
        if(callback) {
            callback(false);
            return;
        } else {
            return false;
        }
    } else {
        if(callback) {
            callback(true);
        } else {
            return true;
        }
    }
};

Buddy.prototype.updateStatus = function(status, callback) {
    // @TODO Validate this is an allowed status
    // Notify all listeners we have updated status
    if(null !== this.outboundConnection && this.outboundConnection.isConnected()) {
        this.outboundConnection.send("status " + status + '\n');
        if(callback) callback(null, status);
    } else {
        log.error("Unable to send status update. No outbound connection for " + this.address);
        if(callback) callback(new Error("Unable to send status update. No outbound connection for " + this.address));
    }
};

Buddy.prototype.updateProfile = function(profile) {
    // @TODO validate this is a proper profile
    this.profile = profile;
    this.on('profileUpdate', this);
};

Buddy.prototype.sendMessage = function(message) {
    if(null !== this.outboundConnection && this.outboundConnection.isConnected()) {
        this.outboundConnection.send("message " + message + "\n");
    } else {
        log.error("No outbound connection established for " + this.address);
    }
};
module.exports = Buddy;
