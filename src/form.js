import {post} from './util';
import LABELS from './labels';

const fields = ['text', 'location', 'coordinates', 'label'];
const overlay = document.getElementById('overlay');
const errEl = document.getElementById('error');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('coord-results');
const coordsEl = document.getElementById('coordinates');
const authStatusEl = document.getElementById('auth-status');
const labelsEl = document.getElementById('label');

class Form {
  constructor(map) {
    this.map = map;
    this.authKey = '';
    this.marker = null;
    this.logType = 'event';

    document.getElementById('ready').addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    document.getElementById('show-help').addEventListener('click', () => {
      overlay.style.display = 'block';
    });
    document.getElementById('location').addEventListener('keydown', (ev) => {
      if (ev.key == 'Enter') {
        this.queryLocation(ev.target.value);
      }
    });
    document.getElementById('location-search').addEventListener('click', () => {
      this.queryLocation(document.getElementById('location').value);
    });

    document.getElementById('submit').addEventListener('click', () => this.submit());

    this.setLabels(this.logType);
    [...document.querySelectorAll('.append-tab')].forEach((tab) => {
      let type = tab.dataset.type;
      tab.addEventListener('click', () => {
        this.logType = type;
        this.setLabels(this.logType);
        document.querySelector('.append-tab.selected').classList.remove('selected');
        tab.classList.add('selected');
      });
    });

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

  previewCoords(coords, jump) {
    if (this.marker) this.marker.remove();
    this.marker = this.map.addMarker(coords, {
      className: 'marker marker-preview'
    });
    if (jump) this.map.jumpTo(coords);
  }

  activate(authKey, onActivate) {
    this.authKey = authKey;

    if (this.authKey.trim() == "") return;

    authStatusEl.innerText = 'Authorizing';
    authStatusEl.style.display = 'block';
    // Reset error
    post('checkauth', {}, (results) => {
      if (results.success === true) {
        // Show intro and bind help button
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

  submit() {
    let data = {};
    fields.forEach((k) => {
      data[k] = document.getElementById(k).value;
    });

    // All fields required
    if (!fields.every((k) => data[k])) {
      alert('Please fill in the note, location, and coordinates');

    } else {
      let img = document.getElementById('image').files[0];
      let formData = new FormData();
      if (img) {
        formData.append('image', img);
      }
      Object.keys(data).forEach((k) => {
        formData.set(k, data[k]);
      });

      this.post(`log/${this.logType}`, formData, (json) => {
        // Reset fields
        resultsEl.innerHTML = '';
        fields.forEach((k) => {
          let inp = document.getElementById(k);
          if (inp.tagName !== 'SELECT') {
            inp.value = '';
          }
        });
        if (this.marker) this.marker.remove();
      }, true);
    }
  }

  post(url, data, onSuccess, form) {
    // Reset error
    errEl.style.display = 'none';
    post(url, data, onSuccess, this.authKey, form)
      .catch((err) => {
        errEl.innerText = err;
        errEl.style.display = 'block';
      });
  }
}

export default Form;
