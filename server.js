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
I will respond to the following messages:
\`help\` - to see this message.
\`stats\` - I will show you what people are talking about the most.
`
var WELCOME_TEXT = `
Welcome to NeuroTechX slack, I'm the EduBotX, I'm here to help you get started.
If you want to learn about neurotechnologies, please visit www.neurotechedu.com
If you want to now about the activities of NeuroTechX, please visit www.neurotechx.com
Please introduce yourself on the #introductions channel.
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

var stringMap = new HashMap();

var dictionary = [
  'OpenBCI',
  'BCI',
  'EEG',
  'EMG',
  'Decoding',
  'Meetup',
  'Frequency',
  'Freq',
  'Signal',
  'EMD',
  'Matlab',
  'Python',
  'C++',
  'Noise',
	'Empirical Mode Decomposition'
]

for(var i=0;i<dictionary.length;i++){
  stringMap.set(dictionary[i],0)
}

var subscribedUsers = [];

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
var weeklyTask = cron.schedule('* * * * *', function(){
	if(isTrackingStats){
		for(var i=0;i<subscribedUsers.length;i++){
			_("iteration i= "+i)
			var str = 'Weekly Statsletter:\n';
			stringMap.forEach(function(value, key) {
				str = str + key + ' : ' + value + '\n';
			});
			// _("token "+process.env.SLACK_VERIFY_TOKEN);
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
var links = [];
var linksDetector = new RegExp(LINKS_REGEX);
slapp.command('/links','(.*)', (msg, text, api)  => {
	if(isTrackingLinks){
		slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
			if( data.user.is_admin){
				if(links.length==0){
					msg.respond("No links posted");
				}
				else{
				  var str = '';
				  for(var i=0;i<links.length;i++) {
						str = str + '###########' + '\n'
				    str = str + links[i] + '\n';
				  }
				  msg.respond(str)
				}
			}
			else {
				msg.say("Sorry, you're not an admin");
			}
		});
	}
	else {
		msg.say("Links tracking not in progress");
	}
})
slapp.command('/links_start','(.*)', (msg, text, api)  => {
		slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
			if( data.user.is_admin){
				if(!isTrackingLinks){
					isTrackingLinks=true;
				msg.say("Links tracking started");
				}
				else {
					msg.say("Links tracking already in progress");
				}
			}
			else {
				msg.say("Sorry, you're not an admin");
			}
		});
})
slapp.command('/links_stop','(.*)', (msg, text, api)  => {
		slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
			if( data.user.is_admin){
				if(isTrackingLinks){
					isTrackingLinks=false;
					msg.say("Links tracking stopped");
				}
				else {
					msg.say("Links tracking already stopped");
				}
			}
			else {
				msg.say("Sorry, you're not an admin");
			}
		});
})
slapp.command('/links_refresh','(.*)', (msg, text, api)  => {
		slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
			if( data.user.is_admin){
				links = [];
				msg.say("Stored links deleted");
			}
			else {
				msg.say("Sorry, you're not an admin");
			}
		});
})
slapp.command('/links_push','(.*)', (msg, text, token)  => {
		slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
			if( data.user.is_admin){
				var filePath = "https://raw.githubusercontent.com/NeuroTechX/ntx_slack_resources/master/_pages/slack-links.md";
				request.get(filePath, function (fileerror, fileresponse, fileBody) {
					_("response for file");
					_(fileresponse);
		    	if (!fileerror && fileresponse.statusCode == 200) {
						fileBody+="<ul>";
						for(var i=0;i<links.length;i++){
							fileBody+="<li>" + links[i] + "</li>";
						}
						fileBody+="</ul>";
						fs.writeFile("slack-links.md", fileBody, {encoding: 'base64'}, function(err){});
						github.authenticate({
							type: "token",
							token: token
						});
						var blobPath = "https://api.github.com/repos/NeuroTechX/ntx_slack_resources/contents/_pages/slack-links.md";
            var options = {
              url: blobPath,
              headers: {
                'User-Agent': 'Edubot-GitHub-App'
              }
            };
						request.get(options, function (bloberror, blobresponse, blobBody) {
							_("response for blob");
							_(blobresponse);
				    	if (!bloberror && blobresponse.statusCode == 200) {
                var shaStr = JSON.parse(blobBody).sha;
                _(shaStr);
								github.repos.updateFile({
									owner:"NeuroTechX",
									repo:"ntx_slack_resources",
									path:"_pages/slack-links.md",
									message:"Edubot Push",
									content:"slack-links.md",
									sha: shaStr
								});
								msg.say("links pushed");
							}
						});
		    	}
				});

			}
			else {
				msg.say("Sorry, you're not an admin");
			}
		});
})
//*********************************************
// Setup different handlers for messages
//*********************************************

// response to the user typing "help"
slapp.message('help', ['mention', 'direct_message'], (msg) => {
  msg.say(HELP_TEXT)
})

slapp.event('team_join', (msg) => {
	_("slapp in team_join");
	_(slapp);
  slapp.client.im.open({ token: msg.meta.bot_token,  user: msg.body.event.user.id }, (err, data) => {
    if (err) {
      return console.error(err)
    }
    msg.say({ channel: data.channel.id, text: WELCOME_TEXT })
    })

})

slapp.message('(.*)', 'ambient', (msg) => {
	if(isTrackingStats){
		stringMap.forEach(function(value, key) {
			var occ = msg.body.event.text.split(key).length - 1;
			stringMap.set(key,stringMap.get(key)+occ);
		})
	}
	if(isTrackingLinks)
		if(linksDetector.test(msg.body.event.text))
			links[links.length]=msg.body.event.text;
})

slapp.command('/stats','(.*)', (msg, text, api)  => {
		_("botToken stats " + msg.meta.bot_token)
	if(isTrackingStats){
		slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
			if( data.user.is_admin){
			  var str = '';
			  stringMap.forEach(function(value, key) {
			    str = str + key + ' : ' + value + '\n';
			  });
			  msg.respond(str)
			}
			else {
				msg.say("Sorry, you're not an admin");
			}
		});
	}
	else {
		msg.say("No tracking in progress");
	}
})
slapp.command('/stats_subscribe','(.*)', (msg, text, api)  => {
	slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
		if( data.user.is_admin ){
			weeklyTask.stop();
			var isSub = false;
			for(var i=0;i<subscribedUsers.length;i++){
				if(subscribedUsers[i]==msg.body.user_id){
					isSub =true;
					break;
				}
			}
			if(!isSub){
				subscribedUsers[subscribedUsers.length]=msg.body.user_id;
				msg.say("you successfully subscribed to the statsletter");
			}
			else {
				msg.say("you're already subscribed to the statsletter");
			}
			weeklyTask.start();
		}
		else {
			msg.say("Sorry, you're not an admin");
		}

	});
})

slapp.command('/stats_unsubscribe','(.*)', (msg, text, api)  => {
	slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
		if( data.user.is_admin ){
			weeklyTask.stop();
			var wasSub = false;
			for(var i=0;i<subscribedUsers.length;i++){
				if(subscribedUsers[i]==msg.body.user_id){
					wasSub =true;
					subscribedUsers = subscribedUsers.splice(i, 1);
					break;
				}
			}
			if(!wasSub){
				msg.say("you're not subscribed to the statsletter");
			}
			else {
				msg.say("you successfully unsubscribed to the statsletter");
			}
			weeklyTask.start();
		}
		else {
			msg.say("Sorry, you're not an admin");
		}
	});
})
slapp.command('/stats_add_keywords','(.*)', (msg, text, params)  => {
	slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
		if( data.user.is_admin){
		var strings = text.split(' ');
		for(var i=0; i<strings.length;i++){
			var hash = stringMap.hash(strings[i]);
			if ( ! (hash in stringMap._data) ) {
				stringMap.set(strings[i],0);
			}
		}
		}
		else {
			msg.say("Sorry, you're not an admin");
		}
	})
})
slapp.command('/stats_delete_keywords','(.*)', (msg, text, params)  => {
	slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
		if( data.user.is_admin){
			var strings = text.split(' ');
			for(var i=0; i<strings.length;i++){
				var hash = stringMap.hash(strings[i]);
				if ( (hash in stringMap._data) ) {
					stringMap.remove(strings[i]);
				}
			}
		}
		else {
			msg.say("Sorry you're not an admin");
		}
	})
})
slapp.command('/stats_refresh','(.*)', (msg, text, params)  => {
	slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
		if( data.user.is_admin){
			stringMap.clear();
		}
		else {
			msg.say("Sorry you're not admin enough to do that");
		}
	})
})
slapp.command('/stats_start','(.*)', (msg, text, params)  => {
	slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
		if( data.user.is_admin){
			botToken=msg.meta.bot_token;
			_("botToken stats start " + msg.meta.bot_token)
			if(isTrackingStats){
				msg.say("Tracking already in progress");
			}
			else {
				isTrackingStats = true;
				weeklyTask.start();
				msg.say("Stats tracking started");
			}
		}
		else{
			msg.say("Sorry, you're not an admin");
		}
	});
})
slapp.command('/stats_stop','(.*)', (msg, text, params)  => {
	slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
		if( data.user.is_admin){
				_("botToken stats stop " + msg.meta.bot_token)
			if(isTrackingStats){
				isTrackingStats=false;
				weeklyTask.stop();
				msg.say("Tracking stopped");
			}
			else {
				msg.say("Tracking is already stopped");
			}
		}
		else{
			msg.say("Sorry, you're not an admin");
		}
	});
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
slapp.message('.*', ['direct_mention', 'direct_message'], (msg) => {
  msg.say(HELP_TEXT);
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
