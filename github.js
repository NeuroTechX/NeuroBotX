const slapp = require('./slapp.js').get();
const GitHubApi = require('github');
const request = require('request');

var kv = require('beepboop-persist')();
var github_token = '';
function _(obj){
  var str = JSON.stringify(obj, null, 4); // (Optional) beautiful indented output.
  console.log(str);
}
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
    if(err)
      console.log("Error while finding github token from kv");
    if(!err &&keys.length)
      kv.get("github_token",function(err,val){
        if(!err && val){
          github_token = val;
          console.log("Github token found and set to " + val);
          cb(true);
        }
        else {
          console.log("Github token not found on the kv");
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
      kv.set("github_token",github_token,function(err){
        if(err)
          console.log("Error while setting github token on the kv");
        else
          console.log("Github token set on the kv. t: " + github_token);
      });
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
  _("github preparing to restart")
  var filePath = "https://raw.githubusercontent.com/NeuroTechX/NeuroBotX/master/metamorphosis.md";
	request.get(filePath, function (fileerror, fileresponse, fileBody) {
  	if (!fileerror && fileresponse.statusCode == 200) {
      _("file body received");
      _(fileBody);
			fileBody+="0";
      var content = Buffer.from(fileBody, 'ascii');
      var b64content = content.toString('base64');
			var blobPath = "https://api.github.com/repos/NeuroTechX/NeuroBotX/contents/metamorphosis.md";
      var options = {
        url: blobPath,
        headers: {
          'User-Agent': 'Edubot-GitHub-App'
        }
      };
			request.get(options, function (bloberror, blobresponse, blobBody) {
        _("blob received");
        _(blobBody);
	    	if (!bloberror && blobresponse.statusCode == 200) {
          var shaStr = JSON.parse(blobBody).sha;
          ("Sha str")
					github.repos.updateFile({
						owner:"NeuroTechX",
						repo:"NeuroBotX",
						path:"metamorphosis.md",
						message:"Meta Push",
						content:b64content,
						sha: shaStr
					}, function(err, res) {
            if(err){
              console.log("error while updating the github file to trigger restart");
              _(err);
              }
            else{
              console.log("Metamorphosis!");
              if(res)
                _(res);
              }
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
