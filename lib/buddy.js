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
    this.outboundConnection = null;
    this.inboundConnection = null;
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

};

util.inherits(Buddy, EventEmitter);

Buddy.prototype.isConnected = function(callback) {
    if(this.outboundConnection === null) {
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

Buddy.prototype.updateStatus = function(status) {
    // @TODO Validate this is an allowed status
    this.status = status;
    // Notify all listeners we have updated status
    this.on('statusUpdate', this);
};

Buddy.prototype.updateProfile = function(profile) {
    // @TODO validate this is a proper profile
    this.profile = profile;
    this.on('profileUpdate', this);
};

module.exports = Buddy;
