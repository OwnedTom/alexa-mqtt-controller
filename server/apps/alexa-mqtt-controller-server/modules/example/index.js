const config = require('./config');
const utils = require('../../utils');
const mqtt = require('../../mqtt');

var app = {};

app.name = "example";

app.dictionary = {
    "example": ["example", "test"]
}

app.init = function() {

}

app.intents = [
    {
        "name": "example",
        "slots": {},
        "utterances": ["example"],
        "action": function(req, res) {
            var topic = config.parent.mqttPrefix + app.name + "/" + "example";
            var message = "Hello World";
            console.log(topic + ": " + message);
            mqtt.connect().then(function(client) {
                client.publishEncyrpted(topic, message);
                res.send();
            });
            return false;
        }
    }
]

module.exports = app;