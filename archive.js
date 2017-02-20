const slapp = require('./slapp.js').get();
const HashMap = require('hashmap');
const request = require('request');
const fs = require('fs');

var github = require('./github.js')
function _(obj){
  var str = JSON.stringify(obj, null, 4);
  console.log(str);
}
// Hashmap storing the archive waiting to be pushed to github.
// var msgMap = new HashMap();
// var msgMapLength = 0;
var buffer =[];
// Archiving feature state
var isArchiving = false;
// Number of messages per channel before push to github
//const ARCHIVE_BUFFER_MAX_LENGTH = 10;

/**
 * This function that handles the module behaviour when the server is about to restart
 */
function handle_restart(){
  keys = msgMap.keys();
  keys.forEach(function(key){
    var array = msgMap.get(key);
    if(array.length)
      archive_push(key);
  })
}
/**
 * This function receives a message and store it in a hashmap that will be pushed to the github archive
 * @param {object} msg the message sent by slapp that is meant to be archived
 */
function receive(msg){
  if(isArchiving){
    slapp.client.channels.info({token:msg.meta.bot_token,channel:msg.body.event.channel}, (err, resultChannel) => {
      slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.event.user}, (uerr, resultUser) => {
        // var hash = msgMap.hash(resultChannel.channel.name);
  			// if ( ! (hash in msgMap._data) ) {
        //   var timeStamp = new Date(msg.body.event.ts * 1000)
        //   var obj = {user:resultUser.user.name,ts:timeStamp,text:msg.body.event.text};
        //   var array = [obj];
        //   msgMap.set(resultChannel.channel.name,array)
        //   msgMapLength++;
        // }
        // else{
        //   var array = msgMap.get(resultChannel.channel.name);
        //   var timeStamp = new Date(msg.body.event.ts * 1000)
        //   var obj = {user:resultUser.user.name,ts:timeStamp,text:msg.body.event.text};
        //   array.push(obj)
        //   msgMap.set(resultChannel.channel.name,array)
        //   msgMapLength++;
        //   if(array.length == ARCHIVE_BUFFER_MAX_LENGTH)
        //     archive_push(resultChannel.channel.name);
        // }
        var timeStamp = new Date(msg.body.event.ts * 1000)
        var obj = {user:resultUser.user.name,
                    ts:timeStamp,
                    text:msg.body.event.text,
                    channel:resultChannel.channel.name};
        buffer.push([obj]);
        archive_push();
      });
    });
  }
}
// Sets the handler for the slash command
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

function start(){
  isArchiving=true;
}
/**
 * This function starts the message archiving if a github token is specified
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
 * This function pushes the message from the buffer to github
 */
function archive_push(){
  _('ARCHIVE PUSH buffer:');
  _(buffer);
  // var values = msgMap.get(channel).slice();
  // var newArr = [];
  // msgMap.set(channel,newArr);
  // var channelName = channel;
  var channelPageName = buffer[0].channel + '.md';
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
      editPage(buffer[0]);
    else {
      createPage(buffer[0]);
    }
  });
}
/**
 * This function edits the github page specified by pageName adding values to it
 * @param {string} obj the data to push
 */
function editPage(obj){

  var filePath = "https://raw.githubusercontent.com/NeuroTechX/ntx_slack_archive/master/"+obj.channel+'.md';
  var propertiesObject = {access_token:github.getToken()};
	request.get({url:filePath, qs:propertiesObject}, function (fileerror, fileresponse, fileBody) {
  	if (!fileerror && fileresponse.statusCode == 200) {

      var quotedText = obj.text.replace(/([\n\r])/g, '\n\n> $1');
      fileBody+= ""+formatDate(obj.ts)+"\n\n **"+ obj.user +"**" + " :\n\n >" + quotedText + "\n\n";

			//fs.writeFile("slack-links.md", fileBody, {encoding: 'base64'}, function(err){console.log("error encoding the file to b64")});
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');
			var blobPath = "https://api.github.com/repos/NeuroTechX/ntx_slack_archive/contents/"+obj.channel+'.md';
      var options = {
        url: blobPath,
        headers: {
          'User-Agent': 'Edubot-GitHub-App'
        },
        qs:propertiesObject
      };
			request.get(options, function (bloberror, blobresponse, blobBody) {
	    	if (!bloberror && blobresponse.statusCode == 200) {
          var shaStr = JSON.parse(blobBody).sha;
          //("Sha str")
					github.get().repos.updateFile({
						owner:"NeuroTechX",
						repo:"ntx_slack_archive",
						path:obj.channel+'.md',
						message:"Edubot Push",
						content:b64content,
						sha: shaStr
					});
				}
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
      });
}
module.exports = {
  receive:receive,
  handle_restart:handle_restart,
  start:start
}
