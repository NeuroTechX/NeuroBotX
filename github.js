const slapp = require('./slapp.js').get();
const GitHubApi = require('github');
const request = require('request');
var kv = require('beepboop-persist')();
var github_token = '';

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

function init(cb){
  kv.list("github_token",function(err,keys){
    console.log("err"+err);
    if(!err &&keys.length)
      kv.get("github_token",function(err,val){
        if(!err && val){
          github_token = val;
          cb(true);
        }
        else {
          cb(false);
        }
      });
  });
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
      kv.set("github_token",github_token,function(err){});
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
/**
 * This function saves the bot state and restarts the beepboophq server.
 */
function restart(){
  var filePath = "https://raw.githubusercontent.com/NeuroTechX/NeuroBotX/master/metamorphosis";
	request.get(filePath, function (fileerror, fileresponse, fileBody) {
  	if (!fileerror && fileresponse.statusCode == 200) {
			fileBody+="0";
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');
			var blobPath = "https://api.github.com/repos/NeuroTechX/NeuroBotX/contents/metamorphosis";
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
						repo:"NeuroBotX",
						path:"Metamorphosis",
						message:"Meta Push",
						content:b64content,
						sha: shaStr
					}, function(err, res) {
            console.log("Metamorphosis!");
              });

				}
			});
  	}
	});
}

module.exports = {
  init:init,
  get:get,
  getToken:getToken,
  restart:restart
}
