/*
 * Form for annotators to submit new annotations
 */

import {post} from '../util';
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
  constructor(map) {
    this.map = map;

    // User's auth key
    this.authKey = '';

    // The current map marker
    this.marker = null;

    // Type of log the form is for
    // i.e. "event" or "static".
    // This reflects the active tab on the form
    this.logType = 'event';

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
        coordsEl.value = res.coordinates;
        this.previewCoords([res.coordinates[1], res.coordinates[0]], true);

        // Only show first 5 results
        json.results.slice(0, 5).forEach((res) => {
          let li = document.createElement('li');
          li.innerText = `${res.name} (${res.coordinates.map((c) => c.toFixed(4))})`
          li.addEventListener('click', () => {
            // Visual selection
            let selected = resultsEl.querySelector('.selected');
            if (selected) selected.classList.remove('selected');
            li.classList.add('selected');

            coordsEl.value = res.coordinates;
            this.previewCoords([res.coordinates[1], res.coordinates[0]], true);
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
    this.marker = this.map.addMarker(coords, {
      className: 'marker marker-preview'
    });
    if (jump) this.map.jumpTo(coords);
  }

  // Attempt to authenticate
  // the form for a given key
  authenticate(authKey, onActivate) {
    this.authKey = authKey;

    // No auth key given, ignore
    if (this.authKey.trim() == "") return;

    // Check that the key is valid
    authStatusEl.innerText = 'Authorizing';
    authStatusEl.style.display = 'block';
    post('checkauth', {}, (results) => {
      // Valid, show the form
      if (results.success === true) {
        // Hide authentication status and show help/intro
        authStatusEl.style.display = 'none';
        overlay.style.display = 'block';

        // Show form
        document.getElementById('append').style.display = 'block';
        document.getElementById('log-tabs').style.display = 'flex';
        onActivate();
      } else {
        authStatusEl.innerText = 'Invalid key';
        authStatusEl.style.display = 'block';
      }
    }, this.authKey).catch((err) => {
      authStatusEl.innerText = err;
      authStatusEl.style.display = 'block';
    });
  }

  // Submit the form (i.e. create a new log)
  submit() {
    // Gather form data
    let data = {};
    fields.forEach((k) => {
      data[k] = document.getElementById(k).value;
    });

    // All fields required, check they're all filled
    if (!fields.every((k) => data[k])) {
      alert('Please fill in the note, location, and coordinates');

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
        resultsEl.innerHTML = '';
        fields.forEach((k) => {
          let inp = document.getElementById(k);
          if (inp.tagName !== 'SELECT') {
            inp.value = '';
          }
        });
        imagesEl.value = '';
        if (this.marker) this.marker.remove();
      });
    }
  }

  // Convenience method for authenticated
  // post requests
  post(url, data, onSuccess) {
    // Reset error
    errEl.style.display = 'none';
    post(url, data, onSuccess, this.authKey)
      .catch((err) => {
        errEl.innerText = err;
        errEl.style.display = 'block';
      });
  }
}

export default Form;
