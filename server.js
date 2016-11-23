'use strict'
const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const Hashmap = require('hashmap');

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
  'Noise'
]

for(i=0;i<dictionary.length;i++){
  stringMap.set(dictionary[i],0)
}
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
    msg.say({ channel: data.channel.id, text: 'Please visite www.neurotechedu.com' })
    })

})
slapp.event('message.channels',(msg) => {
  var strings = api.split(' ');
  for(i=0;i<strings.length;i++){
    if(stringMap.contains(strings[i])){
      stringMap.set(strings[i],stringMap.get(strings[i])+1);
    }
  }
})
slapp.command('/stats','(.*)', (msg, text, api)  => {
  var str = '';
  stringMap.forEach(function(value, key) {
    str = text + key + ' : ' + value + '\n';
  });
  msg.respond(str)
})

// slapp.command('/wordpress', 'auth (.*)', (msg, text, api) => {
//   // if "/wordpress auth key secret"
//   // text = auth key secret
//   // api = key secret
//   var strings = api.split(' ');
//   usr = strings[0];
//   pswd  = strings[1];
//   console.log("user " + usr + " pswd " + pswd);
// })
// slapp.command('/send', 'send (.*)', (msg, text, api) => {
//
//   var data = querystring.stringify({
//       'source' : 'John',
//       'content': 'test'
//   });
//   console.log("msg " + msg);
//   console.log("data "+ data);
//   // An object of options to indicate where to post to
//   var post_options = {
//       host: 'www.neurotechedu.com',
//       port: '80',
//       path: '/wp-json/wp/v2/analytic',
//       method: 'POST',
//       headers: {
//           'Authorization':  "Basic " +
//           + (new Buffer(usr + ":" + pswd).toString('base64'))
//       }
//   };
//
//   var post_req = http.request(post_options, function(res) {
//      res.setEncoding('utf8');
//      res.on('data', function (chunk) {
//          console.log('Response: ' + chunk);
//      });
//  });
//  post_req.write(data);
//  post_req.end();
//
// })

// "Conversation" flow that tracks state - kicks off when user says hi, hello or hey
// slapp
//   .message('^(hi|hello|hey)$', ['direct_mention', 'direct_message'], (msg, text) => {
//     msg
//       .say(`${text}, how are you?`)
//       // sends next event from user to this route, passing along state
//       .route('how-are-you', { greeting: text })
//   })
//   .route('how-are-you', (msg, state) => {
//     var text = (msg.body.event && msg.body.event.text) || ''
//
//     // user may not have typed text as their next action, ask again and re-route
//     if (!text) {
//       return msg
//         .say("Whoops, I'm still waiting to hear how you're doing.")
//         .say('How are you?')
//         .route('how-are-you', state)
//     }
//
//     // add their response to state
//     state.status = text
//
//     msg
//       .say(`Ok then. What's your favorite color?`)
//       .route('color', state)
//   })
//   .route('color', (msg, state) => {
//     var text = (msg.body.event && msg.body.event.text) || ''
//
//     // user may not have typed text as their next action, ask again and re-route
//     if (!text) {
//       return msg
//         .say("I'm eagerly awaiting to hear your favorite color.")
//         .route('color', state)
//     }
//
//     // add their response to state
//     state.color = text
//
//     msg
//       .say('Thanks for sharing.')
//       .say(`Here's what you've told me so far: \`\`\`${JSON.stringify(state)}\`\`\``)
//     // At this point, since we don't route anywhere, the "conversation" is over
//   })

// Can use a regex as well
slapp.message(/^(thanks|thank you)/i, ['mention', 'direct_message'], (msg) => {
  // You can provide a list of responses, and a random one will be chosen
  // You can also include slack emoji in your responses
  msg.say([
    "You're welcome :smile:",
    'Anytime :full_moon_with_face:'
  ])
})

// // demonstrate returning an attachment...
// slapp.message('attachment', ['mention', 'direct_message'], (msg) => {
//   msg.say({
//     text: 'Check out this amazing attachment! :confetti_ball: ',
//     attachments: [{
//       text: 'Slapp is a robust open source library that sits on top of the Slack APIs',
//       title: 'Slapp Library - Open Source',
//       image_url: 'https://storage.googleapis.com/beepboophq/_assets/bot-1.22f6fb.png',
//       title_link: 'https://beepboophq.com/',
//       color: '#7CD197'
//     }]
//   })
// })

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

// function sendAnalytics(){
//   var options = {
//     host: url,
//     port: 80,
//     path: '/resource?id=foo&bar=baz',
//     method: 'POST'
//   };
//
//   http.request(options, function(res) {
//     console.log('STATUS: ' + res.statusCode);
//     console.log('HEADERS: ' + JSON.stringify(res.headers));
//     res.setEncoding('utf8');
//     res.on('data', function (chunk) {
//       console.log('BODY: ' + chunk);
//     });
//   }).end();
// }
