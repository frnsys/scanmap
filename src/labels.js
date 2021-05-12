import t from './i18n';

const LABELS = {
  'event': {
    'alert': '⚠',
    'police_presence':'👮',
    'units_requested':'🚓',
    'fire': '🔥',
    'prisoner_van': '🚐',
    'group': '🚩',
    'injury': '🩹',
    'barricade': '🚧',
    'aviation': '🚁',
    'aid': '⛑️',
    'military': '💂',
    'staging_area': '📡',
    'protestor_barricade': '🛡️',
    'arrests': '🚨',
    'far_right_group': '🐍',
    'other': '🔹',
  },
  'static': {
    'jail': '🔒',
    'camera': '👁️',
    'phone': '☎️',
    'police_bldg': '🛂',
    'military_bldg': '🏰',
    'staging_area': '📡',
    'other': '🔹',
  }
};

function showLegend() {
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
  Object.keys(all_labels).forEach((label) => {
    let el = document.createElement('span');
    el.innerText = `${all_labels[label]} ${t(label)}`;
    legendEl.appendChild(el);
  });
}

export {showLegend};
export default LABELS;
