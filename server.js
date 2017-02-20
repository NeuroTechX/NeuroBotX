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

// Simple logging function
function _(obj){
  var str = JSON.stringify(obj, null, 4);
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
// Load the stats from the strorage if any
stats.loadStats();
// Load the default bot messages
messages.init();

// Collect and dispatch all messages posted on public channels
slapp.message('(.*)', 'ambient', (msg) => {
  stats.receive(msg);
  links.receive(msg);
  archive.receive(msg);
})

////////////////////////////////////Auto commit for restart
// // Indicates if the bot entered a process of restart
// var restartInProgress = false;
//
// // Weekly stats newsletter and server restart
// var weeklyTask = new cronJob('* */10 * * * *',
//   lo.throttle(function(){
//     var currentTS = Math.floor(Date.now() / 1000);
//     var restartTS = serverStartTS + 86400;//day;
//     if(!restartInProgress && currentTS>=restartTS){
//       console.log("restart actually accepted");
//       restartInProgress = true;
//       stats.handle_restart();
//       links.handle_restart();
//       archive.handle_restart();
//       restartInProgress = false;
//     }
//   },60001),null,false);
//weeklyTask.start();


// attach Slapp to express server
var server = slapp.attachToExpress(express())
// start http server
server.listen(port, (err) => {})
