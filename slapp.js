const Slapp = require('slapp');
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')

var slapp = Slapp({
  // Beep Boop sets the SLACK_VERIFY_TOKEN env var
  verify_token: process.env.SLACK_VERIFY_TOKEN,
  convo_store: ConvoStore(),
  context: Context()
});

function get(){
  return slapp;
}
module.exports = {
  get:get
}
