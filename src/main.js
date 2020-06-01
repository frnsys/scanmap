import Map from './map';
import Form from './form';
import config from '../config';
import mapboxgl from 'mapbox-gl';

let lastSeen = 0;
let expireTime = 60 * 60 * 1000; // in ms. One hour
const markers = {};
const updateInterval = 5000; // ms

function update() {
  fetch('/log', {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'GET'
  })
    .then((res) => res.json())
    .then((json) => {
      json.logs.forEach((l) => {
        if (l.timestamp > lastSeen) {
          let dt = new Date(l.timestamp*1000).toLocaleString("en-US");

          // Add marker to map
          let coords = l.coordinates.split(',').map((c) => parseFloat(c));
          if (coords.length == 2) {
            coords.reverse();

            // Check if marker exists for this location,
            // if so, append log
            let key = `${coords[0]}_${coords[1]}`;
            if (key in markers) {
              let popup = markers[key].marker.getPopup();
              let popupEl = popup._content;
              let newLog = document.createElement('div');
              newLog.className = 'popup-log';

              let newLogWhen = document.createElement('div');
              newLogWhen.className = 'popup-when';
              newLogWhen.innerText = dt;
              newLog.appendChild(newLogWhen);

              let newLogText = document.createElement('h3');
              newLogText.innerText = l.text;
              newLog.appendChild(newLogText);
              popupEl.querySelector('.popup-logs').prepend(newLog);
            } else {
              let desc = `
                <div class="popup-location">${l.location}</div>
                <div class="popup-logs">
                  <div class="popup-log">
                    <div class="popup-when">${dt}</div>
                    <h3>${l.text}</h3>
                  </div>
                </div>`;
              markers[key] = {
                lastUpdate: l.timestamp*1000,
                marker: map.addMarker(coords, {desc})
              };
            }
          }

          // Add to log sidebar
          let logEl = document.getElementById('log');
          let logItem = document.createElement('div');
          logItem.className = 'logitem';

          let logItemWhen = document.createElement('div');
          logItemWhen.className = 'logitem-when';
          logItemWhen.innerText = dt;
          logItem.appendChild(logItemWhen);

          let logItemLocation = document.createElement('div');
          logItemLocation.className = 'logitem-location';
          logItemLocation.innerText = l.location;
          logItem.appendChild(logItemLocation);

          let logItemText = document.createElement('div');
          logItemText.className = 'logitem-text';
          logItemText.innerText = l.text;
          logItem.appendChild(logItemText);

          logEl.prepend(logItem);
          if (coords.length == 2) {
            logItem.addEventListener('click', () => {
              map.jumpTo(coords);
            });
          }
          lastSeen = l.timestamp;
        }
      });
    })
    .catch((err) => {
      alert(err);
    });

  // Fade out markers
  let now = new Date().getTime();
  Object.keys(markers).forEach((k) => {
    let {marker, lastUpdate} = markers[k];
    let fade = Math.max(0, 1 - (now - lastUpdate)/expireTime);
    marker.getElement().style.opacity = Math.max(fade, 0.1);
  });
}


mapboxgl.accessToken = config.MAPBOX_TOKEN;
const map = new Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  zoom: 12,
  maxZoom: 18,
  minZoom: 10,
  center: [-73.96161699999999, 40.678806]
}, (coord) => {
  document.getElementById('coordinates').value = [coord.lat, coord.lng];
});

update();
setInterval(() => {
  update();
}, updateInterval);

document.getElementById('add').addEventListener('click', () => {
  let form = new Form(map);
  form.activate();
});
