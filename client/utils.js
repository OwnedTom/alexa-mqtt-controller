const config = require('./config');
const Cryptr = require('cryptr');
var app = {};

app.cryptr = new Cryptr(config.cryptoKey);

app.timeout = function(promise, rejection, timeout) {
    return Promise.race([
        promise,
        new Promise(function(resolve, reject) {
            setTimeout(function() { rejection() }, timeout);
        })
    ]);
}

app.debug = function(message, i) {
    var indent = typeof i === "undefined" ? 0 : i;
    for(var x = 0; x < indent; x++) {
        message = "  " + message;
    }
    if(config.debug) {
        console.log(message);
    }
}

module.exports = app;