var rx = require('rxjs/Rx');

var graphite = (function graphite() {
  return {
    responseTimes: function responseTimes() {
      var dark = 'https://www.hostedgraphite.com/5d33eb96/c8a6cb91-e744-46d1-997d-24c14e9a1598/grafana/dashboard-solo/db/random-happyness-index/live?panelId=5&fullscreen&from=now-1h&to=now-1m';
      var light = 'https://www.hostedgraphite.com/5d33eb96/c8a6cb91-e744-46d1-997d-24c14e9a1598/grafana/dashboard-solo/db/random-happyness-index/live?panelId=5&fullscreen&from=now-1h&to=now-1m&theme=light';
      return rx.Observable.create(function(observer) {
        observer.next(light);
        observer.complete();
      })
    },

    wtf: function wtf() {
      var path = 'https://www.hostedgraphite.com/5d33eb96/c8a6cb91-e744-46d1-997d-24c14e9a1598/grafana/dashboard-solo/db/random-happyness-index/live?panelId=6&fullscreen&from=now-1h&to=now-1m&theme=light';
      return rx.Observable.create(function(observer) {
        observer.next(path);
        observer.complete();
      })
    }
  }
})();

exports.graphite = graphite;

