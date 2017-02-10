const slapp = require('./slapp.js').get();
const verbose = require('./verbose.js');
var kv = require('beepboop-persist')();
function _(obj){
  var str = JSON.stringify(obj, null, 4); // (Optional) beautiful indented output.
  console.log(str);
}
var current_help_text = verbose.HELP_TEXT;
var current_welcome_text = verbose.WELCOME_TEXT;
function init(){
  kv.get("msgHelp",function(err,result){
    if(err){
      _("error while loading help message from the kv");
      current_help_text = verbose.HELP_TEXT;
    }
    else if(result)
      current_help_text = result;
    else{
      current_help_text = verbose.HELP_TEXT;
    }
  });
  kv.get("msgWelcome",function(err,result){
    if(err){
      _("error while loading welcome message from the kv");
      current_welcome_text = verbose.WELCOME_TEXT;
    }
    else if(result)
      current_welcome_text = result;
    else{
      current_welcome_text = verbose.WELCOME_TEXT;
    }
  });
}
// response to the user typing "help"
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
slapp.command('/messages','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      var strtokens = text.split(" ");
      var cmd = strtokens[0];
      var val = text.replace(cmd+' ','');

      if(!text)
        msg.respond("Options for /messages: \n" +
                "\`printHelp\` prints the current help message.\n" +
                "\`printWelcome\` prints the current welcome message.\n" +
                "\`setHelp [ARG]\`  sets [ARG] as the new help message.\n" +
                "\`setWelcome [ARG]\` sets [ARG] as the new welcome message.\n" +
                "\`defaultHelp \`  sets the help message to the default value.\n" +
                "\`defaultWelcome \` sets the welcome message to the default value.\n"
              );
      else if(cmd == 'printHelp')
        printHelp(msg);
      else if(cmd == 'printWelcome')
        printWelcome(msg);
      else if(cmd == 'setHelp')
        setHelp(msg,val);
      else if(cmd == 'setWelcome')
        setWelcome(msg,val);
      else if(cmd == 'defaultHelp')
        defaultHelp(msg);
      else if(cmd == 'defaultWelcome')
        defaultWelcome(msg);
      else
        msg.respond("Please use /messages to print the available options.");
    }
    else {
      msg.respond("Sorry, you're not an admin.");
    }
  })
})
function printHelp(msg){
  msg.respond(current_help_text);
}
function printWelcome(msg){
  msg.respond(current_welcome_text);
}
function setHelp(msg,val){
  current_help_text = val;
  kv.set("msgHelp",val,function(err){
    if(err){
      _("error setting msgHelp in the kv");
      _(err);
      }
  });
}
function setWelcome(msg,val){
  current_welcome_text = val;
  kv.set("msgWelcome",val,function(err){
    if(err){
      _("error setting msgWelcome in the kv");
      _(err);
      }
  });
}
function defaultHelp(msg){
  current_help_text = verbose.HELP_TEXT;
  kv.set("msgHelp",verbose.HELP_TEXT,function(err){
    if(err){
      _("error setting msgWelcome in the kv");
      _(err);
      }
  })
}
function defaultWelcome(msg){
  current_welcome_text = verbose.WELCOME_TEXT;
  kv.set("msgWelcome",verbose.WELCOME_TEXT,function(err){
    if(err){
      _("error setting msgWelcome in the kv");
      _(err);
      }
  })
}
module.exports = {
  init:init
}
