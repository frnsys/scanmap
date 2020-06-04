import {post, el} from './util';

// Last seen log timestamp
let lastSeen = 0;

// When markers expire
let expireTime = 60 * 60 * 1000; // in ms. One hour
const minMarkerOpacity = 0.1;
const markers = {};

const LABELS = {
  'other': '',
  'police_presence':'👮',
  'units_requested':'🚓',
  'fire': '🔥',
  'prisoner_van': '🚐',
  'group': '🚩',
  'injury': '🩹',
  'barricade': '🚧'
};
const labelsEl = document.getElementById('label');
Object.keys(LABELS).forEach((label) => {
  let el = document.createElement('option');
  el.innerText = `${LABELS[label]} ${label}`
  el.value = label;
  labelsEl.appendChild(el);
});


function showLogs(logs, map, form) {
  // Track what log entries we have
  let logIds = new Set([...document.querySelectorAll('.logitem')].map((el) => el.id));

  logs.forEach((l) => {
    // Track which log entries are still present
    let logId = l.timestamp.toString();
    logIds.delete(logId);
    let ld = l.data;

    if (l.timestamp > lastSeen) {
      let dt = new Date(l.timestamp*1000).toLocaleString('en-US');

      let icon = ld.label ? LABELS[ld.label] : null;
      let labelText = ld.label ? `${LABELS[ld.label]} ${ld.label}` : '';

      // Add marker to map
      let coords = ld.coordinates.split(',').map((c) => parseFloat(c));
      if (coords.length == 2) {
        let newLog = el({
          id: `popup-${logId}`,
          tag: 'div',
          className: 'popup-log',
          children: [{
            tag: 'div',
            className: 'popup-label',
            innerText: labelText,
          }, {
            tag: 'div',
            className: 'popup-when',
            innerText: dt,
          }, {
            tag: 'h3',
            innerText: ld.text
          }]
        });

        // Check if marker exists for this location,
        // if so, append log
        coords.reverse();
        let key = `${coords[0]}_${coords[1]}`;
        if (key in markers) {
          // Update marker icon to latest event's icon
          let markerEl = markers[key].marker.getElement();
          if (icon) {
            markerEl.innerText = icon;
            markerEl.style.background = 'none';
          } else {
            markerEl.innerText = '';
            markerEl.style.background = 'red';
          }

          // Add to popup list
          let popup = markers[key].marker.getPopup();
          let popupEl = popup._content;
          popupEl.querySelector('.popup-logs').prepend(newLog);

          markers[key].lastUpdate = l.timestamp*1000;
        } else {
          // Create new marker
          let element = el({
            tag: 'div',
            children: [{
              tag: 'div',
              className: 'popup-location',
              innerText: ld.location
            }, {
              tag: 'div',
              className: 'popup-logs',
              children: [newLog]
            }]
          });
          markers[key] = {
            lastUpdate: l.timestamp*1000,
            marker: map.addMarker(coords, {element, icon})
          };
        }
      }

      // Add to log sidebar
      let logEl = document.getElementById('log');
      let logItem = el({
        id: logId,
        tag: 'div',
        className: 'logitem',
        dataset: {
          permit: l.permit || false
        },
        children: [{
          tag: 'div',
          className: 'logitem-log',
          children: [{
            tag: 'div',
            className: 'logitem-when',
            innerText: dt,
          }, {
            tag: 'div',
            className: 'logitem-meta',
            children: [{
              tag: 'span',
              innerText: ld.label && ld.label !== 'other' ? `${LABELS[ld.label]} ${ld.label} @ ` : ''
            }, {
              tag: 'span',
              className: 'logitem-location',
              innerText: ld.location,
              on: {
                click: (ev) => {
                  if (ev.target.closest('.logitem').dataset.permit == 'true') {
                    let inp = ev.target.parentNode.querySelector('.logitem-location-input');
                    let can = ev.target.parentNode.querySelector('.logitem-edit-cancel');
                    let coords = ev.target.parentNode.querySelector('.logitem-coords');
                    map.addClickListener(logId, (coord) => {
                      coords.value = `${coord.lat},${coord.lng}`;
                      form.previewCoords([coord.lng, coord.lat]);
                    });
                    inp.style.display = 'inline';
                    can.style.display = 'inline';
                    coords.style.display = 'block';
                    inp.value = ld.location;
                    inp.focus();
                    ev.target.style.display = 'none';
                  }
                }
              }
            }, {
              tag: 'input',
              type: 'text',
              className: 'logitem-location-input',
              value: ld.location,
              on: {
                keydown: (ev) => {
                  if (ev.key == 'Enter') {
                    let inp = ev.target;
                    let el = inp.parentNode.querySelector('.logitem-location');
                    let can = inp.parentNode.querySelector('.logitem-edit-cancel');
                    let coords = inp.parentNode.querySelector('.logitem-coords');
                    inp.style.display = 'none';
                    can.style.display = 'none';
                    coords.style.display = 'none';
                    el.style.display = 'inline';
                    map.removeClickListener(logId);

                    post('log/edit', {
                      timestamp: logId,
                      action: 'update',
                      changes: {
                        location: inp.value,
                        coordinates: coords.value
                      }
                    }, () => {
                      el.innerText = inp.value;
                    }, form.authKey);
                  }
                }
              }
            }, {
              tag: 'span',
              innerText: ' cancel',
              className: 'action logitem-edit-cancel',
              on: {
                click: (ev) => {
                  let can = ev.target;
                  let inp = ev.target.parentNode.querySelector('.logitem-location-input');
                  let el = inp.parentNode.querySelector('.logitem-location');
                  let coords = inp.parentNode.querySelector('.logitem-coords');
                  coords.value = ld.coordinates,
                  inp.style.display = 'none';
                  can.style.display = 'none';
                  coords.style.display = 'none';
                  el.style.display = 'inline';
                  map.removeClickListener(logId);
                }
              }
            }, {
              tag: 'input',
              type: 'text',
              readonly: true,
              className: 'logitem-coords',
              value: ld.coordinates
            }]
          }, {
            tag: 'div',
            className: 'logitem-text',
            innerText: ld.text,
            on: {
              click: (ev) => {
                if (ev.target.closest('.logitem').dataset.permit == 'true') {
                  let inp = ev.target.parentNode.querySelector('.logitem-text-input');
                  inp.style.display = 'block';
                  inp.value = ld.text;
                  inp.focus();
                  ev.target.style.display = 'none';
                }
              }
            }
          }, {
            tag: 'input',
            type: 'text',
            className: 'logitem-text-input',
            value: ld.text,
            on: {
              keydown: (ev) => {
                if (ev.key == 'Enter') {
                  let inp = ev.target
                  let el = inp.parentNode.querySelector('.logitem-text');
                  inp.style.display = 'none';
                  el.style.display = 'block';

                  post('log/edit', {
                    timestamp: logId,
                    action: 'update',
                    changes: {
                      text: inp.value
                    }
                  }, () => {
                    el.innerText = inp.value;
                  }, form.authKey);
                }
              }
            }
          }]
        }, {
          tag: 'div',
          className: 'delete-log',
          innerText: '❌',
          on: {
            click: () => {
              if (confirm('Are you sure you want to delete this?')) {
                post('log/edit', {
                  timestamp: logId,
                  action: 'delete'
                }, () => {
                  logItem.parentNode.removeChild(logItem);
                  console.log('deleted');
                }, form.authKey);
              }
            }
          }
        }]
      });
      logEl.prepend(logItem);

      if (coords.length == 2) {
        logItem.addEventListener('click', () => {
          map.jumpTo(coords);
        });
      }
      lastSeen = l.timestamp;
    } else {
      // See if we need to update the entry
      let logItem = document.getElementById(logId);
      logItem.dataset.permit = l.permit || false;
      let el = logItem.querySelector('.logitem-text');
      if (el.innerText != ld.text) {
        el.innerText = ld.text;
      }
      el = logItem.querySelector('.logitem-location');
      if (el.innerText != ld.location) {
        el.innerText = ld.location;
      }
    }
  });

  // Remove entries for remaining logIds
  logIds.forEach((logId) => {
    [logId, `popup-${logId}`].forEach((id) => {
      let el = document.getElementById(id);
      el.parentNode.removeChild(el);
    });
  });
}

function fadeMarkers() {
  // Fade out markers
  let now = new Date().getTime();
  Object.keys(markers).forEach((k) => {
    let {marker, lastUpdate} = markers[k];
    let fade = Math.max(0, 1 - (now - lastUpdate)/expireTime);
    if (fade < 0.1)
    marker.getElement().style.opacity = Math.max(fade, 0.1);
  });
}

export {showLogs, fadeMarkers};
