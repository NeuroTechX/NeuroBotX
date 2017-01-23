const cron = require('node-cron');
const HashMap = require('hashmap');
const slapp = require('./slapp.js').get;

var stringMap = new HashMap();
var subscribedUsers = [];
var isTrackingStats = false;

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
  'noise',
	'empirical mode decomposition'
]

for(var i=0;i<dictionary.length;i++){
  stringMap.set(dictionary[i].toLowerCase(),0)
}

var weeklyTask = cron.schedule('30 8 * * Friday', function(){
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
});
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
                "\`add [Keyword]\` adds the keyword to the tracked keywords list.\n" +
                "\`delete [Keyword]\` deletes the keyword from the tracked keywords list.\n" +
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
		var hash = stringMap.hash(value.toLowerCase());
		if ( ! (hash in stringMap._data) ) {
			stringMap.set(value.toLowerCase(),0);
      msg.respond("Keyword added to the tracking list.");
		}
    else{
      msg.respond("Keyword already on the tracking list.");
    }
}
function stats_delete(msg,value) {

	var hash = stringMap.hash(value.toLowerCase());
	if ( (hash in stringMap._data) ) {
		stringMap.remove(value.toLowerCase());
    msg.respond("Keyword deleted from the tracking list.");
	}
  else {
    msg.respond("Keyword not on the tracking list.");
  }

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
  		msg.respond("Statistics tracking started.");
  	}
  }
  else {
    msg.respond("Please set the github token first using /github [Token].");
  }
}
function receive(){
  if(isTrackingStats){
    var lowerCaseText =  msg.body.event.text.toLowerCase();
    stringMap.forEach(function(value, key) {
      var occ = lowerCaseText.split(key).length - 1;
      console.log("Occurences of " + key + " " +occ);
      stringMap.set(key,stringMap.get(key)+occ);
    })
  }
}
function stats_stop(msg) {
	if(isTrackingStats){
		isTrackingStats=false;
		msg.respond("Statistics tracking stopped.");
	}
	else {
		msg.respond("Statistics tracking is already stopped.");
	}
}
