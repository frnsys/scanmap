const toggleEl = document.getElementById('toggle-precincts');

function setupPrecincts(map) {
  map = map.map;
  let source = {
    'type': 'geojson',
    'data': 'precincts'
  };
  let layer = {
    'id': 'precincts',
    'type': 'fill',
    'source': 'precincts',
    'paint': {
      'fill-color': 'rgba(66,133,244,0.2)',
      'fill-outline-color': '#0000ff'
    }
  };
  let sourceLoaded = false;

  map.on('click', 'precincts', function(ev) {
    console.log(ev);
  });

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
        map.addLayer(layer);
        map.addLayer({
          'id': 'precinct-labels',
          'type': 'symbol',
          'source': 'precincts',
          'layout': {
            'text-field': ['get', 'Precinct'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto'
          }
        });
        sourceLoaded = true;
      } else {
        map.setLayoutProperty('precincts', 'visibility', 'visible');
        map.setLayoutProperty('precinct-labels', 'visibility', 'visible');
      }
    } else {
      map.setLayoutProperty('precincts', 'visibility', 'none');
      map.setLayoutProperty('precinct-labels', 'visibility', 'none');
    }
  });
}

export default setupPrecincts;
