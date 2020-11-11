import {get, el} from '../util';

const toggleEl = document.getElementById('toggle-cams');

function makeMarkers(map, cams) {
  let markers = [];
  if (cams.length == 0) {
    toggleEl.innerHTML = 'No cameras for this region';

  } else {
    cams.forEach((cam) => {
      if (cam.url) {
        // Update interval
        let interval;

        // Set up map marker for camera
        let coords = [cam['lng'], cam['lat']];
        let marker = map.addMarker(coords, {
          // Keep the src elsewhere so we can refresh easily
          element: el({
            tag: 'img',
            src: '#',
            referrerPolicy: 'no-referrer',
            dataset: {
              src: cam.url
            }
          }),
          className: 'marker marker-camera',
          popup: {
            maxWidth: 'none'
          },
          onPopupOpen: (popup) => {
            let img = popup._content.querySelector('img');
            if (img) {
              let src = img.dataset.src;
              img.src = src;
              interval = setInterval(() => {
                img.src = `${src}?${new Date().getTime()}`;
              }, 5000);
            }
          },
          onPopupClose: () => {
            if (interval) clearInterval(interval);
          }
        });
        markers.push(marker);
      }
    });
  }
  return markers;
}

function setupCams(map) {
  let cams = [];
  let markers = [];
  let camsLoaded = false;
  toggleEl.addEventListener('change', (ev) => {
    if (ev.target.checked) {
      // Minimize network traffic,
      // only load cams once
      if (!camsLoaded) {
        get('cams', (json) => {
          cams = json.cams;
          camsLoaded = true;
          markers = makeMarkers(map, cams);
        });
      } else {
        markers = makeMarkers(map, cams);
      }
    } else {
      // Clean up markers
      markers.forEach((m) => m.remove());
    }
  });
}

export default setupCams;
