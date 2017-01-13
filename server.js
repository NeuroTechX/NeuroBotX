'use strict'
const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const cron = require('node-cron');
const GitHubApi = require("github");
const request = require('request');
const fs = require('fs')

var github = new GitHubApi({
    // optional
    debug: true,
    protocol: "https",
    host: "api.github.com", // should be api.github.com for GitHub
    pathPrefix: "", // for some GHEs; none for GitHub
    headers: {
        "user-agent": "Edubot-GitHub-App" // GitHub is happy with a unique user agent
    },
    Promise: require('bluebird'),
    followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
    timeout: 5000
});

var HELP_TEXT = `
Hi there! I’m NeuroBotX, your NeuroTechX Slack bot. I currently only have 1 response when you send me a message, so here is everything you need to know about NeuroTechX and this Slack.


If you are looking for help or have a question about NeuroTechX, the quickest way to get an answer is to message one of the directors. @yannick and @sydneyneurotechx are the more active Directors on slack.

Here is a list of all the directors and their usernames:

Executive Director: @yannick
Operations Director: @sydneyneurotechx
Communications Director: @lucia.gallardo
Science Director:@ melanie

If you are looking for online Neurotech  resources, check out NeuroTechEDU

Link: http://www.neurotechedu.com/

If you are looking for a chapter to get connected to, please explore the different Slack public chapter channels. All city chapters channels have a “_” at the beginning of it.

To find a list of cities where we are located in, please visit http://neurotechx.com/ and see if there is a chapter near you!

If you are looking for archived Slack text, go to:

https://github.com/NeuroTechX/ntx_slack_archive
`
var WELCOME_TEXT = `
Welcome to the NeuroTechX Slack! This Slack brings together hundreds of people from across the world to communicate about Neurotechnology. Everyone here is passionate about the domain and is willing to help out.

Here is how you should get started:


The first thing you should do is read our code of conduct. It can be found at: http://ntx-dockit.readthedocs.io/en/latest/Conduct.html

The second thing you should do is go to the #introductions channel in introduce yourself! Everyone here is very friendly!

The third thing you should do is send a message to the directors of NeuroTechX and say hello! Not everyone is active at all times but you should get a response from most of them. Here are their usernames:

Executive Director: @yannick
Operations Director: @sydneyneurotechx
Communications Director: @lucia.gallardo
Science Director:@ melanie


If you are new to the domain of Neurotechnology, we urge you to check out our NeurotechEDU page! There is a list of amazing resources that exist on it that will help you to advance your knowledge in the domain. If you have questions related to the content, feel free to ask them in Slack

Link: http://www.neurotechedu.com/

Since NeurotechX is a bootstrapped non-profit, we are unable to pay for the premium version of Slack and therefore all messages after 10,000 are deleted. We have built a temporary solution by archiving all of the text onto our Github page. You can visit the list of archived text here. We only track public channels.

https://github.com/NeuroTechX/ntx_slack_archive


Finally take a look at the different chapters that exist in NeuroTechX. You may discover that there is a local community for you to get connected to.  All city chapter channels have a “_” at the beginning of it.

To find a list of cities where we are located in, please visit http://neurotechx.com/ and see if there is a chapter near you!
`
var LINKS_REGEX = /(\b(https?|ftp|file|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

	function HashMap(other) {
		this.clear();
		switch (arguments.length) {
			case 0: break;
			case 1: this.copy(other); break;
			default: multi(this, arguments); break;
		}
	}

	var proto = HashMap.prototype = {
		constructor:HashMap,

		get:function(key) {
			var data = this._data[this.hash(key)];
			return data && data[1];
		},

		set:function(key, value) {
			// Store original key as well (for iteration)
			var hash = this.hash(key);
			if ( !(hash in this._data) ) {
				this._count++;
			}
			this._data[hash] = [key, value];
		},

		multi:function() {
			multi(this, arguments);
		},

		copy:function(other) {
			for (var hash in other._data) {
				if ( !(hash in this._data) ) {
					this._count++;
				}
				this._data[hash] = other._data[hash];
			}
		},

		has:function(key) {
			return this.hash(key) in this._data;
		},

		search:function(value) {
			for (var key in this._data) {
				if (this._data[key][1] === value) {
					return this._data[key][0];
				}
			}

			return null;
		},

		remove:function(key) {
			var hash = this.hash(key);
			if ( hash in this._data ) {
				this._count--;
				delete this._data[hash];
			}
		},

		type:function(key) {
			var str = Object.prototype.toString.call(key);
			var type = str.slice(8, -1).toLowerCase();
			// Some browsers yield DOMWindow for null and undefined, works fine on Node
			if (type === 'domwindow' && !key) {
				return key + '';
			}
			return type;
		},

		keys:function() {
			var keys = [];
			this.forEach(function(_, key) { keys.push(key); });
			return keys;
		},

		values:function() {
			var values = [];
			this.forEach(function(value) { values.push(value); });
			return values;
		},

		count:function() {
			return this._count;
		},

		clear:function() {
			// TODO: Would Object.create(null) make any difference
			this._data = {};
			this._count = 0;
		},

		clone:function() {
			return new HashMap(this);
		},

		hash:function(key) {
			switch (this.type(key)) {
				case 'undefined':
				case 'null':
				case 'boolean':
				case 'number':
				case 'regexp':
					return key + '';

				case 'date':
					return '♣' + key.getTime();

				case 'string':
					return '♠' + key;

				case 'array':
					var hashes = [];
					for (var i = 0; i < key.length; i++) {
						hashes[i] = this.hash(key[i]);
					}
					return '♥' + hashes.join('⁞');

				default:
					// TODO: Don't use expandos when Object.defineProperty is not available?
					if (!key.hasOwnProperty('_hmuid_')) {
						key._hmuid_ = ++HashMap.uid;
						hide(key, '_hmuid_');
					}

					return '♦' + key._hmuid_;
			}
		},

		forEach:function(func, ctx) {
			for (var key in this._data) {
				var data = this._data[key];
				func.call(ctx || this, data[1], data[0]);
			}
		}
	};

	HashMap.uid = 0;

	//- Add chaining to all methods that don't return something

	['set','multi','copy','remove','clear','forEach'].forEach(function(method) {
		var fn = proto[method];
		proto[method] = function() {
			fn.apply(this, arguments);
			return this;
		};
	});

	//- Utils

	function multi(map, args) {
		for (var i = 0; i < args.length; i += 2) {
			map.set(args[i], args[i+1]);
		}
	}

	function hide(obj, prop) {
		// Make non iterable if supported
		if (Object.defineProperty) {
			Object.defineProperty(obj, prop, {enumerable:false});
		}
	}

var github_token='';
var stringMap = new HashMap();
var msgMap = new HashMap();
var msgMapLength = 0;
var dictionary = [
  'OpenBCI ',
  'BCI ',
  'EEG ',
  'EMG ',
  'Decoding ',
  'Meetup ',
  'Frequency ',
  'Freq ',
  'Signal ',
  'EMD ',
  'Matlab ',
  'Python ',
  'C++ ',
  'Noise ',
	'Empirical Mode Decomposition '
]

for(var i=0;i<dictionary.length;i++){
  stringMap.set(dictionary[i],0)
}

var subscribedUsers = [];

var archiveBuffer = [];
const ARCHIVE_BUFFER_MAX_LENGTH = 10;
const LINKS_BUFFER_MAX_LENGTH = 10;
// Debug print on console
function _(s){
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
})

var isTrackingStats = false;
var botToken;
var weeklyTask = cron.schedule('30 8 * * Friday', function(){
	if(isTrackingStats){
		for(var i=0;i<subscribedUsers.length;i++){
			var str = 'Weekly Stats :\n';
			stringMap.forEach(function(value, key) {
				str = str + key + ' : ' + value + '\n';
			});
				console.log("token weekly " + botToken);
			slapp.client.im.open({token:botToken,user:subscribedUsers[i]}, (err, data) => {
				if (err) {
					return console.error(err)
				}
				slapp.client.chat.postMessage({token:botToken, channel: data.channel.id, text: str}, (err, data)=>{
					if (err)
						return console.error(err)
				})
			})
		}
	}
});
var isTrackingLinks = false;
var isArchiving = false;
var links = [];
var linksDetector = new RegExp(LINKS_REGEX);
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
function links_start(msg){
  if(github_token !=''){
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
function links_stop(msg){
	if(isTrackingLinks){
		isTrackingLinks=false;
		msg.respond("Links tracking stopped.");
	}
	else {
		msg.respond("Links tracking already stopped.");
	}
}
function links_refresh(msg){
	links = [];
	msg.respond("Stored links deleted.");
}
function links_push(){
	var filePath = "https://raw.githubusercontent.com/NeuroTechX/ntx_slack_resources/master/_pages/slack-links.md";
	request.get(filePath, function (fileerror, fileresponse, fileBody) {
  	if (!fileerror && fileresponse.statusCode == 200) {
			fileBody+="<ul>";
			for(var i=0;i<links.length;i++){
				fileBody+="<li>" + links[i] + "</li>";
			}
			fileBody+="</ul>";
			//fs.writeFile("slack-links.md", fileBody, {encoding: 'base64'}, function(err){console.log("error encoding the file to b64")});
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');
			github.authenticate({
				type: "token",
				token: github_token
			});
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
					github.repos.updateFile({
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
//*********************************************
// Setup different handlers for messages
//*********************************************

// response to the user typing "help"
slapp.message('help', ['mention', 'direct_message'], (msg) => {
  msg.say(HELP_TEXT)
})

slapp.event('team_join', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user.id }, (err, data) => {
    if (err) {
      return console.error(err)
    }
    msg.say({ channel: data.channel.id, text: WELCOME_TEXT })
    })
})

slapp.message('(.*)', 'ambient', (msg) => {
	if(isTrackingStats){
    var lowerCaseText =  msg.body.event.text.toLowerCase();
		stringMap.forEach(function(value, key) {
			var occ = lowerCaseText.split(key.toLowerCase()).length - 1;
			stringMap.set(key,stringMap.get(key)+occ);
		})
	}
	if(isTrackingLinks)
		if(linksDetector.test(msg.body.event.text)){
			links[links.length]=msg.body.event.text;
      if(links.length == LINKS_BUFFER_MAX_LENGTH){
        links_push();
      }
    }

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
        // if(msgMapLength == ARCHIVE_BUFFER_MAX_LENGTH){
        //     archive_push();
        //     _("Puching archive");
        // }
      });
    });
  }
})

slapp.command('/stats','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      var strtokens = text.split(" ");
      var cmd = strtokens[0];
      var val = '';
      if(strtokens.length>1){
        for(var i=1;i<strtokens.length;i++)
          val += strtokens[i]+' ';
      }
      else {
        val = strtokens[0]+' ';
      }
      if(!text)
        msg.respond("Options for /stats: \n" +
                "\`print\` prints the current statistics.\n" +
                "\`add [Keyword]\` adds the keyword to the tracked keywords list.\n" +
                "\`delete [Keyword]\` deletes the keyword to the tracked keywords list.\n" +
                "\`start\` starts statistics tracking.(Github token must be initialized first using /github)\n" +
                "\`stop\` stops statistics tracking.\n" +
                "\`subscribe\` subscribe to the weekly statistics message.\n" +
                "\`unsubscribe\` unsubscribe from the weekly statistics message.\n"
              );
      else if(cmd == 'print')
        stats_print(msg);
      else if(cmd == 'add')
        stats_add(msg,val);
      else if(cmd == 'delete')
        stats_delete(msg,val);
      else if(cmd == 'refresh')
        stats_refresh(msg);
      else if(cmd == 'start')
        stats_start(msg);
      else if(cmd == 'stop')
        stats_stop(msg);
      else if(cmd == 'subscribe')
        stats_subscribe(msg);
      else if(cmd == 'unsubscribe')
        stats_unsubscribe(msg)
      else
        msg.respond("Please use /stats to print the available options.");
    }
    else {
      msg.respond("Sorry, you're not an admin.");
    }
  })
})
slapp.command('/archivetogit','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      if(!text)
        msg.respond("Options for /archivetogit: \n" +
                "\`start\` starts the archiving to git. (Github token must be initialized first using /github)\n" +
                "\`stop\` stops the archiving to git.\n"
              );
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
slapp.command('/github','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      github_token = text;
      github.authenticate({
        type: "token",
        token: github_token
      });
      msg.respond("Github Token initialized.");
    }
    else {
      msg.respond("Sorry, you're not an admin.");
    }
  })
})
function archive_start(msg){
  if(github_token!=''){
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

  // var keys = msgMap.keys().slice();
  //var values = msgMap.values().slice()[0];
  var values = msgMap.get(channel).slice();
  var newArr = [];
  msgMap.set(channel,newArr);
  // msgMap.clear();
  // #### CLEAR ARRAY
  // msgMapLength=0;
  _("Number of pages ");
  // _(keys.length);
  //for(var i=0;i<keys.length;i++){
    var channelName = channel;
    var channelPageName = channelName + '.md';

    github.repos.getContent({
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
  //}
// Find channel name
// List pages in github
// If channel found Edit page
// if channel not found create page
}
function listPageGithubArchive(){

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
			//fileBody+="</ul>";
			//fs.writeFile("slack-links.md", fileBody, {encoding: 'base64'}, function(err){console.log("error encoding the file to b64")});
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
					github.repos.updateFile({
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
    _("creating page with values ");
    _(values);
      var pn = pageName;
      var strtkns = pn.split(".");
      var fileBody = "######"+strtkns[0]+"\n\n";
      for(var i=0;i<values.length;i++){
        var quotedText = values[i].text.replace(/([\n\r])/g, '\n\n> $1');
				fileBody+= ""+formatDate(values[i].ts)+"\n\n **"+ values[i].user +"**" + " :\n\n >" + quotedText + "\n\n";
			}
      //fs.writeFile("slack-links.md", fileBody, {encoding: 'base64'}, function(err){console.log("error encoding the file to b64")});
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');

      github.repos.createFile({
        owner:"NeuroTechX",
        repo:"ntx_slack_archive",
        path:pageName,
        message:"Edubot Push",
        content:b64content
      });
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

function stats_print(msg){
  if(isTrackingStats){
    var str = '';
    stringMap.forEach(function(value, key) {
      str = str + key + ': ' + value + '\n';
    });
    msg.respond(str)
  }
  else {
    msg.respond("No tracking in progress");
  }
}
function stats_subscribe(msg){

	var isSub = false;
	for(var i=0;i<subscribedUsers.length;i++){
		if(subscribedUsers[i]==msg.body.user_id){
			isSub =true;
			break;
		}
	}
	if(!isSub){
		subscribedUsers[subscribedUsers.length]=msg.body.user_id;
		msg.respond("You successfully subscribed to the weekly statistics.");
	}
	else {
		msg.respond("You're already subscribed to the weekly statistics.");
	}

}

function stats_unsubscribe(msg){

	var wasSub = false;
	for(var i=0;i<subscribedUsers.length;i++){
		if(subscribedUsers[i]==msg.body.user_id){
			wasSub =true;
			subscribedUsers = subscribedUsers.splice(i, 1);
			break;
		}
	}
	if(!wasSub){
		msg.respond("You're not subscribed to the weekly statistics.");
	}
	else {
		msg.respond("You successfully unsubscribed from the weekly statistics");
	}


}
function stats_add(msg,value) {
		var hash = stringMap.hash(value);
		if ( ! (hash in stringMap._data) ) {
			stringMap.set(value,0);
		}
    msg.respond("Keyword added to the tracking list.");
}
function stats_delete(msg,value) {

	var hash = stringMap.hash(value);
	if ( (hash in stringMap._data) ) {
		stringMap.remove(value);
	}
  msg.respond("Keyword deleted from the tracking list.");
}
function stats_refresh(msg) {
	stringMap.clear();
}
function stats_start(msg) {
  if(github_token!=''){
  	botToken=msg.meta.bot_token;
  	if(isTrackingStats){
  		msg.respond("Statistics tracking already in progress.");
  	}
  	else {
  		isTrackingStats = true;
  		//weeklyTask.start();
  		msg.respond("Statistics tracking started.");
  	}
  }
  else {
    msg.respond("Please set the github token first using /github [Token].");
  }
}
function stats_stop(msg) {

	if(isTrackingStats){
		isTrackingStats=false;
		//weeklyTask.stop();
		msg.respond("Statistics tracking stopped.");
	}
	else {
		msg.respond("Statistics tracking is already stopped.");
	}

}

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
  msg.say(HELP_TEXT);
})
slapp.message('.*', 'direct_mention', (msg) => {
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user }, (err, data) => {
    if (err) {
      return console.error(err)
    }
    msg.say({ channel: data.channel.id, text: HELP_TEXT })
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
