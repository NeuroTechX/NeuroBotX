const slapp = require('./slapp.js').get();
const verbose = require('./verbose.js');
var github = require('./github.js');
var kv = require('beepboop-persist')();

// Simple logging function
function _(obj){
  var str = JSON.stringify(obj, null, 4);
  console.log(str);
}

var current_help_text = verbose.HELP_TEXT;
var current_welcome_text = verbose.WELCOME_TEXT;

/**
 * This function initializes the bot messages
 */
function init(){
  github.get().repos.getContent({
      owner:"NeuroTechX",
      repo:"ntx_slack_archive",
      path:'help.md',
    },
    function(err,res){
    	if (!err) {
        var b64fileBody = res.content;
        var bufBody = new Buffer(b64fileBody, 'base64')
        var fileBody = bufBody.toString();
        current_help_text = fileBody;
      }
      else{
        current_help_text = verbose.HELP_TEXT;
      }
  });
  github.get().repos.getContent({
      owner:"NeuroTechX",
      repo:"ntx_slack_archive",
      path:'welcome.md',
    },
    function(err,res){
      if (!err) {
        var b64fileBody = res.content;
        var bufBody = new Buffer(b64fileBody, 'base64')
        var fileBody = bufBody.toString();
        current_welcome_text = fileBody;
      }
      else {
        current_welcome_text=verbose.WELCOME_TEXT;
      }
  });
}

//Behaviour of the bot when he is mentioned or mesages with DM
slapp.message('help', ['mention', 'direct_message'], (msg) => {
  msg.say(current_help_text)
});

// response to the user joining the slack team
slapp.event('team_join', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user.id }, (err, data) => {
    msg.say({ channel: data.channel.id, text:current_welcome_text })
  })
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
  msg.say(current_help_text);
})
// Catch every message mentioning the bot and answer it with the help text
slapp.message('.*', 'direct_mention', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user }, (err, data) => {
    msg.say({ channel: data.channel.id, text:current_help_text})
  })
})
// Handler of the slash command
slapp.command('/messages','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      _("text")
      _(text)
      var strtokens = text.split(" ");
      var cmd = strtokens[0];
      var val = text.replace(cmd+' ','');
      _("val")
      _(val)
      if(!text)
        msg.respond("Options for /messages: \n" +
                "\`printHelp\` prints the current help message.\n" +
                "\`printWelcome\` prints the current welcome message.\n" +
                "\`reloadHelpFromGithub \`  reloads the help messages from the ntx_slack_archive github repo.\n" +
                "\`reloadWelcomeFromGithub \` reloads the welcome messages from the ntx_slack_archive github repo.\n"
              );
      else if(cmd == 'printHelp')
        printHelp(msg);
      else if(cmd == 'printWelcome')
        printWelcome(msg);
      else if(cmd == 'reloadHelpFromGithub')
        reloadHelpFromGithub(msg);
      else if(cmd == 'reloadWelcomeFromGithub')
        reloadWelcomeFromGithub(msg);
      else
        msg.respond("Please use /messages to print the available options.");
    }
    else {
      msg.respond("Sorry, you're not an admin.");
    }
  })
})
/**
 * Prints the current help message
 * @param {object} msg the slash command message sent by slapp
 */
function printHelp(msg){
  msg.respond(current_help_text);
}
/**
 * Prints the current welcome message
 * @param {object} msg the slash command message sent by slapp
 */
function printWelcome(msg){
  msg.respond(current_welcome_text);
}

/**
 * Sets the current help message to the default one
 * @param {object} msg the slash command message sent by slapp
 */
function reloadHelpFromGithub(msg){

  github.get().repos.getContent({
      owner:"NeuroTechX",
      repo:"ntx_slack_archive",
      path:'help.md',
    },
    function(err,res){
    	if (!err) {
        var b64fileBody = res.content;
        var bufBody = new Buffer(b64fileBody, 'base64')
        var fileBody = bufBody.toString();
        current_help_text = fileBody;
        msg.respond("Help set to Default from the github file");
      }
      else{
        current_help_text = verbose.HELP_TEXT;
        msg.respond("Coudn't read from github. Help set to default from the hard-coded string");
      }
  });
}
/**
 * Sets the current welcome message to the default one
 * @param {object} msg the slash command message sent by slapp
 */
function reloadWelcomeFromGithub(msg){
  github.get().repos.getContent({
      owner:"NeuroTechX",
      repo:"ntx_slack_archive",
      path:'welcome.md',
    },
    function(err,res){
      if (!err) {
        var b64fileBody = res.content;
        var bufBody = new Buffer(b64fileBody, 'base64')
        var fileBody = bufBody.toString();
        current_welcome_text = fileBody;
        msg.respond("Welcome set to Default from the github file");
      }
      else {
        current_welcome_text=verbose.WELCOME_TEXT;
        msg.respond("Coudn't read from github. Welcome set to default from the hard-coded string");
      }
  });
}
module.exports = {
  init:init
}
