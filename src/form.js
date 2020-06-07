import {post, debounce} from './util';

const fields = ['text', 'location', 'coordinates', 'label'];
const overlay = document.getElementById('overlay');
const errEl = document.getElementById('error');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('coord-results');
const coordsEl = document.getElementById('coordinates');
const authStatusEl = document.getElementById('auth-status');

class Form {
  constructor(map) {
    this.map = map;
    this.authKey = '';
    this.marker = null;

    document.getElementById('ready').addEventListener('click', () => {
        overlay.style.display = 'none';
    });

    document.getElementById('show-help').addEventListener('click', () => {
      overlay.style.display = 'block';
    });

    // autocomplete location search every 250ms
    document.getElementById('location').addEventListener('keydown', debounce((ev) => {
      this.queryLocation(ev.target.value);
    }, 250));

    document.getElementById('location-search').addEventListener('click', () => {
      this.queryLocation(document.getElementById('location').value);
    });

    document.getElementById('submit').addEventListener('click', () => this.submit());
  }

  queryLocation(query) {
    if (query.trim() == "") return;

    // Search for possible coordinates
    // based on inputted location
    this.post('location', {
      query: query
    }, (json) => {
      // Display search results to choose from
      resultsEl.innerHTML = '';
      if (json.results.length > 0) {
        // Only show first 5 results
        json.results.slice(0, 5).forEach((res) => {
          let li = document.createElement('li');
          li.innerText = res.name;
          li.addEventListener('click', () => {
            // Visual selection
            let selected = resultsEl.querySelector('.selected');
            if (selected) selected.classList.remove('selected');
            li.classList.add('selected');

            document.getElementById('location').value = res.name;

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
      console.log(data);
      this.post('log', data, (json) => {
        // Reset fields
        resultsEl.innerHTML = '';
        fields.forEach((k) => {
          let inp = document.getElementById(k);
          if (inp.tagName !== 'SELECT') {
            inp.value = '';
          }
        });
        if (this.marker) this.marker.remove();
      });
    }
  }

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
