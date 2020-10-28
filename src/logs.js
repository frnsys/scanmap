import {get, post, el} from './util';
import LABELS from '../static/labels.json';

const logElIds = {
  event: [],
  static: []
};

// Last seen log timestamp
let lastSeen = {
  event: 0,
  static: 0
};

// When markers expire
let expireTime = 60 * 60 * 1000; // in ms. One hour
const minMarkerOpacity = 0.25;
const markers = {
  event: {},
  static: {}
};
const logMarkers = {};

const ALL_LABELS = {};
Object.values(LABELS).forEach((labels) => {
  Object.keys(labels).forEach((k) => {
    ALL_LABELS[k] = labels[k];
  });
});

const legendEl = document.getElementById('legend');
Object.keys(ALL_LABELS).forEach((label) => {
  // Legend
  let el = document.createElement('span');
  el.innerText = `${ALL_LABELS[label]} ${label}`;
  legendEl.appendChild(el);
});

function addOrUpdateMarker(log, map) {
  let icon = log.label ? LABELS[log.type][log.label] : null;
  let labelText = log.label ? `${LABELS[log.type][log.label]} ${log.label}` : '';

  // Add marker to map
  if (log.coords.length == 2) {
    let ch = [{
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
    }];
    if (log.image) {
      ch.push({
        tag: 'img',
        src: `/img/${log.image}`
      });
    }
    let newLog = el({
      id: `popup-${log.elId}`,
      tag: 'div',
      dataset: {
        icon: icon
      },
      className: 'popup-log',
      children: ch
    });

    // Check if marker exists for this location,
    // if so, append log
    log.coords.reverse();
    let key = `${log.coords[0]}_${log.coords[1]}`;
    logMarkers[log.elId] = key;
    if (key in markers[log.type]) {
      // Update marker icon to latest event's icon
      let markerEl = markers[log.type][key].marker.getElement();
      if (icon) {
        markerEl.innerText = icon;
        markerEl.style.background = 'none';
      } else {
        markerEl.innerText = '';
        markerEl.style.background = 'red';
      }

      // Add to popup list
      let popup = markers[log.type][key].marker.getPopup();
      let popupEl = popup._content;
      popupEl.querySelector('.popup-logs').prepend(newLog);

      markers[log.type][key].lastUpdate = log.timestamp*1000;

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
      markers[log.type][key] = {
        lastUpdate: log.timestamp*1000,
        marker: map.addMarker(log.coords, {element, icon})
      };
    }

    return key;
  }
}

function removeLogFromMarker(key, logType, elId) {
  if (markers[logType][key]) {
    let {marker} = markers[logType][key];
    let markerEl = marker.getElement();
    let popupEl = marker.getPopup()._content;

    // If only event in marker, remove marker entirely
    let events = popupEl.querySelectorAll('.popup-log');
    let popupItem = popupEl.querySelector(`#popup-${elId}`);
    if (events.length == 1) {
      markers[logType][key].marker.remove();
      delete markers[logType][key];

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

function showLogs(logType, logs, map, form, showMarkers) {
  // Track what log entries we have
  let logIds = new Set([...document.querySelectorAll(`#${logType}-logs .logitem`)].map((el) => el.id));

  let noLogs = document.querySelector(`#${logType}-logs .no-log`);
  if (logs.length == 0) {
    noLogs.style.display = 'block';
  } else {
    noLogs.style.display = 'none';
  }

  logElIds[logType] = [];
  logs.forEach((l) => {
    let log = {
      id: l.timestamp.toString(),
      elId: l.timestamp.toString().replace('.', '-'),
      dt: new Date(l.timestamp*1000).toLocaleString('en-US'),
      coords: l.data.coordinates.split(',').map((c) => parseFloat(c)),
      ...l.data, ...l
    };
    logElIds[log.type].push(log.elId);

    // Track which log entries are still present
    logIds.delete(log.elId);

    if (log.timestamp > lastSeen[log.type]) {
      let key = addOrUpdateMarker(log, map);

      // Add to log sidebar
      let logEl = document.getElementById(`${logType}-logs`);
      let logItem = document.getElementById(log.elId);
      if (!logItem) {
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
                innerText: log.label ? `${LABELS[log.type][log.label]} ${log.label} @ ` : '',
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
                  children: Object.keys(LABELS[log.type]).map((label) => ({
                    tag: 'option',
                    innerText: `${LABELS[log.type][label]} ${label}`,
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
                        let text = newLabel && newLabel !== 'other' ? `${LABELS[log.type][newLabel]} ${newLabel} @ ` : '';
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
                    removeLogFromMarker(key, log.type, log.elId);
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
            showPopup(markers[log.type][key].marker);
          });
        }
      }
      lastSeen[log.type] = log.timestamp;
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
          el.innerText = log.label ? `${LABELS[log.type][log.label]} ${log.label} @ ` : '';

          // Change marker icon if necessary
          let key = logMarkers[log.elId];
          if (markers[log.type][key]) {
            let {marker} = markers[log.type][key];
            let markerEl = marker.getElement();
            let popupEl = marker.getPopup()._content;

            let mostRecent = popupEl.querySelector('.popup-log');
            if (mostRecent.id == `popup-${log.elId}`) {
              let icon = LABELS[log.type][log.label];
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
            let labelText = log.label ? `${LABELS[log.type][log.label]} ${log.label}` : '';
            popupItem.innerText = labelText;
          }
        }

        // Move marker if necessary
        if (logItem.dataset.coords != log.coordinates) {
          // Get existing marker
          let coords = logItem.dataset.coords.split(',').map((c) => parseFloat(c));
          let key = `${coords[1]}_${coords[0]}`;
          removeLogFromMarker(key, log.type, log.elId);
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
      removeLogFromMarker(key, logType, elId);
    });
  });

  // TODO Not ideal
  if (!showMarkers) {
    clearMarkers(logType);
  }
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
  for (const logType of Object.keys(markers)) {
    for (const marker of Object.values(markers[logType])) {
      let popup = marker.marker.getPopup();
      if (popup.isOpen()) {
        marker.marker.togglePopup();
      }
    }
  }
}

function fadeMarkers(logType) {
  // Fade out markers
  let now = new Date().getTime();
  Object.keys(markers[logType]).forEach((k) => {
    let {marker, lastUpdate} = markers[logType][k];
    let fade = Math.max(0, 1 - (now - lastUpdate)/expireTime);
    if (fade < 0.1)
    marker.getElement().style.opacity = Math.max(fade, minMarkerOpacity);
  });
}


function fetchLogs(logType, map, form, showMarkers) {
  get(
    `log/${logType}`,
    ({ logs }) => {
      showLogs(logType, logs, map, form, showMarkers);
    },
    form.authKey
  ).catch((err) => {
    console.log(err);
  });
}

function fetchPinned() {
  get('log/pinned', ({ logs }) => {
    if (logs.length > 0) {
      let el = document.getElementById('pinned-log');
      let textEl = document.getElementById('pinned-log-text');
      let log = logs[0];
      let ts = el.dataset.timestamp;
      if (log.data.text.length > 0 && ts != log.timestamp) {
        el.style.display = 'block';
        el.dataset.timestamp = log.timestamp;
      } else {
        el.style.display = 'none';
      }
      textEl.innerText = log.data.text;
    }
  });
}

function clearMarkers(logType) {
  logElIds[logType].forEach((elId) => {
    let key = logMarkers[elId];
    removeLogFromMarker(key, logType, elId);
  });
  // TODO Not an ideal way of doing this
  lastSeen[logType] = 0;
}

export {fetchLogs, fetchPinned, fadeMarkers, clearMarkers};
