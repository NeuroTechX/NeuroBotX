const slapp = require('./slapp.js').get();
const request = require('request');
var kv = require('beepboop-persist')();
const csv=require('csvtojson')

// Simple logging function
function _(obj){
  var str = JSON.stringify(obj, null, 4); // (Optional) beautiful indented output.
  console.log(str);
}

// Handler of the slash command
slapp.command('/notify','(.*)', (msg, text, value)  => {
  slapp.client.users.info({token:msg.meta.bot_token,user:msg.body.user_id}, (err, data) => {
    if( data.user.is_admin){
      _("text")
      _(text)
      var strtokens = text.split(" ");
      var fileURL = strtokens[0];
      _("fileURL")
      _(fileURL)
      var val = text.replace(fileURL+' ','');
      _("val")
      _(val)
      var entries = [];
      csv()
      .fromStream(request.get(fileURL))
      .on('csv',(csvRow)=>{
        entries.push(csvRow[1].replace('@',''));
        console.log(csvRow[1].replace('@',''));
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
                    slapp.client.im.open({ token: msg.meta.bot_token,  user: member.id }, (err, imData) => {
                      if(err){
                        console.log("error while sending im");
                      }else
                        msg.say({ channel: imData.channel.id, text:val})
                    })
                  }
                })
              }

            })

        // Open DM
        // Send message on dm.
        }
      })
    }
    else {
      msg.respond("Sorry, you're not an admin.");
    }
  })
})
