const config = require('./config');
const utils = require('../../utils');

var app = {};

app.name = "launcher";

app.dictionary = {
    "launch": ["start", "launch", "execute"]
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
            mqtt.connect().then(function(client) {
                client.publish(utils.cryptr.encrypt(topic), utils.cryptr.encrypt(message));
                res.send();
            });
            return false;
        }
    }
]

module.exports = app;