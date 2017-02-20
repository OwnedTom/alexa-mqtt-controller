const mqtt = require('mqtt');
const Cryptr = require('cryptr');
const config = require('./config');
const utils = require('./utils');
var cryptr = new Cryptr(config.cryptoKey);
var app = {};

app.connect = function() {
    return new Promise(function(resolve, reject) {
        var client = mqtt.connect(config.mqttServer);
        
        client.on('connect', function() {
            client.publishEncyrpted = function(topic, message) {
                var topic = arguments[0];
                var message = arguments[1];
                utils.debug("Topic: " + topic);
                utils.debug("Message: " + message);
                topic = cryptr.encrypt(topic);
                message = cryptr.encrypt(message);
                client.publish(topic,message, function() {
                    console.log("Published");
                });
            }
            resolve(client);
        });
        client.on('message', function(a, b) {

        });
        client.on('error', function(e) {
            utils.debug(e);
        })
    })
}

module.exports = app;