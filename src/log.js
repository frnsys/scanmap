import map from './map';
import LABELS from './labels';
import markers from './markers';
import {api, el} from './util';
import form from './control/form';

// TODO
// This class is a little weird:
// because we just re-create these objects on each refresh,
// we can't rely on the data attached to the object for the
// canonical version of its state...instead we use data
// attributes on the HTML element as the source of truth.
// That's why there are these weird statements like:
//     if (ev.target.closest('.logitem').dataset.permit == 'true') { ... }
// Instead of just:
//     if (this.permit) { ... }
//
// To give an example of why this is troublesome:
// 1. Data refresh and creates log object A with element EL
// 2. Next data refresh destroys log object A and creates log object B, which
//    both refer to the same log (i.e. A.id == B.id). B, however, still uses
//    element EL (the element itself isn't recreated).
// 3. If EL has an event listener that refers to `this`, that refers to A, which
//    is stale. B has the most up-to-date state.
// This should be an easy thing to fix (update existing logs instead of replacing them)
// and I'll try to get to it after this refactor
// Then we can also potentially cache things like the markerPoint polylabel calculation
class Log {
  constructor(data) {
    Object.keys(data).forEach((k) => {
      this[k] = data[k];
    });
    this.el = document.getElementById(this.id);
    this.icon = this.label ? LABELS[this.type][this.label] : null;
    this.labelText = this.label ? `${this.icon} ${this.label} @ ` : '';
  }

  // TODO Eventually replace reading from the element dataset, see note above
  latestCoords() {
    return this.el.dataset.coords
      .split(';').map(
        (pt) => pt.split(',').map((c) => parseFloat(c)).reverse());
  }

  render() {
    // Update existing
    if (this.el) {
      // TODO See note above. Have to recompute
      // marker key because this object didn't exist before this update
      this.markerKey = markers.keyForLog(this);

      this.el.dataset.permit = this.permit || false;
      this.el.querySelector('.logitem-text').innerText = this.text;
      this.el.querySelector('.logitem-location').innerText = this.location;

      // Update label and marker if needed
      let labelEl = this.el.querySelector('.logitem-label');
      if (labelEl.dataset.label != this.label) {
        labelEl.dataset.label = this.label;
        labelEl.innerText = this.labelText;
      }

      // Move marker if necessary
      if (this.el.dataset.coords != this.coordinates) {
        // Remove existing marker
        markers.removeLog(this);

        // Add to new marker
        this.el.dataset.coords = this.coordinates;
        this.markerKey = markers.keyForLog(this);
        markers.upsertLog(this);

      // Otherwise just update
      } else {
        markers.updateLog(this);
      }
      return false;

    // Create new
    } else {
      this.el = el({
        id: this.id,
        tag: 'div',
        className: 'logitem',
        dataset: {
          permit: this.permit || false,
          coords: this.coordinates
        },
        children: [{
          tag: 'div',
          className: 'logitem-log',
          children: [{
            tag: 'div',
            className: 'logitem-when',
            innerText: this.dt,
          }, {
            tag: 'div',
            className: 'logitem-meta',
            children: [{
              tag: 'span',
              className: 'logitem-label',
              innerText: this.labelText,
              dataset: {
                label: this.label
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
                children: Object.keys(LABELS[this.type]).map((label) => ({
                  tag: 'option',
                  innerText: `${LABELS[this.type][label]} ${label}`,
                  value: label,
                  selected: label == this.label
                })),
                on: {
                  input: (ev) => {
                    let newLabel = ev.target.value;
                    api.post('log/edit', {
                      timestamp: this._id,
                      action: 'update',
                      changes: {
                        label: ev.target.value
                      }
                    }, () => {
                      let text = newLabel && newLabel !== 'other' ? `${LABELS[this.type][newLabel]} ${newLabel} @ ` : '';
                      let labelEl = ev.target.closest('.logitem').querySelector('.logitem-label');
                      labelEl.innerText = text;
                      labelEl.style.display = 'inline';
                      ev.target.closest('.logitem-label-input').style.display = 'none';
                    });
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
              innerText: this.location,
              on: {
                dblclick: (ev) => {
                  if (ev.target.closest('.logitem').dataset.permit == 'true') {
                    let inp = ev.target.parentNode.querySelector('.logitem-location-input');
                    let can = ev.target.parentNode.querySelector('.logitem-location-edit-cancel');
                    let coords = ev.target.parentNode.querySelector('.logitem-coords');
                    map.addClickListener(this.id, (coord) => {
                      coords.value = `${coord.lat},${coord.lng}`;
                      form.previewCoords([coord.lng, coord.lat]);
                    });
                    inp.style.display = 'inline';
                    can.style.display = 'inline';
                    coords.style.display = 'block';
                    inp.value = this.location;
                    inp.focus();
                    ev.target.style.display = 'none';
                  }
                }
              }
            }, {
              tag: 'input',
              type: 'text',
              className: 'logitem-location-input',
              value: this.location,
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
                    map.removeClickListener(this.id);
                    api.post('log/edit', {
                      timestamp: this._id,
                      action: 'update',
                      changes: {
                        location: inp.value,
                        coordinates: coords.value
                      }
                    }, () => {
                      el.innerText = inp.value;
                    });
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
                  coords.value = this.coordinates,
                  inp.style.display = 'none';
                  can.style.display = 'none';
                  coords.style.display = 'none';
                  el.style.display = 'inline';
                  map.removeClickListener(this.id);
                }
              }
            }, {
              tag: 'input',
              type: 'text',
              readonly: true,
              className: 'logitem-coords',
              value: this.coordinates
            }]
          }, {
            tag: 'div',
            className: 'logitem-text',
            innerText: this.text,
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
            value: this.text,
            on: {
              keydown: (ev) => {
                if (ev.key == 'Enter') {
                  let inp = ev.target
                  let el = inp.parentNode.querySelector('.logitem-text');
                  inp.style.display = 'none';
                  el.style.display = 'block';

                  api.post('log/edit', {
                    timestamp: this._id,
                    action: 'update',
                    changes: {
                      text: inp.value
                    }
                  }, () => {
                    el.innerText = inp.value;
                  });
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
                api.post('log/edit', {
                  timestamp: this._id,
                  action: 'delete'
                }, () => {
                  this.el.parentNode.removeChild(this.el);
                  markers.removeLog(this);
                });
              }
            }
          }
        }]
      });

      // Create new marker or add to existing
      this.markerKey = markers.keyForLog(this);
      markers.upsertLog(this);

      // Jump to marker on click
      this.el.addEventListener('click', () => {
        let coords = markers.markerPointForLog(this);
        map.jumpTo(coords);
        markers.showPopup(this);
        if (this.coords.length > 1) {
          let coords = this.latestCoords();
          let bounds = coords.reduce((bounds, coord) => bounds.extend(coord),
            new mapboxgl.LngLatBounds(coords[0], coords[0]));
            map.map.fitBounds(bounds, {
              padding: 20
            });
        }
      });
      return true;
    }
  }
}

export default Log;
