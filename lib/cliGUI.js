var through = require('through');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var colors = require('colors');

var ttyWidth = 80;
var ttyHeight = 40;

function cliGUI(options) {
    EventEmitter.call(this);
    this.buddyManager = options.buddyManager;
    this.inChatSession = false;
    this.currentBuddy = null;
    this.fullBar;
    process.stdin.setEncoding('utf-8');
    init.call(this);

};

// Private functions
function clearScreen() {
    process.stdout.write('\033c');
};

function init() {
    var that = this;
    if (process.stdout.isTTY) {
        ttyWidth = process.stdout.columns;
        ttyHeight = process.stdout.rows;
    }
    // @TODO create a readable processor this is junk
    process.stdin.on("readable", function() {
        var chunk;
        while (null != (chunk = process.stdin.read())) {
            if (chunk === '\\m\n') {
                that.isChatSession = false;
                clearScreen();
                mainMenu();
                return;
            } else if (chunk === '\\?\n') {
                that.isChatSession = false;
                paint('help commands\n'.yellow);
                paint('\\m = main menu\n');
                paint('\\b { buddy list id } = new buddy chat\n');
                paint('\\l = List buddies\n');
                paint('\\d { buddy list id } = buddy profile details\n');
                paint('\\s { available|away|xa|offline } = set status\n');
                paint('\\q = quit)\n');
                paint(': ');
                return;
            } else if (chunk === '\\q\n') {
                clearScreen();
                process.exit(0);
            } else if (chunk === '\\l\n') {
                showBuddyList.call(that);
            } else if (new RegExp(/^\\b/gm).test(chunk)) {
                var data = chunk.split(" ");
                var buddy = that.buddyManager.buddies[data[1] - 1];
                if (buddy && !isNaN(data[1])) {
                    startBuddyChat.call(that, buddy.address);
                } else {
                    paint("You must follow \\b with the number left to their name on the list\n");
                }
            } else if (/^\\/gm.test(chunk) == false) {
                if (that.currentBuddy && that.isChatSession) {
                    that.currentBuddy.sendMessage(chunk);
                    paint(":(" + "myself".green + ")> ");
                } else {
                    paint("It appears you are trying to chat but we don't know with who. Use \\b to find a friend\n");
                }
            } else if (/^\\d/gm.test(chunk)) {
                var data = chunk.split(" ");
                if (data[1] && data[1] !== '\n' && !isNaN(data[1])) {
                    clearScreen();
                    showBuddyDetails.call(that, (data[1]));

                } else {
                    showBuddyList();
                    paint("You must include the id of the buddy.\n");
                }
            } else if (/^\\s/gm.test(chunk)) {
                var data = chunk.split(" ");
                if(data[1] && data[1] !== '\n') { 
                    updateProfileStatus.call(that, data[1].replace(/\n/g, ''));
                }
            } else {
                console.log("Not sure what to do with " + chunk.replace(/\\n/gm, ''));
                paint(": ");
            }
        }
    });

}

function outPrompt(buddy) {
    paint(":(" + buddy.address + ")> ");
};

function paint(output) {
    process.stdout.write(output);
};

function header() {

};

function fullBar() {
    var fullBar = '';
    for (var l = 0; l < ttyWidth; l++) {
        fullBar += "-";
    }
    return fullBar;
};

function mainMenu() {
    var fBar = fullBar();
    paint(fBar);
    paint("Welcome to torchat-node\n");
    paint("Need help? Type \\? and press enter\n");
    paint(fBar);
    paint(": ");
};


function showBuddyList() {
    var that = this;
    that.isChatSession = false;
    clearScreen();
    paint("Buddies".blue + "\n");
    paint(fullBar());
    paint("\n");
    that.buddyManager.buddies.forEach(function(buddy, i) {
        if (buddy.status === 'available') {
            paint((i + 1) + ': ' + buddy.address + '(' + buddy.status.green + ')\n');
        } else {
            paint((i + 1) + ': ' + buddy.address + '(' + buddy.status.yellow + ')\n');
        }
    });
    paint(": ");
};

function startBuddyChat(buddyAddress) {
    var that = this;
    that.isChatSession = true;
    console.log("Starting chat with " + buddyAddress);
    that.buddyManager.buddyByAddress(buddyAddress, function(err, buddy) {
        if (buddy) {
            that.currentBuddy = buddy;
            outPrompt({
                address: 'myself'.green
            });
        } else {
            paint("Unable to locate buddy " + buddyAddress + " Check your buddy list and try again\n");

        }
    });
};

function showBuddyDetails(buddyId) {
    if (buddyId) {
        var buddy = this.buddyManager.buddies[(buddyId - 1)];
        if (buddy) {
            paint("Buddy Details".blue + "\n");
            paint(fullBar());
            paint("Address: ".gray + buddy.address + "\n");
            paint("Alias: ".gray + buddy.profile.name + "\n");
            paint("Description: ".gray + buddy.profile.description + "\n");
            paint("Client: ".gray + buddy.client.name + "\n");
            paint("Version: ".gray + buddy.client.version + "\n");
            if (this.isChatSession) {
                outPrompt(this.currentBuddy);
            } else {
                paint(": ");
            }
        } else {
            paint("No buddy was found with the id of " + buddyId + "\n");
            if (this.isChatSession) {
                outPrompt(this.currentBuddy);
            } else {
                paint(": ");
            }
        }
    }
};


function updateProfileStatus(status) {
    log.info("updateProfileStatus called with " + status);
    paint(": ");
    // Send out a status update to all buddy in the buddy list that are online
    this.buddyManager.buddies.forEach(function(buddy) {
        if(buddy.outboundConnection.isConnected()) {
            buddy.updateStatus(status, function(err, stat) {
                // Nothing happening here yet   
            });
        }
    }); 
};

// Public goodies
cliGUI.prototype.showMainMenu = mainMenu;

cliGUI.prototype.showMessage = function(buddy, message) {
    if (!this.isChatSession) {
        paint("\nStarting chat with " + buddy.address);
        this.isChatSession = true;
    }
    this.currentBuddy = buddy;
    paint("\n:(" + buddy.address.cyan + ")<" + message + "\n");
    outPrompt({
        address: 'myself'.green
    });
};
module.exports = cliGUI;
