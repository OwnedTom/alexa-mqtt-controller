const config = require('./config');
const utils = require('../../utils');
const mqtt = require('../../mqtt');
const imdb = require('imdb-api');
const Trakt = require('trakt.tv');

const trakt = new Trakt({
    client_id: 'ee617ec8c3809c3629fa7b87e2106d4b93273bf44cd4fe00f7d5eb1008f629f9',
    client_secret: '91b0fe3eda36eb8f2caf131fd4184b2f81025409c5badb3c41eae293ddf36266',
    plugins: []
});


var app = {};
app.dictionary = {
    "put on": ["play", "put on", "watch", "start playing", "start", "start watching"],
    "pull up": ["show me", "pull up", "display", "load", "on screen", "show"]
}

app.name = "kodi";

app.init = function() {
    app.traktLogin();
}

app.traktLogin = function() {
    app.readToken().then(function(token) {
        utils.debug("Successfuly authenticated Trakt")
    }, function(token) {
        app.storeToken(token).then(function() {
            app.traktLogin();
        });

    });
}

app.storeToken = function(token) {
    return new Promise(function(resolve, reject) {
        require('fs').writeFile(config.traktTokenFile, JSON.stringify(token), function(err) {
            if(!err) {
                resolve();
            }
        });
    });
}

app.readToken = function() {
    return new Promise(function(resolve, reject) {
        require('fs').readFile(config.traktTokenFile, function(err, data) {
            if(err) {
                app.traktActivate().then(function(result) {
                    reject(result);
                });
                return false;
            }
            trakt.import_token(JSON.parse(data.toString())).then(function(token) {
                resolve(token);
            });
        })
    });
}

app.traktActivate = function() {
    return new Promise(function(resolve, reject) {
        trakt.get_codes().then(function(poll) {
            utils.debug("Activate Trakt by going to " + poll.verification_url + " and enter the code " + poll.user_code);
            resolve(trakt.poll_access(poll));
        }).catch(function(error) {
            reject(error.message);
        })
    })
    
}

app.getOptionsForTitle = function(req) {
    var type = "show movie";
    var season = 1;
    var episode = 1;
    var itemTitle;
    if(!utils.isEmpty(req.slot("SHOWORMOVIE", "")))
        itemTitle = req.slot("SHOWORMOVIE");
    else if (!utils.isEmpty(req.slot('TVSHOW', "")))
        itemTitle = req.slot('TVSHOW');
    else if (!utils.isEmpty(req.slot('MOVIE', "")))
        itemTitle = req.slot('MOVIE');
    utils.debug("Asked for title: " + itemTitle);
    if (!utils.isEmpty(req.slot('TVSHOW', ""))) {
        type = "show";
    }
    if (!utils.isEmpty(req.slot('MOVIE', ""))) {
        type = "movie";
    }
    if (!utils.isEmpty(req.slot('SEASON', ""))) {
        season = req.slot('SEASON');
        type = "show";
    }
    if (!utils.isEmpty(req.slot('EPISODE', ""))) {
        episode = req.slot('EPISODE');
        type = "show";
    }
    return new Promise(function(resolve) {
        trakt.search.text({
            query: itemTitle,
            type: type
        }).then(function(response) {
            if(response === null || response.length === 0) {
                resolve(itemTitle);
            }
            var extraFilter = response.filter(function(item) {
                return item[item.type].ids.imdb !== null && item[item.type].title.toLowerCase().indexOf(itemTitle.toLowerCase()) !== -1;
            });
            if(extraFilter.length !== 0) {
                response = extraFilter;
            }
            var showOrMovie = response[0].type;
            var item = response[0][showOrMovie];
            var imdbId = item.ids.imdb;
            if(imdbId === null) {
                imdbId = new Promise(function(resolveImdb) {
                    imdb.get(item.title, function(err, result) {
                        resolveImdb(result.imdbid);
                    });
                });
            } else {
                imdbId = new Promise(function(resolveImdb) {
                    resolveImdb(imdbId);
                });
            }
            imdbId.then(function(imdbId) {
                var options = {
                    action: "play",
                    type: showOrMovie,
                    meta: "{}",
                    title: item.title,
                    imdb: imdbId,
                    year: "" + item.year,
                    select: "2"
                };
                if(showOrMovie == "show") {
                    options.tvshowtitle = options.title;
                    if(utils.isEmpty(req.slot("SEASON", "")) && utils.isEmpty(req.slot("EPISODE", ""))) {
                        trakt.shows.progress.watched({
                            id: item.ids.trakt,
                            hidden: false,
                            specials: false
                        }).then(function(response) {
                            var episodetitle = "";
                            if(response.hasOwnProperty("next_episode")) {
                                if(utils.isEmpty(req.slot("EPISODE", ""))) {
                                    episode = response.next_episode.number;
                                }
                                if(utils.isEmpty(req.slot("SEASON", ""))) {
                                    season = response.next_episode.season;
                                }
                            }
                            if(!utils.isEmpty(req.slot("SEASON", ""))) {
                                season = req.slot("SEASON");
                            }
                            if(!utils.isEmpty(req.slot("EPISODE", ""))) {
                                episode = req.slot("EPISODE");
                            }
                            options.season = "" + season;
                            options.episode = "" + episode;
                            return resolve(options);
                        });
                    } else {
                        options.season = season;
                        options.episode = episode;
                        return resolve(options);
                    }
                } else {
                    return resolve(options);
                }
            });
        });
    });
}

app.intents = [
    {
        "name": "playKodi",
        "slots": {
            "MOVIE": "MOVIE",
            "TVSHOW": "TVSHOW",
            "SHOWORMOVIE": "SHOWORMOVIE",
            "SEASON": "NUMBER",
            "EPISODE": "NUMBER"
        },
        "utterances": [
            "{put on} the {film|movie} {-|MOVIE}",
            '{put on} {-|MOVIE} {film|movie}',
            '{put on} {-|SHOWORMOVIE}',
            '{put on} season {-|SEASON} of {-|TVSHOW}',
            '{put on} episode {-|EPISODE} of {-|TVSHOW}',
            '{put on} season {-|SEASON} episode {-|EPISODE} of {-|TVSHOW}',
            '{continue|continue watching|put on} {the |} next{ episode|} {-|TVSHOW}'
        ],
        "action": function(req, res) {
            app.getOptionsForTitle(req).then(function(options) {
                if(typeof options === "string") {
                    res.say("Unable to find anything by the name " + options).send();
                    return;
                }
                var topic = config.parent.mqttPrefix + app.name + "/" + "play";
                var message = JSON.stringify(options);
                mqtt.connect().then(function(client) {
                    utils.debug("Topic: " + utils.cryptr.encrypt(topic));
                    client.publish(utils.cryptr.encrypt(topic), utils.cryptr.encrypt(message));
                    res.say("Putting on " + options.title).send();
                });
            });
            return false;
        }
    },
    {
        "name": "popularKodi",
        "slots": {
            "POPTYPE": "POPTYPE"
        },
        "utterances": ["{pull up|}{what\'s| what is| what|whats} {POPTYPE}"],
        "action": function(req, res) {
            if(utils.isEmpty(req.slot("POPTYPE", ""))) {
                res.say("I didnt hear that. Did you want Popular, Trending or Featured?").send()
                return;
            }
            var topic = config.parent.mqttPrefix + app.name + "/" + "popular";
            var message = JSON.stringify({
                "action": "movies",
                "url": req.slot("POPTYPE")
            });
            
            mqtt.connect().then(function(client) {
                client.publish(utils.cryptr.encrypt(topic), utils.cryptr.encrypt(message));
                res.say("Pulling up whats " + req.slot("POPTYPE")).send();

            });
        }
    },
    {
        "name": "muteKodi",
        "slots": {},
        "utterances": ["{mute|silence|quiet}{ kodi| tv| movie| show|}"],
        "action": function(req, res) {
            var topic = config.parent.mqttPrefix + app.name + "/" + "mute";
            var message = JSON.stringify({
                "muted": true
            });
            mqtt.connect().then(function(client) {
                client.publish(utils.cryptr.encrypt(topic), utils.cryptr.encrypt(message));
                res.send();
            });
            return false;
        }
    },
    {
        "name": "unmuteKodi",
        "slots": {},
        "utterances": ["{unmute|noise|make noise|sound}{ kodi| tv| movie| show|}"],
        "action": function(req, res) {
            var topic = config.parent.mqttPrefix + app.name + "/" + "mute";
            var message = JSON.stringify({
                "muted": false
            });
            mqtt.connect().then(function(client) {
                client.publish(utils.cryptr.encrypt(topic), utils.cryptr.encrypt(message));
                res.send();
            });
            return false;
        }
    },
    {
        "name": "pauseResume",
        "slots": {},
        "utterances": ["{pause|unpause|resume}{ kodi| tv| movie| show|}"],
        "action": function(req, res) {
            var topic = config.parent.mqttPrefix + app.name + "/" + "resume";
            var message = JSON.stringify({
                "resume": new Date().toDateString()
            });
            mqtt.connect().then(function(client) {
                client.publish(utils.cryptr.encrypt(topic), utils.cryptr.encrypt(message));
                res.send();
            });
            return false;
        }
    },
    {
        "name": "stop",
        "slots": {},
        "utterances": ["stop{ kodi| tv| movie| show| plackback}"],
        "action": function(req, res) {
            var topic = config.parent.mqttPrefix + app.name + "/" + "stop";
            var message = JSON.stringify({
                "stop": new Date().toDateString()
            });
            mqtt.connect().then(function(client) {
                client.publish(utils.cryptr.encrypt(topic), utils.cryptr.encrypt(message));
                res.send();
            });
            return false;
        }
    }
]

module.exports = app;