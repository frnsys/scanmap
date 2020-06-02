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
    if (opts.icon) {
      el.innerText = opts.icon;
      el.style.background = 'none';
    }

    let marker = new mapboxgl.Marker(el)
      .setLngLat(coords);

    // Setup popup
    if (opts.desc) {
      let popup = new mapboxgl.Popup({ offset: 25, ...(opts.popup || {}) })
        .setHTML(opts.desc);

      if (opts.onPopupOpen) {
        popup.on('open', () => opts.onPopupOpen(popup));
      }
      if (opts.onPopupClose) {
        popup.on('close', () => opts.onPopupClose(popup));
      }

      marker.setPopup(popup)
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
