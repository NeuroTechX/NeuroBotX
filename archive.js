const slapp = require('./slapp.js').get();
const HashMap = require('hashmap');
const request = require('request');
const fs = require('fs');

var github = require('./github.js')

var msgMap = new HashMap();
var msgMapLength = 0;
var isArchiving = false;

const ARCHIVE_BUFFER_MAX_LENGTH = 10;

function receive(msg){
  if(isArchiving){
    slapp.client.channels.info({token:msg.meta.bot_token,channel:msg.body.event.channel}, (err, resultChannel) => {
      slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.event.user}, (uerr, resultUser) => {
        var hash = msgMap.hash(resultChannel.channel.name);
  			if ( ! (hash in msgMap._data) ) {
          var timeStamp = new Date(msg.body.event.ts * 1000)
          var obj = {user:resultUser.user.name,ts:timeStamp,text:msg.body.event.text};
          var array = [obj];
          msgMap.set(resultChannel.channel.name,array)
          msgMapLength++;
        }
        else{
          var array = msgMap.get(resultChannel.channel.name);
          var timeStamp = new Date(msg.body.event.ts * 1000)
          var obj = {user:resultUser.user.name,ts:timeStamp,text:msg.body.event.text};
          array.push(obj)
          msgMap.set(resultChannel.channel.name,array)
          msgMapLength++;
          if(array.length == ARCHIVE_BUFFER_MAX_LENGTH)
            archive_push(resultChannel.channel.name);
        }
      });
    });
  }
}

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
function archive_stop(msg){
  if(isArchiving){
		isArchiving=false;
		msg.respond("Archiving stopped.");
	}
	else {
		msg.respond("Archiving is already stoped.");
	}
}
function archive_push(channel){
  var values = msgMap.get(channel).slice();
  var newArr = [];
  msgMap.set(channel,newArr);
  var channelName = channel;
  var channelPageName = channelName + '.md';
  github.get().repos.getContent({
   owner:'NeuroTechX',
   repo:'ntx_slack_archive',
   path:''},function(err,result){
    _("listPages")
    _(result)
    _("path Type")
    _(result[0].type)
    var found = false;
    for (var i = 0; i < result.length && !found; i++) {
      if (result[i].name === channelPageName) {
        found = true;
      }
    }
    if(found)
      editPage(channelPageName,values);
    else {
      createPage(channelPageName,values);
    }
  });
}
function editPage(pageName,values){
  _("Editing page with values ");
  _(values);
  var filePath = "https://raw.githubusercontent.com/NeuroTechX/ntx_slack_archive/master/"+pageName;
	request.get(filePath, function (fileerror, fileresponse, fileBody) {
  	if (!fileerror && fileresponse.statusCode == 200) {
			//fileBody+="<ul>";
			for(var i=0;i<values.length;i++){
        var quotedText = values[i].text.replace(/([\n\r])/g, '\n\n> $1');
        fileBody+= ""+formatDate(values[i].ts)+"\n\n **"+ values[i].user +"**" + " :\n\n >" + quotedText + "\n\n";
			}
			fs.writeFile("slack-links.md", fileBody, {encoding: 'base64'}, function(err){console.log("error encoding the file to b64")});
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');
			var blobPath = "https://api.github.com/repos/NeuroTechX/ntx_slack_archive/contents/"+pageName;
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
						repo:"ntx_slack_archive",
						path:pageName,
						message:"Edubot Push",
						content:b64content,
						sha: shaStr
					});
				}
			});
  	}
	});
}
function formatDate(ts){
  return ts.toLocaleDateString("en-US") + " " + ts.toLocaleTimeString(["en-US"], {hour: '2-digit', minute:'2-digit'});
}
function createPage(pageName,values){
      var pn = pageName;
      var strtkns = pn.split(".");
      var fileBody = "######"+strtkns[0]+"\n\n";
      for(var i=0;i<values.length;i++){
        var quotedText = values[i].text.replace(/([\n\r])/g, '\n\n> $1');
				fileBody+= ""+formatDate(values[i].ts)+"\n\n **"+ values[i].user +"**" + " :\n\n >" + quotedText + "\n\n";
			}
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');

      github.get().repos.createFile({
        owner:"NeuroTechX",
        repo:"ntx_slack_archive",
        path:pageName,
        message:"Edubot Push",
        content:b64content
      });
}
