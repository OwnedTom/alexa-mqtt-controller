'use strict';

// https://github.com/PaulAvery/kodi-ws
// https://www.bignerdranch.com/blog/developing-alexa-skills-locally-with-nodejs-deploying-your-skill-to-staging/
//
// NOTE TO SELF - Have made custom slots for: MOVIE, TVSHOW, SHOWORMOVIE

const _ = require('lodash');
const Alexa = require('alexa-app');
const modulePath = require('path').join(__dirname, "modules");
const config = require('./config');
const utils = require('./utils');
var modules = {};
require('fs').readdirSync(modulePath).forEach(function(file) {
    if(file !== "launcher") {
        modules[file] = require("./modules/" + file);
        modules[file].init();
    }
});

var app = new Alexa.app('alexa-mqtt-controller-server');

app.getDictionary = function() {
    var result = {};
    for(var x in modules) {
        if(modules.hasOwnProperty(x)) {
            result = Object.assign(result, modules[x].dictionary);
        }
    }
    return result;
}
app.dictionary = app.getDictionary();

app.launch(function(req,res) {
    
});

app.registerIntents = function() {
    for(var x in modules) {
        if(modules.hasOwnProperty(x)) {
            let module =  modules[x];
            for(var y in module.intents) {
                if(module.intents.hasOwnProperty(y)) {
                    let intent = module.intents[y];
                    app.intent(intent.name, {
                        "slots": intent.slots,
                        "utterances": intent.utterances
                    }, intent.action);
                }
            }
        }
    }
}

app.registerIntents();

/*const trakt = new Trakt({
    client_id: 'ee617ec8c3809c3629fa7b87e2106d4b93273bf44cd4fe00f7d5eb1008f629f9',
    client_secret: '91b0fe3eda36eb8f2caf131fd4184b2f81025409c5badb3c41eae293ddf36266',
    plugins: []
});

var token = {"access_token":"fe2f091ef576e0e377c43b3ef1f4f59df36bfee5c47a10b29d98411910ae6239","expires":1494338906804,"refresh_token":"eac5a8465e8ae179bea23ab6c492b4440b66b5b5a2e1efac0a6dc6058e37a1dd"};
const tokenCacheFile = "trakt-token-cache.json";
trakt.import_token(token);
//trakt.get_codes().then(poll => {
    //console.log(poll);
//    client.publish(mqttPrefix + "activation", poll.user_code);
//    return trakt.poll_access(poll).then(storeToken);
//});

function storeToken() {
    token = trakt.export_token();
}

var app = new Alexa.app('kodi');
app.dictionary = {
    "put on": ["play", "put on", "watch", "start playing", "start", "start watching"],
    "pull up": ["show me", "pull up", "display", "load", "on screen", "show"]
};
app.launch(function(req, res) {
    mqtt.connect().then(function(client) {
        client.publish(mqttPrefix + "connect", "Connect");
    });
    var prompt = 'To control your home, give me a command';
    res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

function getOptionsForTitle(req) {
    var type = 'show,movie';
    var season = 1;
    var episode = 1;
    var itemTitle;
    if (!_.isEmpty(req.slot('SHOWORMOVIE', "")))
        itemTitle = req.slot('SHOWORMOVIE');
    else if (!_.isEmpty(req.slot('TVSHOW', "")))
        itemTitle = req.slot('TVSHOW');
    else if (!_.isEmpty(req.slot('MOVIE', "")))
        itemTitle = req.slot('MOVIE');
    console.log("Asked for title: %s", itemTitle);
    if (!_.isEmpty(req.slot('TVSHOW', ""))) {
        type = "show";
    }
    if (!_.isEmpty(req.slot('MOVIE', ""))) {
        type = "movie";
    }
    if (!_.isEmpty(req.slot('SEASON', ""))) {
        season = req.slot('SEASON');
        type = "show";
    }
    if (!_.isEmpty(req.slot('EPISODE', ""))) {
        episode = req.slot('EPISODE');
        type = "show";
    }
    return new Promise(function (resolve) {
        trakt.search.text({
            query: itemTitle,
            type: type
        })
        .then(response => {
            if (response === null || response.length === 0) {
                console.log(response);
                resolve(itemTitle);
            }
            console.log("Trakt Responses:");
            console.log(response);
            //Make the result slightly more precise
            var extraFilter = _.filter(response, function(item) {
                return item[item.type].ids.imdb !== null && item[item.type].title.toLowerCase().indexOf(itemTitle.toLowerCase()) !== -1;
            });
            if (extraFilter.length !== 0) {
                response = extraFilter;
            }
            var showOrMovie = response[0].type;
            var item = response[0][showOrMovie];
            var imdbId = item.ids.imdb;
            //For some reason trakt doesn't always return a imdb, this breaks exodus
            if (imdbId === null) {
                imdbId = new Promise(function (resolveImdb) {
                    imdb.get(item.title, function(err, things) {
                        resolveImdb(things.imdbid);
                    });
                });
            } else {
                imdbId = new Promise(function (resolveImdb) {
                     resolveImdb(imdbId);
                });
            }
            imdbId.then(function(imdbId) {
                console.log("Trakt Response:");
                console.log(response[0]);
                var options = {
                    action: "play",
                    type: showOrMovie,
                    meta: "{}",
                    title: item.title,
                    imdb: imdbId,
                    //tvdb: item.ids.tvdb,
                    year: "" + item.year,
                    //premiered: "" + item.year,
                    select: "2"
                };
                if (showOrMovie == "show") {
                    options.tvshowtitle = options.title;

                    if (_.isEmpty(req.slot('SEASON')) && _.isEmpty(req.slot('EPISODE'))) {
                        trakt.shows.progress.watched({
                            id: item.ids.trakt,
                            hidden: false,
                            specials: false
                        }).then(function (response) {
                            var episodetitle = "";
                            if (response.hasOwnProperty("next_episode")) {
                                console.log("Next episode:");
                                console.log(response.next_episode);
                                if (_.isEmpty(req.slot('EPISODE', ""))) {
                                    episode = response.next_episode.number;
                                }
                                if (_.isEmpty(req.slot('SEASON', ""))) {
                                    season = response.next_episode.season;
                                }
                                //episodetitle = response.next_episode.title;
                                //res.say("Next episode is season " + season + " episode " + episode + " titled: " + title).send();
                            }
                            if (!_.isEmpty(req.slot('SEASON', ""))) {
                                season = req.slot('SEASON');
                            }
                            if (!_.isEmpty(req.slot('EPISODE', ""))) {
                                episode = req.slot('EPISODE');
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


app.intent('playKodi', {
    'slots': {
        'MOVIE': 'MOVIE',
        'TVSHOW': 'TVSHOW',
        'SHOWORMOVIE': 'SHOWORMOVIE',
        'SEASON': 'NUMBER',
        'EPISODE': 'NUMBER'
    },
    'utterances': [
        '{put on} the {film|movie} {-|MOVIE}',
        '{put on} {-|MOVIE} {film|movie}',
        '{put on} {-|SHOWORMOVIE}',
        '{put on} season {-|SEASON} of {-|TVSHOW}',
        '{put on} episode {-|EPISODE} of {-|TVSHOW}',
        '{put on} season {-|SEASON} episode {-|EPISODE} of {-|TVSHOW}',
        '{continue|continue watching|put on} {the |} next{ episode|} {-|TVSHOW}'
    ]
}, function(req, res) {
    getOptionsForTitle(req).then(function(options) {
        if (typeof(options) == "string") {
            res.say("Unable to find anything by the name " + options).send();
            return;
        }
        console.log("Publishing to " + mqttPrefix + "play");
        client = mqtt.connect("mqtt://broker.hivemq.com");
        client.on('connect', function() {
            client.publish(mqttPrefix + "play", JSON.stringify(options));
            res.say("Putting on " + options.title).send();
        });
    });
    return false;
});


//TODO - combine these 3 with a custom slot
app.intent('popularKodi', {
    'slots': {},
    'utterances': ['{pull up|}{ what\'s| what is| what|whats} popular']
}, function(req, res) {
    client = mqtt.connect("mqtt://broker.hivemq.com");
    client.on('connect', function() {
        client.publish(mqttPrefix + "popular", JSON.stringify({
            "action": "movies",
            "url": "popular"
        }));
        res.say("Pulling up whats popular").send();
    });
    return false;
});

app.intent('trendingKodi', {
    'slots': {},
    'utterances': ['{pull up|}{ what\'s| what is| what|whats} trending']
}, function(req, res) {
    client = mqtt.connect("mqtt://broker.hivemq.com");
    client.on('connect', function() {
        client.publish(mqttPrefix + "popular", JSON.stringify({
            "action": "movies",
            "url": "trending"
        }));
        res.say("Pulling up whats trending").send();
    });
    return false;
});

app.intent('featuredKodi', {
    'slots': {},
    'utterances': ['{pull up|}{ what\'s| what is| what|whats} featured']
}, function(req, res) {
    client = mqtt.connect("mqtt://broker.hivemq.com");
    client.on('connect', function() {
        client.publish(mqttPrefix + "popular", JSON.stringify({
            "action": "movies",
            "url": "featured"
        }));
        res.say("Pulling up whats featured").send();
    });
    return false;
});


app.intent('muteKodi', {
    'slots': {},
    'utterances': ['{mute|silence|quiet}{ kodi| tv| movie| show|}']
}, function(req, res) {
    client = mqtt.connect("mqtt://broker.hivemq.com");
    client.on('connect', function() {
        client.publish(mqttPrefix + "mute", JSON.stringify({
            "muted": true
        }));
        res.send();
    });
    return false;
});

app.intent('unmuteKodi', {
    'slots': {},
    'utterances': ['{unmute|noise|make noise|sound}{ kodi| tv| movie| show|}']
}, function(req, res) {
    client = mqtt.connect("mqtt://broker.hivemq.com");
    client.on('connect', function() {
        client.publish(mqttPrefix + "mute", JSON.stringify({
            "muted": false
        }));
        res.send();
    });
    return false;
});

app.intent('pauseResume', {
    'slots': {},
    'utterances': ['{pause|unpause|resume}{ kodi| tv| movie| show| playback|}']
}, function(req, res) {
    client = mqtt.connect("mqtt://iot.eclipse.org");
    client.on('connect', function() {
        client.publish(utils.cryptr.encrypt(mqttPrefix + "resume"), utils.cryptr.encrypt(JSON.stringify({
            "resume": true
        })));
        res.send();
    });
    return false;
});

app.intent('stop', {
    'slots': {},
    'utterances': ['stop{ kodi| tv| movie| show| playback|}']
}, function(req, res) {
    client = mqtt.connect("mqtt://broker.hivemq.com");
    client.on('connect', function() {
        client.publish(mqttPrefix + "stop", JSON.stringify({
            "stop": true
        }));
        res.send();
    });
    return false;
});


//hack to support custom utterances in utterance expansion string
//var utterancesMethod = app.utterances;
//app.utterances = function() {
//    return utterancesMethod().replace(/\{\-\|/g, '{');
//};
*/
module.change_code = 1;
module.exports = app;
