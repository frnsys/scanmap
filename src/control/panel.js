/*
 * Backend panel,
 * mainly for key management
 */

import {api, el} from '../util';

// Show errors to user
let errTimeout;
const errEl = document.getElementById('panel-errors');
function showError(err) {
  if (errTimeout) clearTimeout(errTimeout);
  errEl.innerText = err;
  errEl.style.display = 'block';
  errTimeout = setTimeout(() => {
    errEl.style.display = 'none';
  }, 5000);
}

// Show logs of key deletion/creation
// and other important events
const logs = new Set();
const logsEl = document.getElementById('logs');
function loadLogs() {
  // Request and render logs
  api.get('panel/logs', (json) => {
    json.logs.forEach((log) => {
      // Avoid dupe logs
      if (logs.has(log.timestamp)) return;

      // Assemble log text
      let dt = new Date(log.timestamp*1000).toLocaleString('en-US', {
        day: '2-digit',
        year: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h24',
      });
      let text = `[${dt}] (Unspecified log)`;
      if (log.type == 'admin') {
        if (log.data.type == 'keys') {
          if (log.data.action == 'create') {
            text = `[${dt}] ${log.submitter} created ${log.data.target.type} key ${log.data.target.key}.`
          } else if (log.data.action == 'revoke') {
            text = `[${dt}] ${log.submitter} revoked key ${log.data.target.key}.`
          }
        } else if (log.data.type == 'labels') {
          if (log.data.action == 'create') {
            text = `[${dt}] ${log.submitter} created label ${log.data.target.label} with icon ${log.data.target.icon}.`
          } else if (log.data.action == 'hide') {
            text = `[${dt}] ${log.submitter} hid label ${log.data.target.label}.`
          } else if (log.data.action == 'unhide') {
            text = `[${dt}] ${log.submitter} unhid label ${log.data.target.label}.`
          } else if (log.data.action == 'edit') {
            text = `[${dt}] ${log.submitter} changed the icon of label ${log.data.target.label} to ${log.data.target.icon}.`
          }
        }

      } else if (log.type == 'pinned') {
        text = `[${dt}] ${log.submitter} updated pinned message to "${log.data.text}".`
      }

      // Render
      let li = el({
        tag: 'li',
        children: [{
          tag: 'p',
          innerText: text
        }]
      });
      logsEl.prepend(li);

      // Assume logs are unique by timestamp;
      // use to avoid duplicates
      logs.add(log.timestamp);
    });
  });
}

// Authentication
document.getElementById('key').addEventListener('keydown', (ev) => {
  if (ev.key == 'Enter') {
    api.authKey = ev.target.value;
    ev.target.parentNode.removeChild(ev.target);

    // We use the response to requesting keys
    // to check if the supplied key is valid
    loadKeys();
  }
});

// Update the pinned message
// (shown above the log feed on map pages)
document.getElementById('set-pinned').addEventListener('click', () => {
  let text = document.getElementById('pinned').value;
  if (text.length > 0) {
    let formData = new FormData();
    formData.set('text', text);
    api.post('log/pinned', formData, ({success}) => {
      if (success) {
        // Feedback on successful update
        // Janky, but fine for now
        let el = document.getElementById('set-pinned-status');
        el.innerText = 'Updated';
        setTimeout(() => {
          el.innerText = '';
        }, 1000);
      }
    }).catch((err) => showError(err));
  }
});


// Key management
// ========================================
const keysEl = document.getElementById('keys');
const typeNames = {
  'write': 'write',
  'prime': 'admin'
};

// Create a new key of the specified type
function addKey(type) {
  api.post('panel/keys', {
    action: 'create',
    type: type
  }, (json) => {
    keyItem(json.key, type);
  });
}

// Render a key
function keyItem(key, type) {
  let li = el({
    tag: 'li',
    innerText: `[${typeNames[type]}] ${key}`,
    className: `key-${type}`,
    children: [{
      tag: 'span',
      className: 'revoke-key action',
      innerText: 'revoke',
      on: {
        // Handler for revoking key
        click: () => {
          if (confirm(`Are you sure you want to revoke key "${key}"?`)) {
            api.post('panel/keys', {
              key: key,
              action: 'revoke'
            }, () => {
              console.log('revoked');
              li.parentNode.removeChild(li);
            });
          }
        }
      }
    }]
  });
  keysEl.appendChild(li);
}

// Load keys for this map
function loadKeys() {
  // This will fail if the user doesn't have a valid prime key
  api.get('panel/keys', (json) => {
    document.getElementById('panel-main').style.display = 'block';

    // Render keys
    Object.keys(json.keys).forEach((type) => json.keys[type].forEach((k) => keyItem(k, type)));

    // Also load the current pinned message
    api.get('log/pinned', (json) => {
      if (json.logs.length > 0) {
        document.getElementById('pinned').value = json.logs[0].data.text;
      }
    });

    loadLabels();

    // Lazy polling to load logs
    setInterval(() => loadLogs(), 10000);
    loadLogs();

  }).catch((err) => {
    showError(err);
  });
}

// Buttons to create new write/prime keys
document.getElementById('add-key').addEventListener('click', () => addKey('write'));
document.getElementById('add-prime-key').addEventListener('click', () => addKey('prime'));


// Label management
const labelsEl = document.getElementById('labels');

// Render a label
function labelItem(label, icon, hide) {
  let li = el({
    tag: 'li',
    className: hide ? 'hidden': '',
    children: [{
      tag: 'input',
      type: 'text',
      className: 'edit-label-icon',
      autocomplete: 'off',
      maxlength: 2,
      value: icon,
    }, {
      tag: 'span',
      innerText: label,
    }, {
      tag: 'span',
      className: 'hide-label action',
      innerText: hide ? 'unhide' : 'hide',
      on: {
        // Handler for un/hiding label
        click: (ev) => {
          api.post('panel/labels', {
            label: label,
            action: hide ? 'unhide' : 'hide'
          }, ({success}) => {
            if (success) {
              hide = !hide;
              if (hide) {
                li.classList.add('hidden')
                ev.target.innerText = 'unhide';
              } else {
                li.classList.remove('hidden')
                ev.target.innerText = 'hide';
              }
            }
          });
        }
      }
    }, {
      tag: 'span',
      className: 'edit-label action',
      innerText: 'update_icon',
      on: {
        // Handler for editing label icon
        click: (ev) => {
          let newIcon = li.querySelector('.edit-label-icon').value;
          if (icon != newIcon) {
            api.post('panel/labels', {
              label: label,
              icon: newIcon,
              action: 'edit'
            }, ({success}) => {
              if (success) {
                icon = newIcon;
              }
            });
          }
        }
      }
    }]
  });
  labelsEl.appendChild(li);
}

// Load labels for this map
function loadLabels() {
  // This will fail if the user doesn't have a valid prime key
  api.get('panel/labels', ({labels}) => {
    // Render labels
    Object.keys(labels).forEach((label) => {
      let {icon, hide} = labels[label];
      labelItem(label, icon, hide);
    });
  }).catch((err) => {
    showError(err);
  });
}

// Buttons to create new labels
document.getElementById('add-label').addEventListener('click', () => {
  let label = document.getElementById('label').value;
  let icon = document.getElementById('icon').value;
  api.post('panel/labels', {action: 'create', label, icon}, ({success}) => {
    if (success) {
      labelItem(label, icon, false);
    } else {
      showError('Failed to create label (label already exists).');
    }
  }).catch((err) => showError(err));
});
