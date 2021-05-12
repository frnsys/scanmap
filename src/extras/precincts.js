/*
 * Shows precinct boundaries on the map
 */

const toggleEl = document.getElementById('toggle-precincts');
const layers = ['precincts', 'precincts-labels', 'precincts-outlines'];

function setupPrecincts(map) {
  if (!toggleEl) return;

  map = map.map;
  let source = {
    'type': 'geojson',
    'data': 'precincts'
  };
  let sourceLoaded = false;

  map.on('error', (ev) => {
    if (ev.error.status == 404) {
      if (ev.sourceId == 'precincts') {
        toggleEl.innerHTML = 'No precinct data for this region';
      }
    }
  });

  toggleEl.addEventListener('change', (ev) => {
    if (ev.target.checked) {
      // Minimize network traffic,
      // only load precincts once
      if (!sourceLoaded) {
        map.addSource('precincts', source);
        map.addLayer({
          'id': 'precincts',
          'type': 'fill',
          'source': 'precincts',
          'paint': {
            'fill-color': ['get', 'fill'],
            'fill-opacity': 0.5,
            'fill-outline-color': '#ffffff'
          }
        });
        map.addLayer({
          'id': 'precincts-labels',
          'type': 'symbol',
          'source': 'precincts',
          'layout': {
            'text-field': ['get', 'Precinct'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 32
          }
        });
        map.addLayer({
          'id': 'precinct-outlines',
          'type': 'line',
          'source': 'precincts',
          'paint': {
            'line-width': 2,
            'line-color': '#ffffff'
          }
        });
        sourceLoaded = true;
      } else {
        layers.forEach((l) => map.setLayoutProperty(l, 'visibility', 'visible'));
      }
    } else {
      layers.forEach((l) => map.setLayoutProperty(l, 'visibility', 'none'));
    }
  });
}

export default setupPrecincts;
