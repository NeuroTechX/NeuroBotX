const slapp = require('./slapp.js').get();
const GitHubApi = require('github');
var github_token = '';
var github_token_channel = 'mhtg6whw9';

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

function init(){
  slapp.client.channels.list({token:msg.meta.bot_token}, (err, data) => {
    var channels = data.channels;
    var found = false;
    var channelID = '';
    for(var i=0;i<channels.length;i++)
      if(channels[i].name ===github_token_channel){
        found=true;
        channelID=channels[i].id;
      }
    if(found){
      slapp.client.channels.history({token:msg.meta.bot_token,channel:channelID}, (err, data) => {
        github_token = data.messages[0].text;
      });
    }
  });
}
function outit(){
  if(github_token){
    slapp.client.channels.list({token:msg.meta.bot_token}, (err, data) => {
      var channels = data.channels;
      var found = false;
      var channelID = '';
      for(var i=0;i<channels.length;i++)
        if(channels[i].name ===github_token_channel){
          found=true;
          channelID=channels[i].id;
        }
      if(found){
        slapp.client.chat.postMessage({token:msg.meta.bot_token,channel:channelID,text:github_token_channel}, (err, data) => {
        });
      }
    });
  }
}

function getToken(){
  return github_token;
}
function get(){
  return github;
}
function setToken(token){
  github_token = token;
  github.authenticate({
    type: "token",
    token: token
  });
}
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
  });
});
function saveToken(){

}
module.exports = {
  init:init,
  get:get,
  getToken:getToken,
  saveToken:saveToken
}
