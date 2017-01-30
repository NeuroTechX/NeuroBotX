'use strict'
const express = require('express')
const verbose = require('./verbose.js');
const slapp = require('./slapp.js').get();
const cron = require('node-cron');
var archive = require('./archive.js');
var links = require('./links.js');
var stats = require('./stats.js');
var github = require('./github.js');

// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000

// Seeks token in the private channel
github.init();
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
var weeklyTask = cron.schedule('30 8 * * Friday',poke());
function poke(){
  stats.cronPoke();
  stats.saveStats();
  restart();
}

/**
 * This function saves the bot state and restarts the beepboophq server.
 */
function restart(){
  // var filePath = "https://raw.githubusercontent.com/NeuroTechX/ntx_slack_resources/master/_pages/slack-links.md";
	// request.get(filePath, function (fileerror, fileresponse, fileBody) {
  // 	if (!fileerror && fileresponse.statusCode == 200) {
	// 		fileBody+="<ul>";
	// 		for(var i=0;i<links.length;i++){
	// 			fileBody+="<li>" + links[i] + "</li>";
	// 		}
	// 		fileBody+="</ul>";
  //     var content = Buffer.from(fileBody, 'ascii');
  //     var b64content = content.toString('base64');
	// 		var blobPath = "https://api.github.com/repos/NeuroTechX/ntx_slack_resources/contents/_pages/slack-links.md";
  //     var options = {
  //       url: blobPath,
  //       headers: {
  //         'User-Agent': 'Edubot-GitHub-App'
  //       }
  //     };
	// 		request.get(options, function (bloberror, blobresponse, blobBody) {
	//     	if (!bloberror && blobresponse.statusCode == 200) {
  //         var shaStr = JSON.parse(blobBody).sha;
  //         ("Sha str")
	// 				github.get().repos.updateFile({
	// 					owner:"NeuroTechX",
	// 					repo:"ntx_slack_resources",
	// 					path:"_pages/slack-links.md",
	// 					message:"Edubot Push",
	// 					content:b64content,
	// 					sha: shaStr
	// 				}, function(err, res) {
  //               links = [];
  //             });
  //
	// 			}
	// 		});
  // 	}
	// });
}

// attach Slapp to express server
var server = slapp.attachToExpress(express())
// start http server
server.listen(port, (err) => {})
