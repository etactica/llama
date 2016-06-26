var https = require('https');
var rx = require('rxjs/Rx');
var moment = require('moment');

var logentries = (function logentries() {
  // var path = 'https://pull.logentries.com/829f19c8-4ca0-42dc-8f4d-1eeddbee31dc/hosts/Test%20set/API/?'
  var parse = function(line) {
    var index = line.indexOf(' ');
    return {
      level: line.substring(0, index),
      log: line.substring(index + 1)
    };
  }

  var filt = function(data, level) {
    return data.filter(function(x) {  x.level === level});
  }

  var logsReply = function(data, ts) {
    // var lvl = {TRACE: 0, DEBUG: 0, INFO: 1, WARN: 3, ERROR: 4, FATAL: 7};
    var trace = filt(data, 'trace').length;
    var debug = filt(data, 'debug').length;
    var info = filt(data, 'info').length;
    var warn = filt(data, 'warn').length;
    var error = filt(data, 'error').length;
    var fatal = filt(data, 'fatal').length;
    return 'það eru ' + data.length.toString() + ' færslur síðustu ' + ts + '. Þar af eru ' + fatal.toString() + ' fatal, ' + error.toString() + ' error, ' + warn.toString() + ' warnings.';
  }

  var minutesAgo = function(minutes) {
    return moment().subtract(minutes, 'minutes').toDate();
  }

  var statusIndex = function(warning, err, fatal) {
    return fatal
      ? 'red'
      : err
        ? 'orange'
        : warning
          ? 'yellow'
          : 'green';
  }
  var staðan = function(data) {
    var color = { 'green': '#33cc33', 'yellow': '#ffff00', orange: '#ff6600', red: '#ff0000' };
    var statusMssg = { 'green': 'Allt í góðu lagi', 'yellow': 'Þú hefur fengið aðvörun!', orange: 'Það eru villur!', red: 'OMG! Allt í fokki!' };
    var warn = filt(data, 'warn').length;
    var error = filt(data, 'error').length;
    var fatal = filt(data, 'fatal').length;
    var status = statusIndex(warn, error, fatal);
    return {
      text: statusMssg[status],
      color: color[status],
      warn: warn,
      error: error,
      fatal: fatal
    }
  }

  var call = function(num, time, callb) {
    var min = num;
    if (time === 'hr') {
      min = min * 60;
    }
    var start = minutesAgo(min).valueOf();
    var path = '/829f19c8-4ca0-42dc-8f4d-1eeddbee31dc/hosts/Test%20set/API/?start=' + start;
    var p = path + 'start=' + '1466640000000';
    var options = {
      hostname: 'pull.logentries.com',
      path: path,
      method: 'GET'
    };
    var data = [];
    https.get(options, function(res) {
      res.setEncoding('utf8');
      var body = '';
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function() {
        var remaining = body;
        var index = remaining.indexOf('\n');
        while (index > -1) {
          var line = remaining.substring(0, index);
          data.push(parse(line));
          remaining = remaining.substring(index + 1);
          var index = remaining.indexOf('\n');
        }
        callb(data)
      })
    }).end();
  }

  var monkey = function(num, time) {
    return time;
  }

  return {
    logsInline: function(num, time) {
      return rx.Observable.create(function(observer) {
        call(num, time, function(res) {
          observer.next(logsReply(res, 20));
          observer.complete();
        })
      });
    },

    logs: function(num, time) {
      return rx.Observable.create(function(observer) {
        call(num, time, function(data) {
          var status = staðan(data);
          var attachments = [];
          var attachment = {
            title: status.text,
            color: status.color,
            fields: [],
          };

          attachment.fields.push({
            label: 'Field',
            value: 'Samtals ' + data.length + ' loggar á síðustu ' + num +  ' ' + monkey(num, time),
            short: false,
          });

          attachment.fields.push({
            label: 'Field',
            value: 'Fatals: ' + status.fatal,
            short: false,
          });

          attachment.fields.push({
            label: 'Field',
            value: 'Errors: ' + status.error,
            short: false,
          });

          attachment.fields.push({
            label: 'Field',
            value: 'Warnings: ' + status.warn,
            short: false,
          });
          attachments.push(attachment);
          observer.next(attachments);
          observer.complete();
        })
      });
    }
  }
})();

exports.logentries = logentries;
