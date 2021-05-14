import map from './map';
import {el} from './util';
import polylabel from 'polylabel';

// Markers for each log type
const MARKERS = {
  static: [],
  event: []
};

// When markers expire
let expireTime = 60 * 60 * 1000; // in ms. One hour
const minMarkerOpacity = 0.25;

// Region/area paint properties
const basePaintOpacity = 0.25;
const defaultPaint = {
  'fill-color': '#3F64FD',
  'fill-opacity': basePaintOpacity,
  'fill-outline-color': '#ff0000',
  'fill-opacity-transition': {
    'duration': 0
  },
  'fill-color-transition': {
    'duration': 0
  }
};
const highlightPaint = {
  'fill-color': '#F94646',
  'fill-outline-color': '#ff0000',
  'fill-opacity': 0.5,
};

function keyForLog(log) {
  let markerPoint = markerPointForLog(log);
  return `${markerPoint[0]}_${markerPoint[1]}`;
}

function markerPointForLog(log) {
  let points = log.latestCoords();
  if (points.length == 1) {
    return points[0];
  } else {
    return polylabel([points], 1.0);
  }
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
    let opacity = Math.max(fade, minMarkerOpacity);
    marker.getElement().style.opacity = opacity;

    // Fade associated areas, but don't interfere
    // if they are currently highlighted
    if (!marker.getPopup().isOpen()) {
      marker.areas.forEach((logId) => {
        map.map.setPaintProperty(logId, 'fill-opacity', basePaintOpacity * opacity);
      });
    }
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
  let markerPoint = markerPointForLog(log);

  // Add marker to map
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
  let marker = getMarker(log);
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
    marker = map.addMarker(markerPoint, {
      element, icon,
      onPopupOpen: (_, marker) => {
        if (marker.areas) {
          marker.areas.forEach((logId) => {
            Object.keys(highlightPaint).forEach((k) => {
              map.map.setPaintProperty(logId, k, highlightPaint[k]);
            });
          });
        }
      },
      onPopupClose: (_, marker) => {
        if (marker.areas) {
          marker.areas.forEach((logId) => {
            Object.keys(defaultPaint).forEach((k) => {
              map.map.setPaintProperty(logId, k, defaultPaint[k]);
            });
            let opacity = marker.getElement().style.opacity;
            map.map.setPaintProperty(logId, 'fill-opacity', basePaintOpacity * opacity);
          });
        }
      }
    });
    marker.areas = [];
    MARKERS[log.type][log.markerKey] = {
      marker,
      lastUpdate: log.timestamp*1000
    };
  }

  // Render area/region
  if (log.coords.length > 1) {
    marker.areas.push(log.id);

    let data = {
      'type': 'Feature',
      'geometry': {
        'type': 'Polygon',
        'coordinates': [log.coords]
      },
      'properties': {
        'type': 'area',
        'logType': log.type,
        'markerKey': log.markerKey,

        // Kind of weird, you'd assume we can get the polygon points
        // from the geometry itself. But it's actually not exactly
        // the same as the coordinates we specify when given back
        // as a mapbox feature. So we put this here so we can
        // keep track of the exact specified coordinates
        'coords': log.coordinates
      }
    };

    // Check if log region is already on the map
    let source = map.map.getSource(log.id);
    if (!source) {
      map.map.addSource(log.id, {
        'type': 'geojson',
        'data': data,
      });
      map.map.addLayer({
        'id': log.id,
        'type': 'fill',
        'source': log.id,
        'paint': defaultPaint
      });
    } else {
      source.setData(data);
    }
  }
}

// Remove the log for the specified key from its marker
function removeLog(log, keepArea) {
  let marker = getMarker(log);
  if (marker) {
    // Remove from this marker's areas
    marker.areas = marker.areas.filter((id) => id != log.id);

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

  // Delete area
  if (log.coords.length > 1 && !keepArea) {
    map.map.removeLayer(log.id);
    map.map.removeSource(log.id);
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

// Show associated popups when a region is clicked on
map.map.on('click', (ev) => {
  // Ignore if map is in drawing mode
  if (map.draw) {
    let drawMode = map.draw.getMode();
    if (drawMode == 'draw_polygon' || drawMode == 'direct_select') return;
  }

  let feats = map.map.queryRenderedFeatures(ev.point);
  let areas = feats.filter((f) => f.properties['type'] == 'area');
  areas.forEach((a) => {
    let {logType, markerKey} = a.properties;
    let {marker} = MARKERS[logType][markerKey];
    let popup = marker.getPopup();

    // Hack to prevent interference w/
    // markers' default click events:
    // Without this, if you click on the marker in an area,
    // that will open the popup from that event,
    // and then re-close it when togglePopup() is fired.
    // So we wait a bit to let the original marker
    // to trigger its own popup and then check if it's open.
    setTimeout(() => {
      if (!popup.isOpen()) marker.togglePopup();
    }, 100);
  });
});

export default {keyForLog, upsertLog, updateLog, removeLog, showPopup, hide, show, fade, markerPointForLog};
