class Form {
  constructor(map) {
    this.map = map;
    this.authKey = '';
  }

  queryLocation(query) {
    let marker;
    let statusEl = document.getElementById('status');
    statusEl.innerText = 'Searching...';
    statusEl.style.display = 'block';

    this.post('/location', {
      query: query
    }, (json) => {
      // Display search results to choose from
      let list = document.getElementById('coord-results');
      list.innerHTML = '';
      if (json.results.length > 0) {
        json.results.slice(0, 5).forEach((res) => {
          console.log(res);
          let li = document.createElement('li');
          li.innerText = `${res.name} (${res.coordinates.map((c) => c.toFixed(4))})`
          li.addEventListener('click', () => {
            let selected = list.querySelector('.selected');
            if (selected) selected.classList.remove('selected');
            li.classList.add('selected');
            document.getElementById('coordinates').value = res.coordinates;

            // Show location preview
            // Mapbox is lng, lat
            let coords = [res.coordinates[1], res.coordinates[0]];
            if (marker) marker.remove();
            marker = this.map.addMarker(coords, {
              className: 'marker marker-preview'
            });
            this.map.jumpTo(coords);
          });
          list.appendChild(li);
        });
      } else {
        list.innerText = 'No results';
      }
      statusEl.style.display = 'none';
    });
  }

  activate(authKey) {
    this.authKey = authKey || prompt('Key');

    document.getElementById('show-help').addEventListener('click', () => {
      let help = document.getElementById('help');
      help.style.display = help.style.display == 'block' ? 'none' : 'block';
    });

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
    document.getElementById('submit').addEventListener('click', (ev) => {
      let data = {};
      ['text', 'location', 'coordinates'].forEach((k) => {
        data[k] = document.getElementById(k).value;
      });
      console.log(data);
      this.post('/log', data, (json) => {
        console.log(json);

        // Reset
        document.getElementById('coord-results').innerHTML = '';
        ['text', 'location', 'coordinates'].forEach((k) => {
          document.getElementById(k).value = '';
        });
      });
    });
  }

  post(url, data, onSuccess) {
    // Reset error
    document.getElementById('error').style.display = 'none';

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
        let errEl = document.getElementById('error');
        errEl.innerText = err;
        errEl.style.display = 'block';
      });
  }
}

export default Form;
