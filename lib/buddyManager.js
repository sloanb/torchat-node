var Buddy = require('./buddy.js');

/**
 * @module  buddyManager
 */
var buddyManager = (function() {
    // private
    var buddies = [];
    var pendingBuddies = [];

    var _init = function() {
        console.log("init buddy manager");
    };

    /**
     * Lookup for buddy by authToken. If no buddy is found the callback will return null.
     * If no authToken is specified the callback will return an error and buddy will be null.
     * @function buddyByAuthToken
     * @memberof Buddy
     * @param {String} authToken - authToken of the buddy you are attempting to lookup
     * @param {Function} callback - callback fn(err, buddy)
     * <p>If no authToken is specified error will not be null. If no buddy is found err will
     * be null and buddy will be null. If a buddy is found err will be null and buddy will
     * return.</p>
     */
    function _buddyByAuthToken(authToken, callback) {
        var buddy;
        if (null == authToken || typeof authToken === 'undefined' || '' === authToken) {
            callback(new Error("Unable to locate buddy by authToken. No authToken specified"), null);
            return;
        }

        for (var i = 0; i < buddies.length; i++) {
            var bud = buddies[i];
            if (bud.authToken === authToken) {
                buddy = bud;
                break;
            }
        }

        callback(null, buddy);
    };

    function _buddyByAddress(address, callback) {
        var buddy;
        if (null == address || typeof address === 'undefined' || '' === address) {
            callback(new Error("Unable to locate buddy by address. No address specified"), null);
            return;
        }

        for (var i = 0; i < buddies; i++) {
            var bud = buddies[i];
            if (bud.address === address) {
                buddy = bud;
                break;
            }
        }

        callback(null, buddy);
    };

    function _addBuddy(buddy) {
        buddies.push(buddy);
    };

    // public
    return {
        init: _init,
        buddyByAuthToken: _buddyByAuthToken,
        buddyByAddress: _buddyByAddress,
        addBuddy: _addBuddy,
        buddies: buddies
    };
})();
module.exports = buddyManager;
