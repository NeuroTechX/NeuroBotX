const slapp = require('./slapp.js').get();
const request = require('request');
var kv = require('beepboop-persist')();
const csv=require('csvtojson')

// Simple logging function
function _(obj){
  var str = JSON.stringify(obj, null, 4);
  console.log(str);
}

// Handler of the notify slash command
slapp.command('/notify','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){

      var strtokens = text.split(" ");
      var cmd = strtokens[0];
      if(cmd=='all'){
        var val = text.replace(strtokens[0]+' ','');
        notify_all(msg,val);
      }
      if(cmd=='allbut'){
        var fileURL = strtokens[1];
        var val = text.replace(strtokens[0]+' '+strtokens[1]+' ','');
        notify_allbut(msg,fileURL,val);
      }
    }
    else {
      msg.respond("Sorry, you're not an admin.");
    }
  })
})
function notify_all(msg,val){
  slapp.client.users.list({token:msg.meta.bot_token}, (err, usersData) => {
    if(err)
      msg.respond("Error while listing users.");
    else{
      usersData.members.forEach(function(member){
        if(!member.deleted && !member.is_bot){
          slapp.client.im.open({ token: msg.meta.bot_token,  user: member.id }, (err, imData) => {
            if(err){
              console.log("error while sending IM " +err);
            }else
              msg.say({ channel: imData.channel.id, text:val})
          })
        }
      })
      msg.respond("Notification sent");
    }
  })
}
function notify_allbut(msg,fileURL,val){
  var entries = [];
  csv()
  .fromStream(request.get(fileURL))
  .on('csv',(csvRow)=>{
    entries.push(csvRow[1].replace('@',''));
  })
  .on('done',(error)=>{
    if(error){
      msg.respond("Error while reading the csv.");
    }
    else{
        // Get list all users
        slapp.client.users.list({token:msg.meta.bot_token}, (err, usersData) => {
          if(err)
            msg.respond("Error while listing users.");
          else{
            usersData.members.forEach(function(member){
              if(!entries.includes(member.name)){
                console.log("Member not found")
                _(member);
                if(!member.deleted && !member.is_bot){
                  slapp.client.im.open({ token: msg.meta.bot_token,  user: member.id }, (err, imData) => {
                    if(err){
                      console.log("error while sending IM " +err);
                    }else{
                      msg.say({ channel: imData.channel.id, text:val})
                    }
                  })
                }
              }
            })
            msg.respond("Notification sent");
          }
        })
    }
  })
}
