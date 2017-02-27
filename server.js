'use strict'
const express = require('express')
const slapp = require('./slapp.js').get();
const cronJob = require('cron').CronJob;
var kv = require('beepboop-persist')();
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
  kv.set("bot_token",msg.meta.bot_token.,function(err){
    if(err){
      _("error setting bot token");
      _(err);
    }
  });
  stats.receive(msg);
  links.receive(msg);
  archive.receive(msg);
})

// attach Slapp to express server
var server = slapp.attachToExpress(express())
// start http server
server.listen(port, (err) => {})
