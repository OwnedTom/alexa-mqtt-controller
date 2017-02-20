const config = require('./config');
const utils = require('../../utils.js');

var app = {};

app.name = "Example";

app.init = function() {
    return new Promise(function(resolve, reject) {
        resolve();
    })
}

app.subs = [
    {
        "mqttPrefix": config.mqttPrefix + "/" + "example",
        "action": function(topic, message) {
            utils.debug("Topic: " + topic + "\nMessage: " + message);
        }
    }
]

module.exports = app;