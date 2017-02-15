const kodi = require('kodi-ws');
const config = require('./config');
const utils = require('../../utils');
const subs = ["connect", "play", "popular", "mute", "resume", "stop", "activation"];

var app = {};

app.name = "Kodi";

app.init = function() {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.connect().then(function(connection) {
            utils.debug("Connected to Kodi", 2);
            resolve();
        }, function() {
            reject();
            utils.debug("Connection to Kodi timed out", 2);
        })
    })
}

app.subs = [
    {
        "mqttPrefix": config.mqttPrefix + "/" + "connect",
        "action": function(topic, message) {
            this.verifyKodiConection();
        }
    },
    {
        "mqttPrefix": config.mqttPrefix + "/" + "play",
        "action": function(topic, message) {
            var options = JSON.parse(message.toString());
            app.connect().then(function(connection) {
                connection.Addons.ExecuteAddon("plugin.video.exodus", options).then(function(res) {
                    utils.debug(message.toString());
                })
            })
        }
    },
    {
        "mqttPrefix": config.mqttPrefix + "/" + "popular",
        "action": function(topic, message) {
            var options = JSON.parse(message.toString());
            app.connect().then(function(connection) {
                connection.Addons.ExecuteAddon("plugin.video.exodus", options).then(function(res) {
                    utils.debug("Pulling up whats " + options.url)
                });
            });
        }
    },
    {
        "mqttPrefix": config.mqttPrefix + "/" + "resume",
        "action": function(topic, message) {
            app.connect().then(function(connection) {
                connection.Player.GetActivePlayers().then(function (players) {
                    Promise.all(players.map(function(player) {
                        connection.Player.PlayPause(player.playerid);
                    }));
                });
            })
        }
    },
    {
        "mqttPrefix": config.mqttPrefix + "/" + "mute",
        "action": function(topic, message) {
            var options = JSON.parse(message.toString());
            app.connect().then(function(connection) {
                connection.Application.SetMute(options.muted);
            })
        }
    },
    {
        "mqttPrefix": config.mqttPrefix + "/" + "stop",
        "action": function(topic, message) {
            app.connect().then(function(connection) {
                return connection.Player.GetActivePlayers().then(function(players) {
                    connection.GUI.ActivateWindow("home");
                    return Promise.all(players.map(function(player) {
                        connection.Player.Stop(player.playerid);
                    }))
                });
            })
        }
    }
]

app.connection = kodi(config.kodiHost, config.kodiPort);

app.connect = function() {
    return new Promise(function(resolve, reject) {
        utils.timeout(app.connection.then(function(connection) {
            resolve(connection);
        }), function() {
            reject();
        }, config.timeout);
    });
}

function delay(time) {
    return new Promise(function (fulfill) {
        setTimeout(fulfill, time);
    });
}

module.exports = app;