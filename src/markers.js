import map from './map';
import {el} from './util';
import LABELS from './labels';

// Markers for each log type
const MARKERS = {
  static: [],
  event: []
};

// When markers expire
let expireTime = 60 * 60 * 1000; // in ms. One hour
const minMarkerOpacity = 0.25;

function keyForLog(log) {
  let coords = log.el.dataset.coords.split(',').map((c) => parseFloat(c));
  return `${coords[1]}_${coords[0]}`;
}

// Get marker for a log, if any
function getMarker(log) {
  if (MARKERS[log.type][log.markerKey]) {
    let {marker} = MARKERS[log.type][log.markerKey];
    return marker;
  } else {
    return null;
  }
}

// Fade out markers based on how old they are
function fade(logType) {
  let now = new Date().getTime();
  Object.keys(MARKERS[logType]).forEach((k) => {
    let {marker, lastUpdate} = MARKERS[logType][k];
    let fade = Math.max(0, 1 - (now - lastUpdate)/expireTime);
    if (fade < 0.1)
    marker.getElement().style.opacity = Math.max(fade, minMarkerOpacity);
  });
}

function hide(logType) {
  Object.keys(MARKERS[logType]).forEach((k) => {
    let {marker} = MARKERS[logType][k];
    marker._element.style.display = 'none';
    const popup = marker.getPopup();
    if (popup.isOpen()) marker.togglePopup();
  });
}

function show(logType) {
  Object.keys(MARKERS[logType]).forEach((k) => {
    let {marker} = MARKERS[logType][k];
    marker._element.style.display = 'block';
  });
}

// Display one popup and hide the rest
function showPopup(log) {
  let marker = getMarker(log);
  if (marker) {
    closePopups();
    const popup = marker.getPopup();
    if (!popup.isOpen()) {
      marker.togglePopup();
    }
  }
}

// Hide all markers
function closePopups() {
  for (const logType of Object.keys(MARKERS)) {
    for (const marker of Object.values(MARKERS[logType])) {
      let popup = marker.marker.getPopup();
      if (popup.isOpen()) {
        marker.marker.togglePopup();
      }
    }
  }
}

// Add or update the marker for the given log
function upsertLog(log) {
  let icon = log.icon;

  // Add marker to map
  if (log.coords.length == 2) {
    let ch = [{
      tag: 'div',
      className: 'popup-location',
      innerText: log.location
    }, {
      tag: 'div',
      className: 'popup-label',
      innerText: log.labelText.slice(0, -2),
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
      id: `popup-${log.id}`,
      tag: 'div',
      dataset: {
        icon: icon
      },
      className: 'popup-log',
      children: ch
    });

    // Check if marker exists for this location,
    // if so, append log
    let marker  = getMarker(log);
    if (marker) {
      // Update marker icon to latest event's icon
      let markerEl = marker.getElement();
      if (icon) {
        markerEl.innerText = icon;
        markerEl.style.background = 'none';
      } else {
        markerEl.innerText = '';
        markerEl.style.background = 'red';
      }

      // Add to popup list
      let popup = marker.getPopup();
      let popupEl = popup._content;
      popupEl.querySelector('.popup-logs').prepend(newLog);

      MARKERS[log.type][log.markerKey].lastUpdate = log.timestamp*1000;

      // Reset fade
      markerEl.style.opacity = 1;
    } else {
      // Create new marker
      let element = el({
        tag: 'div',
        children: [{
          tag: 'div',
          className: 'popup-logs',
          children: [newLog]
        }]
      });
      log.coords.reverse();
      MARKERS[log.type][log.markerKey] = {
        lastUpdate: log.timestamp*1000,
        marker: map.addMarker(log.coords, {element, icon})
      };
    }
  }
}

// Remove the log for the specified key from its marker
function removeLog(log) {
  let marker = getMarker(log);
  if (marker) {
    let markerEl = marker.getElement();
    let popupEl = marker.getPopup()._content;

    // If only event in marker, remove marker entirely
    let events = popupEl.querySelectorAll('.popup-log');
    let popupItem = popupEl.querySelector(`#popup-${log.id}`);
    if (events.length == 1) {
      marker.remove();
      delete MARKERS[log.type][log.markerKey];

    // Otherwise, only remove that event
    } else if (popupItem) {
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

// Update the marker for a log
function updateLog(log) {
  let marker = getMarker(log);
  if (marker) {
    let markerEl = marker.getElement();
    let popupEl = marker.getPopup()._content;

    // Update icon if the most recent icon has changed
    let mostRecent = popupEl.querySelector('.popup-log');
    if (mostRecent.id == `popup-${log.id}`) {
      mostRecent.dataset.icon = log.icon;
      if (log.icon) {
        markerEl.innerText = log.icon;
        markerEl.style.background = 'none';
      } else {
        markerEl.innerText = '';
        markerEl.style.background = 'red';
      }
    }

    // Update label and other text
    let popupItem = popupEl.querySelector(`#popup-${log.id} .popup-label`);
    popupItem.innerText = log.labelText.slice(0, -2);
    popupEl.querySelector(`#popup-${log.id} h3`).innerText = log.text;
    popupEl.querySelector(`#popup-${log.id} .popup-location`).innerText = log.location;
  }
}

export default {keyForLog, upsertLog, updateLog, removeLog, showPopup, hide, show, fade};
