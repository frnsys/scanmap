import map from './map';
import markers from './markers';
import form from './control/form';
import { api } from './util';
import { showLegend } from './labels';
import { Feed, fetchPinned } from './feed';

function setupApp(onSetup) {
  // If the user is authenticated,
  // show a preview marker where clicked
  map.addClickListener('preview', (coord) => {
    if (api.authKey) {
      document.getElementById(
        'coordinates'
      ).value = `${coord.lat},${coord.lng}`;
      form.previewCoords([coord.lng, coord.lat]);
    }
  });

  // Set up log feeds
  let eventFeed = new Feed('event');
  let staticFeed = new Feed('static');

  // Setup realtime event streams
  let logSource;
  function initEventSource() {
    logSource = new EventSource(SSE_URL);
    logSource.onmessage = function(ev) {
      // For now just reloading logs,
      // for compatibility with how the editing system works.
      eventFeed.update(true);
      staticFeed.update(toggleEl.checked);
      fetchPinned();

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
      eventFeed.update(true);
      staticFeed.update(toggleEl.checked);
      // map.enableDrawing();
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
    api.get('/version', (json) => {
      if (VERSION != json.version) {
        console.log('New version detected, reloading...');
        location.reload();
      }
    });
  }, 5*60*1000);

  // Initial load of data
  eventFeed.update(true);
  fetchPinned();
  showLegend();

  // Periodically fade markers based on age
  setInterval(() => {
    markers.fade('event');
  }, 5000);
  onSetup(map);

  // Toggle showing of static logs (i.e. points of interest)
  const toggleEl = document.getElementById('static-toggle-input');
  toggleEl.addEventListener('change', (ev) => {
    if (ev.target.checked) {
      staticFeed.update(true);
    } else {
      staticFeed.reset();
    }
  });
}

export default setupApp;
