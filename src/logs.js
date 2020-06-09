import {post, el} from './util';

// Last seen log timestamp
let lastSeen = 0;

// When markers expire
let expireTime = 60 * 60 * 1000; // in ms. One hour
const minMarkerOpacity = 0.25;
const markers = {};
const logMarkers = {};

const LABELS = {
  'alert': '⚠',
  'police_presence':'👮',
  'units_requested':'🚓',
  'fire': '🔥',
  'prisoner_van': '🚐',
  'group': '🚩',
  'injury': '🩹',
  'barricade': '🚧',
  'aviation': '🚁',
  'aid': '⛑️',
  'military': '💂',
  'jail': '🔒',
  'protestor_barricade': '🛡️',
  'other': '🔹',
};
const labelsEl = document.getElementById('label');
const legendEl = document.getElementById('legend');
Object.keys(LABELS).forEach((label) => {
  // Form dropdown
  let el = document.createElement('option');
  el.innerText = `${LABELS[label]} ${label}`
  el.value = label;
  labelsEl.appendChild(el);

  // Legend
  el = document.createElement('span');
  el.innerText = `${LABELS[label]} ${label}`;
  legendEl.appendChild(el);
});

function addOrUpdateMarker(log, map) {
  let icon = log.label ? LABELS[log.label] : null;
  let labelText = log.label ? `${LABELS[log.label]} ${log.label}` : '';

  // Add marker to map
  if (log.coords.length == 2) {
    let newLog = el({
      id: `popup-${log.elId}`,
      tag: 'div',
      dataset: {
        icon: icon
      },
      className: 'popup-log',
      children: [{
        tag: 'div',
        className: 'popup-label',
        innerText: labelText,
      }, {
        tag: 'div',
        className: 'popup-when',
        innerText: log.dt,
      }, {
        tag: 'h3',
        innerText: log.text
      }]
    });

    // Check if marker exists for this location,
    // if so, append log
    log.coords.reverse();
    let key = `${log.coords[0]}_${log.coords[1]}`;
    logMarkers[log.elId] = key;
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

      markers[key].lastUpdate = log.timestamp*1000;

      // Reset fade
      markerEl.style.opacity = 1;
    } else {
      // Create new marker
      let element = el({
        tag: 'div',
        children: [{
          tag: 'div',
          className: 'popup-location',
          innerText: log.location
        }, {
          tag: 'div',
          className: 'popup-logs',
          children: [newLog]
        }]
      });
      markers[key] = {
        lastUpdate: log.timestamp*1000,
        marker: map.addMarker(log.coords, {element, icon})
      };
    }

    return key;
  }
}

function removeLogFromMarker(key, elId) {
  if (markers[key]) {
    let {marker} = markers[key];
    let markerEl = marker.getElement();
    let popupEl = marker.getPopup()._content;

    // If only event in marker, remove marker entirely
    let events = popupEl.querySelectorAll('.popup-log');
    let popupItem = popupEl.querySelector(`#popup-${elId}`);
    if (events.length == 1) {
      markers[key].marker.remove();
      delete markers[key];

    // Otherwise, only remove that event
    } else {
      if (popupItem) {
        popupItem.parentNode.removeChild(popupItem);

        // Update icon
        let mostRecent = popupEl.querySelector('.popup-log');
        let icon = mostRecent.dataset.icon;
        if (icon) {
          markerEl.innerText = icon;
          markerEl.style.background = 'none';
        } else {
          markerEl.innerText = '';
          markerEl.style.background = 'red';
        }
      }
    }
  }
}

function showLogs(logs, map, form) {
  // Track what log entries we have
  let logIds = new Set([...document.querySelectorAll('.logitem')].map((el) => el.id));

  logs.forEach((l) => {
    let log = {
      id: l.timestamp.toString(),
      elId: l.timestamp.toString().replace('.', '-'),
      dt: new Date(l.timestamp*1000).toLocaleString('en-US'),
      coords: l.data.coordinates.split(',').map((c) => parseFloat(c)),
      ...l.data, ...l
    };

    // Track which log entries are still present
    logIds.delete(log.elId);

    if (log.timestamp > lastSeen) {
      let key = addOrUpdateMarker(log, map);

      // Add to log sidebar
      let logEl = document.getElementById('log');
      let logItem = el({
        id: log.elId,
        tag: 'div',
        className: 'logitem',
        dataset: {
          permit: log.permit || false,
          coords: log.coordinates
        },
        children: [{
          tag: 'div',
          className: 'logitem-log',
          children: [{
            tag: 'div',
            className: 'logitem-when',
            innerText: log.dt,
          }, {
            tag: 'div',
            className: 'logitem-meta',
            children: [{
              tag: 'span',
              className: 'logitem-label',
              innerText: log.label ? `${LABELS[log.label]} ${log.label} @ ` : '',
              dataset: {
                label: log.label
              },
              on: {
                dblclick: (ev) => {
                  if (ev.target.closest('.logitem').dataset.permit == 'true') {
                    let inp = ev.target.parentNode.querySelector('.logitem-label-input');
                    inp.style.display = 'flex';
                    ev.target.style.display = 'none';
                  }
                }
              }
            }, {
              tag: 'div',
              className: 'logitem-label-input',
              children: [{
                tag: 'select',
                children: Object.keys(LABELS).map((label) => ({
                  tag: 'option',
                  innerText: `${LABELS[label]} ${label}`,
                  value: label,
                  selected: label == log.label
                })),
                on: {
                  input: (ev) => {
                    let newLabel = ev.target.value;
                    post('log/edit', {
                      timestamp: log.id,
                      action: 'update',
                      changes: {
                        label: ev.target.value
                      }
                    }, () => {
                      let text = newLabel && newLabel !== 'other' ? `${LABELS[newLabel]} ${newLabel} @ ` : '';
                      let labelEl = ev.target.closest('.logitem').querySelector('.logitem-label');
                      labelEl.innerText = text;
                      labelEl.style.display = 'inline';
                      ev.target.closest('.logitem-label-input').style.display = 'none';
                    }, form.authKey);
                  }
                }
              }, {
                tag: 'span',
                innerText: ' cancel',
                className: 'action logitem-label-edit-cancel',
                on: {
                  click: (ev) => {
                    ev.target.closest('.logitem-label-input').style.display = 'none';
                    ev.target.closest('.logitem').querySelector('.logitem-label').style.display = 'inline';
                  }
                }
              }]
            }, {
              tag: 'span',
              className: 'logitem-location',
              innerText: log.location,
              on: {
                dblclick: (ev) => {
                  if (ev.target.closest('.logitem').dataset.permit == 'true') {
                    let inp = ev.target.parentNode.querySelector('.logitem-location-input');
                    let can = ev.target.parentNode.querySelector('.logitem-location-edit-cancel');
                    let coords = ev.target.parentNode.querySelector('.logitem-coords');
                    map.addClickListener(log.id, (coord) => {
                      coords.value = `${coord.lat},${coord.lng}`;
                      form.previewCoords([coord.lng, coord.lat]);
                    });
                    inp.style.display = 'inline';
                    can.style.display = 'inline';
                    coords.style.display = 'block';
                    inp.value = log.location;
                    inp.focus();
                    ev.target.style.display = 'none';
                  }
                }
              }
            }, {
              tag: 'input',
              type: 'text',
              className: 'logitem-location-input',
              value: log.location,
              on: {
                keydown: (ev) => {
                  if (ev.key == 'Enter') {
                    let inp = ev.target;
                    let el = inp.parentNode.querySelector('.logitem-location');
                    let can = inp.parentNode.querySelector('.logitem-location-edit-cancel');
                    let coords = inp.parentNode.querySelector('.logitem-coords');
                    inp.style.display = 'none';
                    can.style.display = 'none';
                    coords.style.display = 'none';
                    el.style.display = 'inline';
                    map.removeClickListener(log.id);

                    post('log/edit', {
                      timestamp: log.id,
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
              className: 'action logitem-location-edit-cancel',
              on: {
                click: (ev) => {
                  let can = ev.target;
                  let inp = ev.target.parentNode.querySelector('.logitem-location-input');
                  let el = inp.parentNode.querySelector('.logitem-location');
                  let coords = inp.parentNode.querySelector('.logitem-coords');
                  coords.value = log.coordinates,
                  inp.style.display = 'none';
                  can.style.display = 'none';
                  coords.style.display = 'none';
                  el.style.display = 'inline';
                  map.removeClickListener(log.id);
                }
              }
            }, {
              tag: 'input',
              type: 'text',
              readonly: true,
              className: 'logitem-coords',
              value: log.coordinates
            }]
          }, {
            tag: 'div',
            className: 'logitem-text',
            innerText: log.text,
            on: {
              dblclick: (ev) => {
                if (ev.target.closest('.logitem').dataset.permit == 'true') {
                  let inp = ev.target.parentNode.querySelector('.logitem-text-input');
                  inp.style.display = 'block';
                  inp.focus();
                  ev.target.style.display = 'none';
                }
              }
            }
          }, {
            tag: 'input',
            type: 'text',
            className: 'logitem-text-input',
            value: log.text,
            on: {
              keydown: (ev) => {
                if (ev.key == 'Enter') {
                  let inp = ev.target
                  let el = inp.parentNode.querySelector('.logitem-text');
                  inp.style.display = 'none';
                  el.style.display = 'block';

                  post('log/edit', {
                    timestamp: log.id,
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
                  timestamp: log.id,
                  action: 'delete'
                }, () => {
                  logItem.parentNode.removeChild(logItem);
                  let key = logMarkers[log.elId];
                  removeLogFromMarker(key, log.elId);
                }, form.authKey);
              }
            }
          }
        }]
      });
      logEl.prepend(logItem);

      if (log.coords.length == 2) {
        logItem.addEventListener('click', () => {
          let coords = logItem.dataset.coords.split(',').map((c) => parseFloat(c));
          coords.reverse();
          map.jumpTo(coords);
          showPopup(markers[key].marker);
        });
      }
      lastSeen = log.timestamp;
    } else {
      // See if we need to update the entry
      let logItem = document.getElementById(log.elId);
      if (logItem) {
        logItem.dataset.permit = log.permit || false;
        let el = logItem.querySelector('.logitem-text');
        if (el.innerText != log.text) {
          el.innerText = log.text;
        }
        el = logItem.querySelector('.logitem-location');
        if (el.innerText != log.location) {
          el.innerText = log.location;
        }

        el = logItem.querySelector('.logitem-label');
        if (el.dataset.label != log.label) {
          el.dataset.label = log.label;
          el.innerText = log.label ? `${LABELS[log.label]} ${log.label} @ ` : '';

          // Change marker icon if necessary
          let key = logMarkers[log.elId];
          if (markers[key]) {
            let {marker} = markers[key];
            let markerEl = marker.getElement();
            let popupEl = marker.getPopup()._content;

            let mostRecent = popupEl.querySelector('.popup-log');
            if (mostRecent.id == `popup-${log.elId}`) {
              let icon = LABELS[log.label];
              mostRecent.dataset.icon = icon;
              if (icon) {
                markerEl.innerText = icon;
                markerEl.style.background = 'none';
              } else {
                markerEl.innerText = '';
                markerEl.style.background = 'red';
              }
            }
            let popupItem = popupEl.querySelector(`#popup-${log.elId} .popup-label`);
            let labelText = log.label ? `${LABELS[log.label]} ${log.label}` : '';
            popupItem.innerText = labelText;
          }
        }

        // Move marker if necessary
        if (logItem.dataset.coords != log.coordinates) {
          // Get existing marker
          let coords = logItem.dataset.coords.split(',').map((c) => parseFloat(c));
          let key = `${coords[1]}_${coords[0]}`;
          removeLogFromMarker(key, log.elId);
          addOrUpdateMarker(log, map);
          logItem.dataset.coords = log.coordinates;
        }
      }
    }
  });

  // Remove entries for remaining logs
  logIds.forEach((elId) => {
    [elId, `popup-${elId}`].forEach((id) => {
      let el = document.getElementById(id);
      if (el) {
        el.parentNode.removeChild(el);
      }
      let key = logMarkers[elId];
      removeLogFromMarker(key, elId);
    });
  });
}

// Display one popup and hide the rest
function showPopup(marker) {
  closePopups();
  const popup = marker.getPopup();
  if (!popup.isOpen()) {
    marker.togglePopup();
  }
}

// Hide all markers
function closePopups() {
  for (const marker of Object.values(markers)) {
    let popup = marker.marker.getPopup();
    if (popup.isOpen()) {
      marker.marker.togglePopup();
    }
  }
}

function fadeMarkers() {
  // Fade out markers
  let now = new Date().getTime();
  Object.keys(markers).forEach((k) => {
    let {marker, lastUpdate} = markers[k];
    let fade = Math.max(0, 1 - (now - lastUpdate)/expireTime);
    if (fade < 0.1)
    marker.getElement().style.opacity = Math.max(fade, minMarkerOpacity);
  });
}

export {showLogs, fadeMarkers};
