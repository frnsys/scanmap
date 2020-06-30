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

  toggleEl.addEventListener('change', (ev) => {
    if (ev.target.checked) {
      // Minimize network traffic,
      // only load precincts once
      if (!sourceLoaded) {
        map.addSource('precincts', source);
        map.addLayer(layer);
        map.addLayer({
          'id': 'poi-labels',
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
      }
    } else {
      map.setLayoutProperty('precincts', 'visibility', 'none');
    }
  });
}

export default setupPrecincts;
