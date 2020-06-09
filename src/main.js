import Map from './map';
import Form from './form';
import config from '../config';
import setupCams from './cams';
import setupHelicopters from './helis';
import { get } from './util';
import { showLogs, fadeMarkers } from './logs';

function fetchLogs() {
  get(
    'log',
    ({ logs }) => {
      showLogs(logs, map, form);
    },
    form.authKey
  ).catch((err) => {
    console.log(err);
  });
}

let logSource;
function initEventSource() {
  console.log('Initializing event source');
  /* server sent events coooooode */
  logSource = new EventSource(SSE_URL);
  logSource.onmessage = function(ev) {
    // const log = JSON.parse(ev.data);
    // showLogs([log], map, form);

    // For now just reloading logs,
    // for compatibility with how the editing system works.
    // TODO: properly integrate updates
    fetchLogs();
  };
  // Reconnect on error
  logSource.addEventListener('error', (ev) => {
    console.log('Connection error');
    logSource.close();
    initEventSource();
  });
  /* end server sent events coooooode */
}
window.onbeforeunload = () => {
  logSource.close();
}
initEventSource();


mapboxgl.accessToken = config.MAPBOX_TOKEN;
const map = new Map(
  {
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    maxZoom: 18,
    minZoom: 10,
    zoom: MAP_ZOOM,
    center: MAP_CENTER
  },
  (coord) => {
    if (form.authKey) {
      document.getElementById(
        'coordinates'
      ).value = `${coord.lat},${coord.lng}`;
      form.previewCoords([coord.lng, coord.lat]);
    }
  }
);
const form = new Form(map);

// For getting current map zoom/center
window.queryMap = () => {
  console.log(`Zoom:${map.map.getZoom()}`);
  console.log(`Center:${map.map.getCenter()}`);
};

document.getElementById('add').addEventListener('click', () => {
  let authKey = prompt('Key');
  form.activate(authKey, () => {
    // Re-fetch logs on success,
    // to show edit UI if necessary
    fetchLogs();
  });
});
document.getElementById('info-toggle').addEventListener('click', () => {
  let b = document.getElementById('info-body');
  let open = b.style.display != 'none';
  b.style.display = open ? 'none' : 'block';
  document.getElementById('info-toggle').innerText = open ? '▲' : '▼';
});

// Check for updates
setInterval(() => {
  get('/version', (json) => {
    if (VERSION != json.version) {
      console.log('New version detected, reloading...');
      location.reload();
    }
  });
}, 5*60*1000);

fetchLogs();
setInterval(() => {
  fadeMarkers();
}, 5000);
setupCams(map);
setupHelicopters(map);
