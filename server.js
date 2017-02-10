'use strict'
const express = require('express')
const slapp = require('./slapp.js').get();
const cronJob = require('cron').CronJob;
var lo = require('lodash');
var archive = require('./archive.js');
var links = require('./links.js');
var stats = require('./stats.js');
var github = require('./github.js');
var messages = require('./messages.js');
function _(obj){
  var str = JSON.stringify(obj, null, 4); // (Optional) beautiful indented output.
  console.log(str);
}
// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000

var serverStartTS = Math.floor(Date.now() / 1000);
// Seeks token in the private channel
github.init(
  function(tokenFound){
    if(tokenFound){
      stats.start();
      links.start();
      archive.start();
    }
  }
);
stats.loadStats();
messages.init();

// Collect and dispatch all messages posted on public channels
slapp.message('(.*)', 'ambient', (msg) => {
  stats.receive(msg);
  links.receive(msg);
  archive.receive(msg);
})

var restartInProgress = false;

// Weekly stats newsletter and server restart
var weeklyTask = new cronJob('* */10 * * * *',
  lo.throttle(function(){
    _("restarting called");
    var currentTS = Math.floor(Date.now() / 1000);
    var restartTS = serverStartTS + 86400;//day;
    console.log("Current TimeStamp:");
    console.log(currentTS);
    console.log("Restart TimeStamp:");
    console.log(restartTS);
    if(!restartInProgress && currentTS>=restartTS){
      console.log("restart actually accepted");
      stats.handle_restart();
      links.handle_restart();
      archive.handle_restart();
      setTimeout(github.restart(),120000);
      restartInProgress = true;
    }
  },60001),null,false);

weeklyTask.start();


// attach Slapp to express server
var server = slapp.attachToExpress(express())
// start http server
server.listen(port, (err) => {})
