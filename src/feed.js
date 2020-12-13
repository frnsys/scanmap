import Log from './log';
import map from './map';
import markers from './markers';
import {api} from './util';

class Feed {
  constructor(logType) {
    this.lastSeen = 0;
    this.logType = logType;
    this.feedEl = document.getElementById(`${logType}-logs`);
  }

  update(showMarkers) {
    api.get(
      `log/${this.logType}`,
      ({ logs }) => {
        this.logs = logs.map((l) => (new Log({
          _id: l.timestamp.toString(),
          id: l.timestamp.toString().replace('.', '-'),
          dt: new Date(l.timestamp*1000).toLocaleString('en-US'),

          // Reverse because mapbox does (lng, lat)
          coords: l.data.coordinates.split(';').map((pt) => pt.split(',').map((c) => parseFloat(c)).reverse()),
          ...l.data, ...l
        })));
        this.render(showMarkers);
      }).catch((err) => {
        console.log(err);
      });
  }

  render(showMarkers) {
    // Track what log entries are present, so we know what to delete
    let curLogs = [...this.feedEl.querySelectorAll('.logitem')].reduce((acc, el) => {
      acc[el.id] = el.dataset.markerKey;
      return acc;
    }, {});

    this.feedEl.querySelector('.no-log').style.display = this.logs.length == 0 ? 'block' : 'none';
    this.logs.forEach((log) => {
      // Remove from list of logs to delete
      delete curLogs[log.id];

      let createdNewEl = log.render();
      if (log.timestamp > this.lastSeen && createdNewEl) {
        this.feedEl.prepend(log.el);
        this.lastSeen = log.timestamp;
      }
    });

    // Remove entries for remaining logs
    Object.keys(curLogs).forEach((id) => {
      [id, `popup-${id}`].forEach((elId) => {
        let el = document.getElementById(elId);
        if (el) {
          el.parentNode.removeChild(el);
        }
      });
      markers.removeLog({
        id: id,
        type: this.logType,
        markerKey: curLogs[id]
      });
    });

    if (!showMarkers) {
      this.hide();
    } else {
      markers.show(this.logType);
    }
  }

  hide() {
    markers.hide(this.logType);
  }
}


// Load pinned message
function fetchPinned() {
  api.get('log/pinned', ({ logs }) => {
    if (logs.length > 0) {
      let el = document.getElementById('pinned-log');
      let textEl = document.getElementById('pinned-log-text');
      let log = logs[0];
      let ts = el.dataset.timestamp;
      if (log.data.text.length > 0 && ts != log.timestamp) {
        el.style.display = 'block';
        el.dataset.timestamp = log.timestamp;
      } else {
        el.style.display = 'none';
      }
      textEl.innerText = log.data.text;
    }
  });
}

export {Feed, fetchPinned};
