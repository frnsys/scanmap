import t from './i18n';
import {api} from './util';
import config from '../config';

const LABELS = config.LABELS;

// Keep track of labels common for all maps
const commonEventLabels = Object.assign({}, LABELS['event']);

function renderLegend() {
  // Merge labels that have the same key,
  // to avoid duplicates
  const all_labels = {};
  Object.values(LABELS).forEach((labels) => {
    Object.keys(labels).forEach((k) => {
      all_labels[k] = labels[k];
    });
  });

  // Set up label legend
  const legendEl = document.getElementById('legend');
  while (legendEl.firstChild) {
    legendEl.removeChild(legendEl.lastChild);
  }
  Object.keys(all_labels).forEach((label) => {
    let el = document.createElement('span');
    el.innerText = `${all_labels[label]} ${t(label)}`;
    legendEl.appendChild(el);
  });
}

function updateLabels() {
  api.get('labels', ({labels}) => {
    // Clear all event labels
    for (var label in LABELS['event']) delete LABELS['event'][label];

    // Load in common labels
    LABELS['event'] = commonEventLabels;

    // Add/overwrite with custom labels
    Object.keys(labels).forEach((label) => {
      LABELS['event'][label] = labels[label];
    });

    renderLegend();
  });
}

export {renderLegend, updateLabels};
export default LABELS;
