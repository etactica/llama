var botkit = require('botkit');
var le = require('./logentries');
var hg = require('./graphite');
var http = require('http');

var controller = botkit.slackbot();
var bot = controller.spawn({
  token: 'xoxb-51529564311-moPt8fpshj0m5oP1WRT30tYt'
});

bot.startRTM(function(err, bot, payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  } else {
    console.log('connected');
  }
});

var waitMessages = ['Sæki gögn, hinkraðu aðeins ...',
  'Augnablik, tékka á stöðunni ...', 'Andarblik ...', 'Sæki ...',
  'Sæki gögnin, róa sig ...', 'Hinkraðu ...'];

var ackMessage = function ackMessage() {
  return waitMessages[Math.floor(Math.random() * waitMessages.length)];
}

controller.hears(["boo"], "direct_message,direct_mention,mention", function(bot, message) {
  bot.reply(message,'You just boo\'d llama!');

  bot.startConversation(message, function(err, convo) {

    convo.ask('Ertu viss? (y/n)', [
      {
        pattern: bot.utterances.yes,
        callback: function(response, convo) {
          convo.say('OK, BOO!');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function(response, convo) {
          convo.say('Hohohoh');
          convo.next();
        }
      }
    ]);
  });
});

controller.hears(["help", "-h", "-help", "hjálp"], "direct_message,direct_mention,mention", function(bot, message) {
  var help = "Hjálpin. \nboo: samtal\nhæ/halló: kveðja\ndm me: sendi dm\ntakk: já takk\nlogs/logga/loggana/loggar: samantekt logga/nstaðan: loggar í línu\nsvartímar/svartíma/graf/wtfgraf/gröf/: graf/gröf frá hosted graphite\nxkcd: osom";
  bot.reply(message, help);

});

// controller.hears(["keyword","^pattern$"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
controller.hears(["keyword","^hallo"],["direct_message","direct_mention","mention","ambient"],function(bot,message) {
  // do something to respond to message
  // all of the fields available in a normal Slack message object are available
  // https://api.slack.com/events/message
  bot.reply(message,'You called llama, dog!');
});

controller.hears(['attach'],['direct_message','direct_mention'],function(bot,message) {
  var attachments = [];
  var attachment = {
    title: 'This is an attachment',
    color: '#FFCC99',
    fields: [],
  };

  attachment.fields.push({
    label: 'Field',
    value: 'A longish value',
    short: false,
  });

  attachment.fields.push({
    label: 'Field',
    value: 'Value',
    short: true,
  });

  attachment.fields.push({
    label: 'Field',
    value: 'Value',
    short: true,
  });

  attachments.push(attachment);

  bot.reply(message,{
    text: 'See below...',
    attachments: attachments,
  },function(err,resp) {
    console.log(err,resp);
  });
});

controller.hears(['dm me'],['direct_message','direct_mention'],function(bot,message) {
  bot.startConversation(message,function(err,convo) {
    convo.say('Heard ya');
  });

  bot.startPrivateConversation(message,function(err,dm) {
    dm.say('Private reply!');
  });

});

controller.hears(['hæ', 'hi', 'halló'],['direct_message','direct_mention'],function(bot,message) {
  bot.reply(message,':llama: Hæ!');
});

controller.hears(['takk'],['direct_message','direct_mention'],function(bot,message) {
  bot.reply(message,':smiley: :llama:');
});

controller.hears(['staðan'],['direct_message','direct_mention'],function(bot,message) {
  bot.reply(message, ackMessage());
  le.logentries.logsInline().subscribe(
    function(reply) {
      bot.reply(message, reply);
    },
    function(err) {
      console.log(err);
    }
  )
});

var monkey = function(text) {
  var nums = /\d{1,3}/.exec(text);
  var mins = /(min.{0,1}\s|min.{0,1}$|mín.{0,1}\s|mín.{0,1}$|m.{0,1}\s|m.{0,1}$|mínútu.{0,1}\s|mínútu.{0,1}$)/.exec(text);
  var hrs = /(klst.{0,1}|klst.{0,1}$\s|kl.{0,1}\s|kl.{0,1}$|h.{0,1}\s|h.{0,1}$|k.{0,1}\s|k.{0,1}$|hr.{0,1}\s|hr.{0,1}$|tíma|hours|hour|klukkustundir)/.exec(text);
  console.log('found ' + nums);
  console.log('mins  ' + mins);
  console.log('hrs   ' + hrs);
  var m = hrs ? 'hr' : 'min';
  var time = nums ? nums[0] : 20;
  return [time, m];
}

controller.hears(['logs', 'logga', 'loggana', 'loggar'],['direct_message','direct_mention'],function(bot,message) {
  // console.log('skilboð: ' + JSON.stringify(message));
  var m = monkey(message.text);
  console.log(m);
  bot.reply(message, ackMessage());
  le.logentries.logs(m[0], m[1]).subscribe(
    function(reply) {
      bot.reply(message,{
        text: 'Hér er samantekt úr loggunum fyrir API',
        attachments: reply,
      },function(err,resp) {
        if (err) {
          console.log('VILLA');
          console.log(err);
        }
      });
    },
    function(err) {
      console.log(err);
    }
  );
});

controller.hears(['gröf'],['direct_message','direct_mention'],function(bot,message) {
  bot.reply(message, ackMessage());
  hg.graphite.responseTimes().subscribe(
    function(reply) {
      bot.reply(message, reply);
    },
    function(err) {
      console.log(err);
    }
  )
  hg.graphite.wtf().subscribe(
    function(reply) {
      bot.reply(message, reply);
    },
    function(err) {
      console.log(err);
    }
  )
});

controller.hears(['svartímar', 'svartíma', 'graf'],['direct_message','direct_mention'],function(bot,message) {
  bot.reply(message, ackMessage());
  hg.graphite.responseTimes().subscribe(
    function(reply) {
      bot.reply(message, reply);
    },
    function(err) {
      console.log(err);
    }
  )
});

controller.hears(['wtf', 'wtfgraf'],['direct_message','direct_mention'],function(bot,message) {
  bot.reply(message, ackMessage());
  hg.graphite.wtf().subscribe(
    function(reply) {
      bot.reply(message, reply);
    },
    function(err) {
      console.log(err);
    }
  )
});

controller.hears(['xkcd'],['direct_message','direct_mention'],function(bot,message) {
    var options = {
      host: 'www.xkcd.com',
      port: 80,
      path: '/info.0.json'
    }
    var callback = function(response) {
      var str = '';
      response.on('error', function(err) {
        console.log('Error: ', err.message)
        res.status(500).json(err)
      });
      response.on('data', function(chunk) {
        str += chunk
      });
      response.on('end', function() {
        var j = JSON.parse(str);
        var title = j.title;
        var day = j.day;
        var month = j.month;
        var yr = j.year;
        var num = j.num;
        var img = j.img;
        var alt = j.alt;

        bot.reply(message, title);
        bot.reply(message, alt);
        bot.reply(message, img);
      });
    }
    http.get(options, callback);
});

