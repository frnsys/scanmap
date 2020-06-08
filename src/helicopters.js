import {get, el} from './util';

const toggleEl = document.getElementById('toggle-helicopters');

function makeMarkers(map, items) {
  let markers = [];
  if (items.length == 0) {
    toggleEl.innerHTML = 'No helicopters for this region';

  } else {
    items.forEach((item) => {
      if (item.url) {
        // Set up map marker for helicopter
        let coords = [item['lng'], item['lat']];
        let marker = map.addMarker(coords, {
          element: el({
            tag: 'img',
            src: item.url
          }),
          className: 'marker marker-helicopter',
          popup: {
            maxWidth: 'none'
          }
        });
        markers.push(marker);
      }
    });
  }
  return markers;
}

let markers = [];

function addHelicopters(map) {
  get('helicopters', (json) => {
    markers = makeMarkers(map, json.helicopters);
  });
}

function removeHelicopters(map) {
  markers.forEach((m) => m.remove());
}

function setupHelicopters(map) {
  let markers = [];
  let interval;
  toggleEl.addEventListener('click', (ev) => {
    if (ev.target.checked) {
      addHelicopters(map);
      interval = setInterval(() => {
        removeHelicopters();
        addHelicopters(map);
      }, 10000); // slightly slower than cache to guarantee update
    } else {
      removeHelicopters();
      if (interval) clearInterval(interval);
    }
  });
}

export default setupHelicopters;
