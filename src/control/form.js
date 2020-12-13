/*
 * Form for annotators to submit new annotations
 */

import map from '../map';
import {api} from '../util';
import LABELS from '../labels';

const fields = ['text', 'location', 'coordinates', 'label'];
const overlay = document.getElementById('overlay');
const errEl = document.getElementById('error');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('coord-results');
const coordsEl = document.getElementById('coordinates');
const authStatusEl = document.getElementById('auth-status');
const labelsEl = document.getElementById('label');
const imagesEl = document.getElementById('image');

class Form {
  constructor() {
    // The current map marker
    this.marker = null;

    // Type of log the form is for
    // i.e. "event" or "static".
    // This reflects the active tab on the form
    this.logType = 'event';

    this.drawMode = 'point';
  }

  initialize() {
    // Controls for toggling the help/intro overlay
    document.getElementById('ready').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    document.getElementById('show-help').addEventListener('click', () => {
      overlay.style.display = 'block';
    });

    // Control for triggering location search
    // (either enter key or clicking the search icon)
    document.getElementById('location').addEventListener('keydown', (ev) => {
      if (ev.key == 'Enter') {
        this.queryLocation(ev.target.value);
      }
    });
    document.getElementById('location-search').addEventListener('click', () => {
      this.queryLocation(document.getElementById('location').value);
    });

    // Control for submitting the form
    document.getElementById('submit').addEventListener('click', () => this.submit());

    // Control for toggling annotation type (point/area)
    document.querySelectorAll('#coordinates-type li').forEach((li) => {
      let type = li.dataset.type;
      li.addEventListener('click', () => {
        document.querySelector('#coordinates-type li.selected').classList.remove('selected');
        li.classList.add('selected');

        document.querySelector('#coordinates-type--hint .selected').classList.remove('selected');
        document.querySelector(`#coordinates-type--hint [data-type=${type}]`).classList.add('selected');

        this.setDrawMode(type);
      });
    });

    // Set up log type switching (i.e. the event/static tabs)
    this.setLabels(this.logType);
    document.getElementById(`${this.logType}-hint`).style.display = 'block';
    [...document.querySelectorAll('.append-tab')].forEach((tab) => {
      // Control for changing the tab/current log type
      let type = tab.dataset.type;
      tab.addEventListener('click', () => {
        this.logType = type;
        this.setLabels(this.logType);
        document.querySelector('.append-tab.selected').classList.remove('selected');
        tab.classList.add('selected');

        [...document.querySelectorAll('.hint')].forEach((el) => el.style.display = 'none');
        document.getElementById(`${this.logType}-hint`).style.display = 'block';
      });
    });

    // Enable tabs for switching between event/static log types in the log feed
    [...document.querySelectorAll('.log-tab')].forEach((tab) => {
      let type = tab.dataset.type;
      tab.addEventListener('click', () => {
        document.querySelector('.log-tab.selected').classList.remove('selected');
        document.querySelector('.logs.selected').classList.remove('selected');
        document.getElementById(`${type}-logs`).classList.add('selected');
        tab.classList.add('selected');
      });
    });

    this.setupMap();
  }

  // Load the log labels for the current log type
  // into the form dropdown
  setLabels(logType) {
    labelsEl.innerHTML = '';
    Object.keys(LABELS[logType]).forEach((label) => {
      // Form dropdown
      let el = document.createElement('option');
      el.innerText = `${LABELS[logType][label]} ${label}`
      el.value = label;
      labelsEl.appendChild(el);
    });
  }

  // Search for a location/coordinates
  // for the given query
  queryLocation(query) {
    statusEl.innerText = 'Searching...';
    statusEl.style.display = 'block';

    // Search for possible coordinates
    // based on inputted location
    this.post('location', {
      query: query
    }, (json) => {
      // Display search results to choose from
      resultsEl.innerHTML = '';
      if (json.results.length > 0) {
        // Choose first result by default
        let res = json.results[0];
        this.previewCoords([res.coordinates[1], res.coordinates[0]], true);

        // If draw mode is point, set the coordinates to this
        if (this.drawMode == 'point') {
          coordsEl.value = res.coordinates;
        }

        // Only show first 5 results
        json.results.slice(0, 5).forEach((res) => {
          let li = document.createElement('li');
          li.innerText = `${res.name} (${res.coordinates.map((c) => c.toFixed(4))})`
          li.addEventListener('click', () => {
            // Visual selection
            let selected = resultsEl.querySelector('.selected');
            if (selected) selected.classList.remove('selected');
            li.classList.add('selected');

            this.previewCoords([res.coordinates[1], res.coordinates[0]], true);

            // If draw mode is point, set the coordinates to this
            if (this.drawMode == 'point') {
              coordsEl.value = res.coordinates;
            }
          });
          resultsEl.appendChild(li);
        });
      } else {
        resultsEl.innerText = 'No results';
      }
      statusEl.style.display = 'none';
    });
  }

  // Show the map marker for the given coordinates
  previewCoords(coords, jump) {
    if (this.marker) this.marker.remove();
    this.marker = map.addMarker(coords, {
      className: 'marker marker-preview'
    });
    if (jump) map.jumpTo(coords);
  }

  // Attempt to authenticate
  // the form for a given key
  authenticate(authKey, onActivate) {
    api.authKey = authKey;

    // No auth key given, ignore
    if (!api.authKey || api.authKey.trim() == "") return;

    // Check that the key is valid
    authStatusEl.innerText = 'Authorizing';
    authStatusEl.style.display = 'block';
    api.post('checkauth', {}, (results) => {
      // Valid, show the form
      if (results.success === true) {
        // Hide authentication status and show help/intro
        authStatusEl.style.display = 'none';
        overlay.style.display = 'block';
        document.getElementById('add').style.display = 'none';

        // Show form
        document.getElementById('append').style.display = 'block';
        document.getElementById('log-tabs').style.display = 'flex';
        onActivate();
        this.initialize();
      } else {
        authStatusEl.innerText = 'Invalid key';
        authStatusEl.style.display = 'block';
      }
    }).catch((err) => {
      authStatusEl.innerText = err;
      authStatusEl.style.display = 'block';
    });
  }

  setupMap() {
    // If the user is authenticated,
    // show a preview marker where clicked
    map.addClickListener('preview', (coord) => {
      if (api.authKey) {
        if (this.drawMode == 'point') {
          coordsEl.value = `${coord.lat},${coord.lng}`;
        }
        this.previewCoords([coord.lng, coord.lat]);
      }
    });

    // Enable drawing
    map.enableDrawing();
    map.map.on('draw.create', (ev) => {
      coordsEl.value = ev.features[0].geometry.coordinates[0].map((pt) => [...pt].reverse().join(',')).join(';');
    });
    map.map.on('draw.update', (ev) => {
      coordsEl.value = ev.features[0].geometry.coordinates[0].map((pt) => [...pt].reverse().join(',')).join(';');
    });
  }

  setDrawMode(type) {
    this.drawMode = type;
    if (type == 'point') {
      map.draw.deleteAll();
      map.draw.changeMode('simple_select');

      // Use preview marker location as initial value
      if (this.marker) {
        let coord = this.marker._lngLat;
        coordsEl.value = `${coord.lat},${coord.lng}`;
      } else {
        coordsEl.value = '';
      }
    } else if (type == 'area') {
      map.draw.changeMode('draw_polygon');
    }
  }

  // Submit the form (i.e. create a new log)
  submit() {
    // Gather form data
    let data = {};
    fields.forEach((k) => {
      data[k] = document.getElementById(k).value;
    });

    // Check that we have the necessary coordinates
    let drawModeValid = false;
    if (this.drawMode == 'area') {
      let coords = data['coordinates'].split(';');
      // Need at least 3 points + closing point to be a shape
      // And first point should be the same as the last point (closed shape)
      drawModeValid = coords.length > 3 && coords[0] == coords[coords.length - 1];
    } else if (this.drawMode == 'point') {
      drawModeValid = data['coordinates'].split(',').length == 2;
    }

    // All fields required, check they're all filled
    if (!(drawModeValid && fields.every((k) => data[k]))) {
      if (this.drawMode == 'area') {
        alert(`Please fill in the note, location, and finish drawing the area`);
      } else {
        alert(`Please fill in the note, location, and ${this.drawMode}`);
      }

    // Prep data
    } else {
      let formData = new FormData();

      // Get the image, if any
      let img = imagesEl.files[0];
      if (img) formData.append('image', img);

      // Load in the other form data
      Object.keys(data).forEach((k) => {
        formData.set(k, data[k]);
      });

      // Post the log data
      this.post(`log/${this.logType}`, formData, (json) => {
        // Reset fields on completion
        this.reset();
      });
    }
  }

  reset() {
    resultsEl.innerHTML = '';
    fields.forEach((k) => {
      let inp = document.getElementById(k);
      if (inp.tagName !== 'SELECT') {
        inp.value = '';
      }
    });
    imagesEl.value = '';

    // Clear map annotations
    // and reload draw mode
    map.draw.deleteAll();
    if (this.marker) this.marker.remove();
    this.setDrawMode(this.drawMode);
  }

  post(url, data, onSuccess) {
    // Reset error
    errEl.style.display = 'none';
    api.post(url, data, onSuccess)
      .catch((err) => {
        errEl.innerText = err;
        errEl.style.display = 'block';
      });
  }
}

// Singleton form
const form = new Form();

export default form;
