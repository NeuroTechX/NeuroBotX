const slapp = require('./slapp.js').get();
const HashMap = require('hashmap');
const request = require('request');
const fs = require('fs');
var kv = require('beepboop-persist')();

var github = require('./github.js')

/**
 * This function logs the received obj to the console
 * @param {object} obj object to be logged
 */
function _(obj){
  var str = JSON.stringify(obj, null, 4);
  console.log(str);
}

// Archiving feature state
var isArchiving = false;

/**
 * This function receives a message and send to the send function with the right format
 * @param {object} msg the message sent by slapp that is meant to be archived
 */
function receive(msg){
  if(isArchiving){
    slapp.client.channels.info({token:msg.meta.bot_token,channel:msg.body.event.channel}, (err, resultChannel) => {
      slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.event.user}, (uerr, resultUser) => {
        var timeStamp = new Date(msg.body.event.ts * 1000)
        var obj = {user:resultUser.user.name,
                    ts:timeStamp,
                    text:msg.body.event.text,
                    channel:resultChannel.channel.name};
        archive_push(obj);
      });
    });
  }
}
// Sets the handler for the archivetogit slash command
slapp.command('/archivetogit','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      if(!text)
        msg.respond("Options for /archivetogit: \n" +
                    "\`start\` starts the archiving to git. (Github token must be initialized first using /github)\n" +
                    "\`stop \` stops the archiving to git.\n" );
      else if(text == 'start')
        archive_start(msg);
      else if(text == 'stop')
        archive_stop(msg);
      else {
        msg.respond("Please use /archivetogit to print the available options.");
      }
    }
    else {
      msg.respond("Sorry, you're not an admin.");
    }
  })
})
/**
 * This function enables the archiving flag
 */
function start(){
  isArchiving=true;
}
/**
 * This function starts the message archiving if a github token is specified and the archiving flag is up
 * @param {object} msg the message received from slapp following the user command
 */
function archive_start(msg){
  if(github.getToken()!=''){
    if(!isArchiving){
  		isArchiving=true;
  	msg.respond("Archiving started.");
  	}
  	else {
  		msg.respond("Archiving is already in progress.");
  	}
  }else{
    msg.respond("Please set the github token first.");
  }
}
/**
 * This function stops the message archiving
 * @param {object} msg the message received from slapp following the user command
 */
function archive_stop(msg){
  if(isArchiving){
		isArchiving=false;
		msg.respond("Archiving stopped.");
	}
	else {
		msg.respond("Archiving is already stoped.");
	}
}
/**
 * This function pushes the message to github
* @param {object} msg the message received from slapp following the user command
 */
function archive_push(obj){
  var channelPageName = obj.channel + '.md';
  github.get().repos.getContent({
   owner:'NeuroTechX',
   repo:'ntx_slack_archive',
   path:''},function(err,result){
    var found = false;
    for (var i = 0; i < result.length && !found; i++) {
      if (result[i].name === channelPageName) {
        found = true;
      }
    }
    if(found)
      editPage(obj);
    else {
      createPage(obj);
    }
  });
}
/**
 * This function edites an existing github page to include the new archive
* @param {object} obj the object to be added to the page
 */
function editPage(obj){
  github.get().repos.getContent({
      owner:"NeuroTechX",
      repo:"ntx_slack_archive",
      path:obj.channel+'.md',
    },
    function(err,res){
    	if (!err) {
        var ps = [];
        var taggedUsers = obj.text.match(/([<][@][U][A-Za-z0-9]+[>])/g);
        if(taggedUsers){
          var taggedUsersIds = taggedUsers.slice();
          for(var i=0;i<taggedUsersIds.length;i++){
            taggedUsersIds[i] = taggedUsersIds[i].replace(/(<|@|>)/g,'');
          }

          for(var i=0;i<taggedUsersIds.length;i++){
            ps.push(getUserInfoPromise(taggedUsersIds[i]));
          }
        }
          Promise.all(ps).then(function(results){
            for(var i=0;i<results.length;i++){
              obj.text = obj.text.replace(taggedUsers[i],results[i]);
              _(obj.text);
            }
          }).then(function(){
            var quotedText = obj.text.replace(/([\n\r])/g, '\n\n> $1');
            var b64fileBody = res.content;
            var bufBody = new Buffer(b64fileBody, 'base64')
            var fileBody = bufBody.toString();
            fileBody+= ""+formatDate(obj.ts)+"\n\n **"+ obj.user +"**" + " :\n\n >" + quotedText + "\n\n";
            var content = Buffer.from(fileBody, 'ascii');
            var b64content = content.toString('base64');
            var shaStr = res.sha;
            github.get().repos.updateFile({
              owner:"NeuroTechX",
              repo:"ntx_slack_archive",
              path:obj.channel+'.md',
              message:"Edubot Push",
              content:b64content,
              sha: shaStr
            }, function(err, res) {
            });
          });
    	}
	});
}
/**
 * This function formats the timestamp to a user friendly format
 * @param {timestamp} ts the time stamp to format
 */
function formatDate(ts){
  return ts.toLocaleDateString("en-US") + " " + ts.toLocaleTimeString(["en-US"], {hour: '2-digit', minute:'2-digit'});
}
/**
 * This function creates a github archiving page
 * @param {string} obj data to push
 */
function createPage(obj){
      var fileBody = "######"+obj.channel+"\n\n";
      var quotedText = obj.text.replace(/([\n\r])/g, '\n\n> $1');
			fileBody+= ""+formatDate(obj.ts)+"\n\n **"+ obj.user +"**" + " :\n\n >" + quotedText + "\n\n";

      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');

      github.get().repos.createFile({
        owner:"NeuroTechX",
        repo:"ntx_slack_archive",
        path:obj.channel+'.md',
        message:"Edubot Push",
        content:b64content
      }, function(err, res) {
      });
}
/**
 * This function returns a promise wrapping the user info get function
 * @param {string} uid id of the user
 * @returns {Promise}
 */
function getUserInfoPromise(uid){
  return new Promise(function(resolve, reject) {
    kv.get("bot_token",function(err,bToken){
      if(err)
        _("error while loading bot token");
      else if(!err && bToken){
        slapp.client.users.info({token:bToken,user:uid}, (err, data) => {
          if(err)
            reject(err);
          else
            resolve(data.user.name);
        });
      }
    });
  });
}
module.exports = {
  receive:receive,
  start:start
}
