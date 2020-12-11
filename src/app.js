import Map from './map';
import Form from './control/form';
import config from '../config';
import { get } from './util';
import { showLegend } from './labels';
import { fetchLogs, fetchPinned, fadeMarkers, clearMarkers } from './logs';

function setupApp(onSetup) {
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

    // Map on click handler.
    // If the user is authenticated,
    // show a preview marker where clicked
    (coord) => {
      if (form.authKey) {
        document.getElementById(
          'coordinates'
        ).value = `${coord.lat},${coord.lng}`;
        form.previewCoords([coord.lng, coord.lat]);
      }
    }
  );

  // Set up the form.
  // Doesn't do anything until the user authenticates
  const form = new Form(map);

  // Setup realtime event streams
  let logSource;
  function initEventSource() {
    logSource = new EventSource(SSE_URL);
    logSource.onmessage = function(ev) {
      // For now just reloading logs,
      // for compatibility with how the editing system works.
      fetchLogs('event', map, form, true);
      fetchLogs('static', map, form, toggleEl.checked);

      // Eventually might want to only load the new messages
      // const log = JSON.parse(ev.data);
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

  // For getting current map zoom/center
  window.queryMap = () => {
    console.log(`Zoom:${map.map.getZoom()}`);
    console.log(`Center:${map.map.getCenter()}`);
  };

  // Prompt to add a key and authenticate
  document.getElementById('add').addEventListener('click', () => {
    let authKey = prompt('Key');
    form.authenticate(authKey, () => {
      // Re-fetch logs on success,
      // to show edit UI if necessary
      fetchLogs('event', map, form, true);
      fetchLogs('static', map, form, toggleEl.checked);
      map.enableDrawing();
    });
  });

  // Toggle the info/legend pane
  document.getElementById('info-toggle').addEventListener('click', () => {
    let b = document.getElementById('info-body');
    let open = b.style.display != 'none';
    b.style.display = open ? 'none' : 'block';
    document.getElementById('info-toggle').innerText = open ? '▲' : '▼';
  });

  // Hide pinned message
  document.getElementById('pinned-hide').addEventListener('click', () => {
    document.getElementById('pinned-log').style.display = 'none';
  });

  // Check for updates
  setInterval(() => {
    get('/version', (json) => {
      if (VERSION != json.version) {
        console.log('New version detected, reloading...');
        location.reload();
      }
    });
    fetchPinned();
  }, 5*60*1000);

  // Initial load of data
  fetchLogs('event', map, form, true);
  fetchPinned();
  showLegend();

  // Periodically fade markers based on age
  setInterval(() => {
    fadeMarkers('event');
  }, 5000);
  onSetup(map);

  // Toggle showing of static logs (i.e. points of interest)
  const toggleEl = document.getElementById('static-toggle-input');
  toggleEl.addEventListener('change', (ev) => {
    if (ev.target.checked) {
      fetchLogs('static', map, form, true);
    } else {
      clearMarkers('static');
    }
  });
}

export default setupApp;
