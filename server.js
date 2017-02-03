'use strict'
const express = require('express')
const verbose = require('./verbose.js');
const slapp = require('./slapp.js').get();
const cron = require('node-cron');
var archive = require('./archive.js');
var links = require('./links.js');
var stats = require('./stats.js');
var github = require('./github.js');
function _(obj){
  var str = JSON.stringify(obj, null, 4); // (Optional) beautiful indented output.
  console.log(str);
}
// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000

// Seeks token in the private channel
github.init(function(tokenFound){
  if(tokenFound){
    stats.start();
    links.start();
    archive.start();
  }
});
stats.loadStats();

// response to the user typing "help"
slapp.message('help', ['mention', 'direct_message'], (msg) => {
  msg.say(verbose.HELP_TEXT)
});

// response to the user joining the slack team
slapp.event('team_join', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user.id }, (err, data) => {
    msg.say({ channel: data.channel.id, text: verbose.WELCOME_TEXT })
  })
})
// Collect and dispatch all messages posted on public channels
slapp.message('(.*)', 'ambient', (msg) => {
  stats.receive(msg);
  links.receive(msg);
  archive.receive(msg);
})

// Can use a regex as well
slapp.message(/^(thanks|thank you)/i, ['mention', 'direct_message'], (msg) => {
  // You can provide a list of responses, and a random one will be chosen
  // You can also include slack emoji in your responses
  msg.say([
    "You're welcome :smile:",
    'Anytime :full_moon_with_face:'
  ])
})

// Catch every direct message to the bot and answer it with the help text
slapp.message('.*','direct_message', (msg) => {
  msg.say(verbose.HELP_TEXT);
})
// Catch every message mentioning the bot and answer it with the help text
slapp.message('.*', 'direct_mention', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user }, (err, data) => {
    msg.say({ channel: data.channel.id, text: verbose.HELP_TEXT })
  })
})

// Weekly stats newsletter and server restart
var weeklyTask = cron.schedule('*/5 * * * *',poke());
function poke(){
  _("restarting called");
  stats.handle_restart();
  links.handle_restart();
  archive.handle_restart();
  github.restart();
}
weeklyTask.start();

// attach Slapp to express server
var server = slapp.attachToExpress(express())
// start http server
server.listen(port, (err) => {})
