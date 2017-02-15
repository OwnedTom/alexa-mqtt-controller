const mqtt = require('mqtt');
const config = require('./config');

var app = {};

app.connect = function() {
    return new Promise(function(resolve, reject) {
        var client = mqtt.connect(config.mqttServer);
        client.on('connect', function() {
            console.log(":P");
            resolve(client);
        })
    })
}

module.exports = app;