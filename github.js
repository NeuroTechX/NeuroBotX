const Slapp = require('slapp')
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

module.exports:{
  get:get,
  getToken:getToken
}
