var https = require('https');
var rx = require('rxjs/Rx');
var moment = require('moment');

var logentries = (function logentries() {
  var parse = function(line) {
    var index = line.indexOf(' ');
    return {
      level: line.substring(0, index),
      log: line.substring(index + 1)
    };
  }

  var filterOnLogLevel = function(data, level) {
    return data.filter(function(x) {  x.level === level});
  }

  var count = function(logs) {
    return logs
      ? logs.length
      : 0;
  }
  var logsReply = function(data, totalTime, minutesOrHours) {
    // var lvl = {TRACE: 0, DEBUG: 0, INFO: 1, WARN: 3, ERROR: 4, FATAL: 7};
    var trace = count(filterOnLogLevel(data, 'trace'));
    var debug = count(filterOnLogLevel(data, 'debug'));
    var info = count(filterOnLogLevel(data, 'info'));
    var warn = count(filterOnLogLevel(data, 'warn'));
    var error = count(filterOnLogLevel(data, 'error'));
    var fatal = count(filterOnLogLevel(data, 'fatal'));
    return 'það eru ' + data.length.toString() + ' færslur síðustu ' + totalTime + ' ' +
      minutesOrHoursStrings(minutesOrHours) + '. Þar af eru ' + fatal.toString() + ' fatal, ' + error.toString() + ' error, ' + warn.toString() + ' warnings.';
  }

  // the time those minutes ago
  var minutesAgo = function(minutes) {
    return moment().subtract(minutes, 'minutes').toDate();
  }

  // green: nothig to worry about
  // yellow: there were warnings
  // orange: we had errors
  // red: fatals
  var statusIndex = function(warning, err, fatal) {
    return fatal
      ? 'red'
      : err
        ? 'orange'
        : warning
          ? 'yellow'
          : 'green';
  }

  var isTimeInHours = function(minutesOrHours) {
    return minutesOrHours === 'hr';
  }

  var timeInMinutes = function timeInMinutes(totalTime, minutesOrHours){
    return totalTime * isTimeInHours(minutesOrHours)
      ? 60
      : 1;
  }

  var timespans = function(minutesOrHours) {
    return isTimeInHours(minutesOrHours)
      ? ['klukkustund', 'klukkustundir' ]
      : ['mínútu', 'mínútur'];
  }

  var singularOrPlural = function(totalTime) {
    return totalTime === 1 ? 0 : 1;
  }

  var minutesOrHoursStrings = function(totalTime) {
    return timespans(totalTime)[singularOrPlural(totalTime)];
  }

  var staðan = function(data) {
    var color = { 'green': '#33cc33', 'yellow': '#ffff00', orange: '#ff6600', red: '#ff0000' };
    var statusMssg = { 'green': 'Allt í góðu lagi', 'yellow': 'Þú hefur fengið aðvörun!', orange: 'Það eru villur!', red: 'OMG! Allt í fokki!' };
    var warn = filterOnLogLevel(data, 'warn').length;
    var error = filterOnLogLevel(data, 'error').length;
    var fatal = filterOnLogLevel(data, 'fatal').length;
    var status = statusIndex(warn, error, fatal);
    return {
      text: statusMssg[status],
      color: color[status],
      warn: warn,
      error: error,
      fatal: fatal
    }
  }

  var call = function(totalTime, minutesOrHours, callb) {
    var min = timeInMinutes(totalTime, minutesOrHours);
    var start = minutesAgo(min).valueOf();
    var path = '/829f19c8-4ca0-42dc-8f4d-1eeddbee31dc/hosts/Test%20set/API/?start=' + start;
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
          index = remaining.indexOf('\n');
        }
        callb(data)
      })
    }).end();
  }

  return {
    logsInline: function(totalTime, minutesOrHours) {
      return rx.Observable.create(function(observer) {
        call(totalTime, minutesOrHours, function(res) {
          observer.next(logsReply(res, totalTime, minutesOrHours));
          observer.complete();
        })
      });
    },

    logs: function(totalTime, minutesOrHours) {
      return rx.Observable.create(function(observer) {
        call(totalTime, minutesOrHours, function(data) {
          var status = staðan(data);
          var attachments = [];
          var attachment = {
            title: status.text,
            color: status.color,
            fields: [],
          };

          attachment.fields.push({
            label: 'Field',
            value: 'Samtals ' + data.length + ' loggar síðustu ' + totalTime +  ' ' + minutesOrHoursStrings(minutesOrHours),
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
