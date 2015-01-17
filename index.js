var socks = require('./lib/socks.js');
var TCListener = require('./lib/tclistener');
var fs = require('graceful-fs');

var listener = new TCListener({ port: 11009});
listener.listen();


socks.connection({
    socksHost: '127.0.0.1',
    socksPort: 9050,
    // targetHost: 'guzdcjqry66tjave.onion',
    targetHost: 'd5nndpweusjevjz5.onion',
    targetPort: 11009
}, function(err, connection) {
    if(err) {
        console.log("We have a problem");
        console.log("Error:", err);
        return;
    }
    // var ws = fs.createWriteStream('out.txt');
    connection.write('ping 3zaos3rxliklcdoa 3MP8jQ2Tn6QBorYK5DN82TYwbWOJhzpwcJX1cSsRQrhC8y7ebFsGxXoQNlejAhzOTZrNTFh9kNgw819KVIeo9GQxuaT4lI5QohG6\n', function(response) {
        if(response) {
            console.log("data was written");
        }
    });
    connection.write('client torchat-node\n');
    connection.write('version 1.0.0a\n');
    connection.write('profile_name testfastmac\n');
    connection.write('profile_text \n');
    connection.write('add_me \n');
    connection.write('status available\n');
    connection.end();
    //connection.setTimeout(60000);

    // WE have a valid socket lets bind to it
    connection.on('readable', function() {
        console.log("Outbound received response\n");
        var chunk;
        while(null != (chunk = connection.read())) {
            // ws.write(buffer.toString());
            console.log("Response: " + buffer.toString());
        }
    });

    connection.on('end', function() {
        console.log("Socked ended");
    });

    connection.on('timeout', function() {
        console.log("Connection timed out. Destroying socket");
        connection.end();
    });
});
