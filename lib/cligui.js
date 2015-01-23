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
                paint('help commands (\\m = main menu, \\b { buddy list id } = new buddy chat, \\l = List buddies, \\q = quit) \n');
                paint(': ');
                return;
            } else if (chunk === '\\q\n') {
                clearScreen();
                process.exit(0);
            } else if (chunk === '\\l\n') {
                showBuddyList.call(that);
            } else if (new RegExp(/^\\b/gm).test(chunk)) {
                var data = chunk.split(" ");
                var buddy = that.buddyManager.buddies[data[1] -1]; 
                if(buddy && !isNaN(data[1])) {
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
            } else {
                console.log("Not sure what to do with " + chunk);
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

function mainMenu() {
    var fullBar = '';
    for (var l = 0; l < ttyWidth; l++) {
        fullBar += "-";
    }

    paint(fullBar);
    paint("Welcome to torchat-node\n");
    paint("Need help? Type \\? and press enter\n");
    paint(fullBar);
    paint(": ");
};


function showBuddyList() {
    var that = this;
    that.isChatSession = false;
    clearScreen();
    paint("Buddies".blue + "\n");
    that.buddyManager.buddies.forEach(function(buddy, i) {
        if(buddy.status === 'available') {
            paint((i+1) + ': ' + buddy.address + '(' + buddy.status.green + ')\n');
        } else {
            paint((i+1) + ': ' + buddy.address + '(' + buddy.status.yellow + ')\n');
        }
    });
};

function startBuddyChat(buddyAddress) {
    var that = this;
    that.isChatSession = true;
    console.log("Starting chat with " + buddyAddress);
    that.buddyManager.buddyByAddress(buddyAddress, function(err, buddy) {
        if (buddy) {
            that.currentBuddy = buddy;
            outPrompt({ address: 'myself'.green });
        } else {
            paint("Unable to locate buddy " + buddyAddress + " Check your buddy list and try again\n");

        }
    });
};

// Public goodies
cliGUI.prototype.showMainMenu = mainMenu;

cliGUI.prototype.showMessage = function(buddy, message) {
    if(!this.isChatSession) {
        paint("\nStarting chat with " + buddy.address);
        this.isChatSession = true;
    }
    this.currentBuddy = buddy;
    paint("\n:(" + buddy.address.cyan + ")< " + message + '\n');
    outPrompt({ address: 'myself'.green});
};
module.exports = cliGUI;
