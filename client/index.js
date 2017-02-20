const http = require('http');
const utils = require('./utils');
const modulePath = require('path').join(__dirname, "modules");
const config = require('./config');
const mqtt = require('mqtt');
var modules = {};
require('fs').readdirSync(modulePath).forEach(function(file) {
    if(file !== "launcher") {
        modules[file] = require("./modules/" + file);
    }
});

var app = {};
app.subscriptions = {};

app.init = function() {
    var that = this;
    utils.debug("Initialising Alexa-Client by Tom Steele...");
    utils.debug("Connecting to MQTT Server...");
    this.connectMQTT().then(function(client) {
        utils.debug("Connected to: " + config.mqttServer, 1);
        utils.debug("Loading Modules...");
        for(var i in modules) {
            if(modules.hasOwnProperty(i)) {
                utils.debug(modules[i].name, 1);
                
                modules[i].init().then(function(i) {
                    that.subscribe(modules[i].subs, client);
                }(i));
            }
        }
    }, function(error) {
        utils.debug(error);
    })
}

app.connectMQTT = function() {
    return new Promise(function(resolve, reject) {
        var client = mqtt.connect(config.mqttServer, config.mqttOptions);
        client.on('connect', function() {
            resolve(client);
        })
    })
}


app.subscribe = function(subscriptions, client) {
    for(var i in subscriptions) {
        if(subscriptions.hasOwnProperty(i)) {
            var mqttTopic = config.mqttPrefix + "/" + subscriptions[i].mqttPrefix;
            utils.debug("Subscribing to: " + mqttTopic + " (" + utils.cryptr.encrypt(mqttTopic) + ")", 2);
            client.subscribe(utils.cryptr.encrypt(mqttTopic));
            app.subscriptions[mqttTopic] = subscriptions[i];
        }
    }
    client.on("message", this.handleMessage);
}

app.handleMessage = function(topic, message, p) {
    message = utils.cryptr.decrypt(message);
    topic = utils.cryptr.decrypt(topic);
    utils.debug(topic + ": " + message, 2);
    app.subscriptions[topic].action(topic, message);
}

app.init();

/* mqtt = require('mqtt');
const client = mqtt.connect("mqtt://broker.hivemq.com");
const kodi = require('kodi-ws');
const kodiModule = require('./modules/kodi');
kodiModule.init();
const cryptr = require('cryptr');
const config = {
    "mqttPrefix": "AlexaHome/"
}
const mqttPrefix = "TSteele/alexa/kodi/"
const kodiHost = "localhost";
const kodiPort = 9090;

const subs = ["connect", "play", "popular", "mute", "resume", "stop", "activation"];
client.on('connect', function() {
    console.log("Connected to broker. Waiting for commands.");
    for(var x in subs) {
        if(subs.hasOwnProperty(x)) {
            client.subscribe(mqttPrefix + subs[x]);
        }
    }
});

client.on('message', function(topic, message) {
    switch(topic) {
        case mqttPrefix + "connect": 
            console.log(message.toString());
            break;
        case mqttPrefix + "play":
            var options = JSON.parse(message.toString());
            console.log(message.toString());
            kodi(kodiHost, kodiPort).then(function(connection) {
                connection.Addons.ExecuteAddon("plugin.video.exodus", options).then(function(response) {
                    console.log(response);
                });
            });
            break;
        case mqttPrefix + "popular":
            var options = JSON.parse(message.toString());
            kodi(kodiHost, kodiPort).then(function(connection) {
                connection.Addons.ExecuteAddon("plugin.video.exodus", {"action": "movies", "url": "popular"}).then(function(response) {
                    console.log("Pulling up whats " + options.url)
                });
            });
            break;
        case mqttPrefix + "mute":
            var options = JSON.parse(message.toString());
            kodi(kodiHost, kodiPort).then(function(connection) {
                connection.Application.SetMute(options.muted);
            });
            break;
        case mqttPrefix + "resume":
            console.log("!");
            kodi(kodiHost, kodiPort).then(function(connection) {
                connection.Player.GetActivePlayers().then(function (players) {
                    Promise.all(players.map(function(player) {
                        connection.Player.PlayPause(player.playerid);
                        console.log("Pausing/Resuming");
                    }));
                });
            });
            break;
        case mqttPrefix + "stop":
            kodi(kodiHost, kodiPort).then(function(connection) {
                return connection.Player.GetActivePlayers().then(function (players) {
                    connection.GUI.ActivateWindow("home");
                    return Promise.all(players.map(function(player) {
                        connection.Player.Stop(player.playerid);
                    }));
                });
            });
            break;
        case mqttPrefix + "activation":
            console.log("Activation Required: " + message.toString());
            break;
    }
});
*/