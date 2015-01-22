var through = require('through');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ttyWidth = 80;
var ttyHeight = 40;
var currentBuddy = null;
var inChat = false;

function cliGUI(options) {
    EventEmitter.call(this);
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
            if (chunk === '\\c\n') {
                clearScreen();
                mainMenu();
                return;
            } else if (chunk === '\\?\n') {
                process.stdout.write(': help commands (\\c = clear chat, \\l = List buddies, \\q = quit) \n');
                return;
            } else if (chunk === '\\q\n') {
                clearScreen();
                process.exit(0);
            }
            if (currentBuddy) {
                currentBuddy.sendMessage(chunk);
                process.stdout.write(":(" + currentBuddy.address + ")> ");
            }
        }
    });

}

function header() {

};

function mainMenu() {
    var fullBar = '';
    for (var l = 0; l < ttyWidth; l++) {
        fullBar += "-";
    }
    process.stdout.write(fullBar);
    process.stdout.write("Welcome to torchat-node\n");
    process.stdout.write(fullBar + '\n\n');

    process.stdout.write("1. Buddy List\n");
    process.stdout.write("2. Edit Profile\n");
    process.stdout.write("3. Settings\n");
    process.stdout.write("4. Change Status\n");
    process.stdout.write("5. Exit\n");
    process.stdout.write(fullBar + '\n');
    process.stdout.write('[1-5] : ');
};


// Public goodies
cliGUI.prototype.showMainMenu = mainMenu;

cliGUI.prototype.showMessage = function(buddy, command, encoded) {
    inChat = true;
    currentBuddy = buddy;
    process.stdout.write(":(" + buddy.address + ")< " + encoded + '\n');
    process.stdout.write(":(" + buddy.address + ")> ");
};
module.exports = cliGUI;
