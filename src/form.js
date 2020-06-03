const fields = ['text', 'location', 'coordinates', 'label'];
const overlay = document.getElementById('overlay');
const errEl = document.getElementById('error');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('coord-results');
const coordsEl = document.getElementById('coordinates');

class Form {
  constructor(map) {
    this.map = map;
    this.authKey = '';
    this.marker = null;
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
        this.previewCoords([res.coordinates[1], res.coordinates[0]]);

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
            this.previewCoords([res.coordinates[1], res.coordinates[0]]);
          });
          resultsEl.appendChild(li);
        });
      } else {
        resultsEl.innerText = 'No results';
      }
      statusEl.style.display = 'none';
    });
  }

  previewCoords(coords) {
    if (this.marker) this.marker.remove();
    this.marker = this.map.addMarker(coords, {
      className: 'marker marker-preview'
    });
    this.map.jumpTo(coords);
  }

  activate(authKey) {
    this.authKey = authKey || prompt('Key');

    // Show intro and bind help button
    overlay.style.display = 'block';
    document.getElementById('ready').addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    document.getElementById('show-help').addEventListener('click', () => {
      overlay.style.display = 'block';
    });

    // Show form
    document.getElementById('append').style.display = 'block';
    document.getElementById('location').addEventListener('keydown', (ev) => {
      if (ev.key == 'Enter') {
        this.queryLocation(ev.target.value);
      }
    });
    document.getElementById('location-search').addEventListener('click', () => {
      this.queryLocation(document.getElementById('location').value);
    });

    // Send log
    document.getElementById('submit').addEventListener('click', () => this.submit());
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

    fetch(url, {
      headers: {
        'X-AUTH': this.authKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(data)
    })
      .then((res) => {
        if (res.status == 401) {
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(onSuccess)
      .catch((err) => {
        errEl.innerText = err;
        errEl.style.display = 'block';
      });
  }
}

export default Form;
