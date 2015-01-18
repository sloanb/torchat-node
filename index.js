var socks = require('./lib/socks.js');
var TCListener = require('./lib/tclistener');
var fs = require('graceful-fs');

var listener = new TCListener();
listener.listen();
