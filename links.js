const slapp = require('./slapp.js').get();
const fs = require('fs')
const request = require('request');
var github = require('./github.js');

// Hyper links detection regex
var LINKS_REGEX = /(\b(https?|ftp|file|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
// Max buffer length before pushing to github
const LINKS_BUFFER_MAX_LENGTH = 10;

var isTrackingLinks = false;
var links = [];
var linksDetector = new RegExp(LINKS_REGEX);

/**
 * This function receives a slapp message and stores the message text in a buffer if it finds an hyper link in it
 * @param {object} msg the message sent by slapp that is meant to be archived
 */
function receive(msg){
  if(isTrackingLinks)
		if(linksDetector.test(msg.body.event.text)){
			links[links.length]=msg.body.event.text;
      if(links.length == LINKS_BUFFER_MAX_LENGTH){
        links_push();
      }
    }
}
slapp.command('/links','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      if(!text)
        msg.respond("Options for /links: \n" +
                "\`print\` prints the current links buffer waiting to be pushed to Wordpress.\n" +
                "\`start\` starts links tracking.\n" +
                "\`stop\` stops links tracking.\n"
              );
      else if(text == 'print')
        links_print(msg);
      else if(text == 'start')
        links_start(msg);
      else if(text == 'refresh')
        links_refresh(msg);
      else if(text == 'stop')
        links_stop(msg);
      else {
        msg.respond("Please use /links to print the available options \n");
      }
    }
    else {
      msg.respond("Sorry, you're not an admin");
    }
  })
})
/**
 * This function prints the messages stored in the buffer and not yet pushed to github
 * @param {object} msg the command message sent by slapp to print
 */
function links_print(msg){
	if(isTrackingLinks){
		if(links.length==0){
			msg.respond("No links posted yet.");
		}
		else{
		  var str = '\`Links waiting to be sent to Wordpress\` \n';
		  for(var i=0;i<links.length;i++) {
				str = str + '\n'
		    str = str + links[i] + '\n';
		  }
		  msg.respond(str)
		}
	}
	else {
		msg.respond("Links tracking is not in progress.");
	}
}
function start(){
  isTrackingLinks=true;
}
/**
 * This function starts the links detection and storage
 * @param {object} msg the message received from slapp following the user command
 */
function links_start(msg){
  if(github.getToken() !=''){
  	if(!isTrackingLinks){
  		isTrackingLinks=true;
  	msg.respond("Links tracking started.");
  	}
  	else {
  		msg.respond("Links tracking is already in progress.");
  	}
  }else{
    msg.respond("Please set the github token first using /github [Token].");
  }

}
/**
 * This function stops the links detection and storage
 * @param {object} msg the message received from slapp following the user command
 */
function links_stop(msg){
	if(isTrackingLinks){
		isTrackingLinks=false;
		msg.respond("Links tracking stopped.");
	}
	else {
		msg.respond("Links tracking already stopped.");
	}
}
/**
 * This function clears the buffer
 * @param {object} msg the message received from slapp following the user command
 */
function links_refresh(msg){
	links = [];
	msg.respond("Stored links deleted.");
}
/**
 * This function that handles the module behaviour when the server is about to restart
 */
function handle_restart(){
  if(links.length){
    links_push();
  }
}
/**
 * This function pushes the content of the buffer to github
 */
function links_push(){
	var filePath = "https://raw.githubusercontent.com/NeuroTechX/ntx_slack_resources/master/_pages/slack-links.md";
	request.get(filePath, function (fileerror, fileresponse, fileBody) {
  	if (!fileerror && fileresponse.statusCode == 200) {
			fileBody+="<ul>";
			for(var i=0;i<links.length;i++){
				fileBody+="<li>" + links[i] + "</li>";
			}
			fileBody+="</ul>";
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');
			var blobPath = "https://api.github.com/repos/NeuroTechX/ntx_slack_resources/contents/_pages/slack-links.md";
      var options = {
        url: blobPath,
        headers: {
          'User-Agent': 'Edubot-GitHub-App'
        }
      };
			request.get(options, function (bloberror, blobresponse, blobBody) {
	    	if (!bloberror && blobresponse.statusCode == 200) {
          var shaStr = JSON.parse(blobBody).sha;
          ("Sha str")
					github.get().repos.updateFile({
						owner:"NeuroTechX",
						repo:"ntx_slack_resources",
						path:"_pages/slack-links.md",
						message:"Edubot Push",
						content:b64content,
						sha: shaStr
					}, function(err, res) {
                links = [];
              });

				}
			});
  	}
	});
}
module.exports = {
  receive:receive,
  handle_restart:handle_restart,
  start:start
}
