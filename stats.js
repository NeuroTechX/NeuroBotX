const HashMap = require('hashmap');
const slapp = require('./slapp.js').get();
const github = require('./github.js');
const request = require('request');
var kv = require('beepboop-persist')();

const GA_TRACKING_ID = "UA-92703237-1";

var stringMap = new HashMap();
var subscribedUsers = [];
var isTrackingStats = false;
function _(obj){
  var str = JSON.stringify(obj, null, 4); // (Optional) beautiful indented output.
  console.log(str);
}
var dictionary = [
  'openbci',
  'bci',
  'eeg',
  'emg',
  'decoding',
  'meetup',
  'frequency',
  'freq',
  'signal',
  'emd',
  'matlab',
  'python',
  'c++',
  'noise'
]

for(var i=0;i<dictionary.length;i++){
  stringMap.set(dictionary[i].toLowerCase(),0)
}
function handle_restart(){
  saveStats();
}
function saveStats(){
  var obj = {};
  stringMap.forEach(function(value, key) {
    obj[key] = value;
  });
  _("Saving stats to the kv :");
  _(obj);
  kv.set("stats",obj,function(err){
    if(err){
      _("error setting stats");
      _(err);
      }
  });
}
function loadStats(){
  stringMap.clear();
  kv.get("stats",function(err,result){
    if(err)
      _("error while loading stats from the kv");
    else{
      if(!err && result){
        _("Stats found on the kv:")
        _(result);
        for(index in result) {
          stringMap.set(index,result[index]);
        }
      }
    }
    var keys = stringMap.keys();
    if(!keys.length){
      for(var i=0;i<dictionary.length;i++){
        stringMap.set(dictionary[i].toLowerCase(),0)
      }
    }
  });
}
/**
 * function that handles the cron event and sends the weekly stats for registered users
 */
function cronPoke(){
	if(isTrackingStats){
		for(var i=0;i<subscribedUsers.length;i++){
			var str = 'Weekly Stats :\n';
			stringMap.forEach(function(value, key) {
				str = str + key + ' : ' + value + '\n';
			});
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
}
slapp.command('/stats','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      var strtokens = text.split(" ");
      var cmd = strtokens[0];
      var val = '';
      if(strtokens.length>1){
        for(var i=1;i<strtokens.length;i++){
          if(i!=1)
            val +=' ';
          val += strtokens[i];
        }
      }
      if(!text)
        msg.respond("Options for /stats: \n" +
                "\`print\` prints the current statistics.\n" +
                "\`reset\` resets the current statistics.\n" +
                "\`add [Keyword]\` adds the keyword to the tracked keywords list.\n" +
                "\`delete [Keyword]\` deletes the keyword from the tracked keywords list.\n" +
                "\`start\` starts statistics tracking.(Github token must be initialized first using /github)\n" +
                "\`stop\` stops statistics tracking.\n" +
                "\`subscribe\` subscribe to the weekly statistics message.\n" +
                "\`unsubscribe\` unsubscribe from the weekly statistics message.\n"
              );
      else if(cmd == 'print')
        stats_print(msg);
      else if(cmd == 'reset')
        stats_reset(msg);
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
/**
 * This function prints the currents stats
 * @param {object} msg the command message sent by slapp to print
 */
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
/**
 * This function resets the currents stats
 * @param {object} msg the command message sent by slapp to reset
 */
function stats_reset(msg){
  stringMap.clear();
  kv.del('stats',function(err){
    if(err)
      console.log("error while deleting stats from kv"+err);
  });
  msg.respond("Stats reseted");
}
/**
 * This function subscribes the user the weekly stats
 * @param {object} msg the command message sent by slapp to subscribe
 */
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
/**
 * This function unsubscribes the user the weekly stats
 * @param {object} msg the command message sent by slapp to unsubscribe
 */
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
/**
 * This function add a keyword to the tracked keywords list
 * @param {object} msg the command message sent by slapp to add the keyword
 * @param {string} value the keyword to add
 */
function stats_add(msg,value) {
		var hash = stringMap.hash(value.toLowerCase());
		if ( ! (hash in stringMap._data) ) {
			stringMap.set(value.toLowerCase(),0);
      msg.respond("Keyword added to the tracking list.");
		}
    else{
      msg.respond("Keyword already on the tracking list.");
    }
}
/**
 * This function deletes a keyword to the tracked keywords list
 * @param {object} msg the command message sent by slapp to delete the keyword
 * @param {string} value the keyword to delete
 */
function stats_delete(msg,value) {

	var hash = stringMap.hash(value.toLowerCase());
	if ( (hash in stringMap._data) ) {
		stringMap.remove(value.toLowerCase());
    msg.respond("Keyword deleted from the tracking list.");
	}
  else {
    msg.respond("Keyword not on the tracking list.");
  }

}/**
 * This function clears the stats
 * @param {object} msg the command message sent by slapp to delete the keyword
 */
function stats_refresh(msg) {
	stringMap.clear();
}
function start(){
  isTrackingStats=true;
}
/**
 * This function starts the stats tracking
 * @param {object} msg the message received from slapp following the user command
 */
function stats_start(msg) {
  if(github.getToken()!=''){
  	botToken=msg.meta.bot_token;
  	if(isTrackingStats){
  		msg.respond("Statistics tracking already in progress.");
  	}
  	else {
  		isTrackingStats = true;
  		msg.respond("Statistics tracking started.");
  	}
  }
  else {
    msg.respond("Please set the github token first using /github [Token].");
  }
}
/**
 * This function receives a slapp message and tracks the keywords contained in it
 * @param {object} msg the message sent by slapp that is meant to be archived
 */
function receive(msg){
  if(isTrackingStats){
    var atLeastOneKeywordFound = false;
    var lowerCaseText =  msg.body.event.text.toLowerCase();
    stringMap.forEach(function(value, key) {
      var occ = lowerCaseText.split(key).length - 1;
      if(occ>=1){
        atLeastOneKeywordFound=true;
        trackEvent(key,parseInt(stringMap.get(key)+occ), function(){});
      }
      stringMap.set(key,stringMap.get(key)+occ);
    })
    if(atLeastOneKeywordFound){
      saveStats();
    }
  }
}
/**
 * This function stops the stats tracking
 * @param {object} msg the message received from slapp following the user command
 */
function stats_stop(msg) {
	if(isTrackingStats){
		isTrackingStats=false;
		msg.respond("Statistics tracking stopped.");
	}
	else {
		msg.respond("Statistics tracking is already stopped.");
	}
}

function trackEvent (keyword,value, cb) {
  const data = {
    v: '1', // API Version.
    tid: GA_TRACKING_ID, // Tracking ID / Property ID.
    // Anonymous Client Identifier. Ideally, this should be a UUID that
    // is associated with particular user, device, or browser instance.
    cid: '607',
    t: 'event', // Event hit type.
    ec: "Slack", // Event category.
    ea: "Stat", // Event action.
    el: keyword, // Event label.
    ev: value // Event value.
  };

  request.post(
    'http://www.google-analytics.com/collect',
    {
      form: data
    },
    (err, response) => {
      if (err) {
        cb(err);
        console.log("Error sending analytic " + err);
        return;
      }
      if (response.statusCode !== 200) {
        cb(new Error('Tracking failed'));
        console.log("Analytic tracking failed ");
        return;
      }
      console.log("Analytic response");
      _(response)
      cb();
    }
  );
}
module.exports = {
  receive:receive,
  cronPoke:cronPoke,
  saveStats:saveStats,
  loadStats:loadStats,
  handle_restart:handle_restart,
  start:start
}
