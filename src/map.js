import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

class Map {
  constructor(conf, onClick) {
    this.map = new mapboxgl.Map(conf);
    this.map.dragRotate.disable();
    this.map.touchZoomRotate.disableRotation();

    this.map.on('click', function(e) {
      onClick(e.lngLat);
    });
  }

  addMarker(coords, opts) {
    opts = opts || {};

    let el = document.createElement('div');
    el.className = opts.className || 'marker';

    let marker = new mapboxgl.Marker(el)
      .setLngLat(coords);

    if (opts.desc) {
      marker.setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML(opts.desc))
    }

    marker.addTo(this.map);
    return marker;
  }

  jumpTo(coords) {
    this.map.jumpTo({
      center: coords,
      zoom: 14,
    });
  }
}

export default Map;
