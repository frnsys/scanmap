import config from '../config';

class Map {
  constructor(conf) {
    this.map = new mapboxgl.Map(conf);
    this.map.dragRotate.disable();
    this.map.touchZoomRotate.disableRotation();
    this.clickListeners = {};

    this.map.on('click', (e) => {
      Object.values(this.clickListeners).forEach((fn) => {
        fn(e.lngLat);
      });
    });
  }

  addClickListener(id, fn) {
    this.clickListeners[id] = fn;
  }

  removeClickListener(id) {
    delete this.clickListeners[id];
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
    if (opts.element) {
      let popup = new mapboxgl.Popup({
        offset: 25,
        ...(opts.popup || {})
      }).setDOMContent(opts.element);

      if (opts.onPopupOpen) {
        popup.on('open', () => opts.onPopupOpen(popup, marker));
      }
      if (opts.onPopupClose) {
        popup.on('close', () => opts.onPopupClose(popup, marker));
      }

      marker.setPopup(popup)
    }

    marker.addTo(this.map);
    return marker;
  }

  jumpTo(coords) {
    // Only zoom in, never out
    let zoom = this.map.getZoom();
    if (zoom < 14) {
      zoom = 14;
    }

    this.map.jumpTo({
      center: coords,
      zoom: zoom,
    });
  }

  enableDrawing() {
    this.draw = new MapboxDraw({
      displayControlsDefault: false
    });
    this.map.addControl(this.draw);
  }
}

// Singleton of map
mapboxgl.accessToken = config.MAPBOX_TOKEN;
const map = new Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    maxZoom: 18,
    minZoom: 10,
    zoom: MAP_ZOOM,
    center: MAP_CENTER
});

export default map;
