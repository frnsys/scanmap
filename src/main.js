import Map from './map';
import Form from './form';
import config from '../config';
import setupCams from './cams';
import mapboxgl from 'mapbox-gl';
import {get} from './util';
import {showLogs, fadeMarkers} from './logs';

const errs = [];
const updateInterval = 5000; // ms

// Check for updates
setInterval(() => {
  get('/version', (json) => {
    if (VERSION != json.version) {
      console.log('New version detected, reloading...');
      location.reload();
    }
  });
}, 5000);

function update() {
  get('log', ({logs}) => {
    showLogs(logs, map, form);
  }, form.authKey).catch((err) => {
    console.log(err);
    errs.push(err);
  });
  fadeMarkers();
}


mapboxgl.accessToken = config.MAPBOX_TOKEN;
const map = new Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  maxZoom: 18,
  minZoom: 10,
  zoom: MAP_ZOOM,
  center: MAP_CENTER
}, (coord) => {
  if (form.authKey) {
    document.getElementById('coordinates').value = `${coord.lat},${coord.lng}`;
    form.previewCoords([coord.lng, coord.lat]);
  }
});
const form = new Form(map);

// For getting current map zoom/center
window.queryMap = () => {
  console.log(`Zoom:${map.map.getZoom()}`);
  console.log(`Center:${map.map.getCenter()}`);
}

document.getElementById('add').addEventListener('click', () => {
  form.activate();
});
document.getElementById('info-toggle').addEventListener('click', () => {
  let b = document.getElementById('info-body');
  let open = b.style.display != 'none';
  b.style.display = open ? 'none' : 'block';
  document.getElementById('info-toggle').innerText = open ? '▲' : '▼';
});

update();
setInterval(update, updateInterval);
setupCams(map);
