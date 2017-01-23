'use strict'
const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const verbose = require('./verbose.js');

var archive = require('./archive.js');
var links = require('./links.js');
var stats = require('./stats.js');
var github = require('./github.js');

function _(s) {
  var str = JSON.stringify(s, null, 4);
  console.log(str);
}

// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000
var slapp = Slapp({
  // Beep Boop sets the SLACK_VERIFY_TOKEN env var
  verify_token: process.env.SLACK_VERIFY_TOKEN,
  convo_store: ConvoStore(),
  context: Context()
});

// response to the user typing "help"
slapp.message('help', ['mention', 'direct_message'], (msg) => {
  msg.say(verbose.HELP_TEXT)
});

slapp.event('team_join', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user.id }, (err, data) => {
    msg.say({ channel: data.channel.id, text: verbose.WELCOME_TEXT })
  })
})

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

// Catch-all for any other responses not handled above
slapp.message('.*','direct_message', (msg) => {
  msg.say(verbose.HELP_TEXT);
})

slapp.message('.*', 'direct_mention', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user }, (err, data) => {
    msg.say({ channel: data.channel.id, text: verbose.HELP_TEXT })
  })
})

// attach Slapp to express server
var server = slapp.attachToExpress(express())
// start http server
server.listen(port, (err) => {
  if (err) {
    return console.error(err)
  }
  console.log(`Listening on port ${port}`)
})
