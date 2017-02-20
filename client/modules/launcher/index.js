const config = require('./config');
const utils = require('../../utils.js');
const exec = require('child_process').exec;

var app = {};

app.name = "Launcher";

app.init = function() {
    return new Promise(function(resolve, reject) {
        resolve();
    })
}

app.subs = [
    {
        "mqttPrefix": config.mqttPrefix + "/" + "launch",
        "action": function(topic, message) {
            var options = JSON.parse(message);
            var program = config.programs.filter(function(v, i) {
                return v.alias = options.alias;
            });
            if(program.length) {
                exec(program[0].cmd, function(error, stdout, stderr) {
                    // command output is in stdout
                });
            }
        }
    }
]

module.exports = app;