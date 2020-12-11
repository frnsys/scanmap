/*
 * Backend panel,
 * mainly for key management
 */

import {get, post, el} from '../util';

// Show errors to user
const errEl = document.getElementById('panel-errors');
function showError(err) {
  errEl.innerText = err;
  errEl.style.display = 'block';
}

// Show logs of key deletion/creation
// and other important events
const logs = new Set();
const logsEl = document.getElementById('logs');
function loadLogs() {
  // Request and render logs
  get('panel/logs', (json) => {
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
  }, KEY);
}

// Authentication
let KEY;
document.getElementById('key').addEventListener('keydown', (ev) => {
  if (ev.key == 'Enter') {
    KEY = ev.target.value;
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
    post('log/pinned', formData, (json) => {
      if (json.success) {
        // Feedback on successful update
        // Janky, but fine for now
        let el = document.getElementById('set-pinned-status');
        el.innerText = 'Updated';
        setTimeout(() => {
          el.innerText = '';
        }, 1000);
      }
    }, KEY).catch((err) => showError(err));
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
  post('keys', {
    action: 'create',
    type: type
  }, (json) => {
    keyItem(json.key, type);
  }, KEY);
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
            post('keys', {
              key: key,
              action: 'revoke'
            }, () => {
              console.log('revoked');
              li.parentNode.removeChild(li);
            }, KEY);
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
  get('keys', (json) => {
    document.getElementById('panel-main').style.display = 'block';

    // Render keys
    Object.keys(json.keys).forEach((type) => json.keys[type].forEach((k) => keyItem(k, type)));

    // Also load the current pinned message
    get('log/pinned', (json) => {
      if (json.logs.length > 0) {
        document.getElementById('pinned').value = json.logs[0].data.text;
      }
    });

    // Lazy polling to load logs
    setInterval(() => loadLogs(), 10000);
    loadLogs();

  }, KEY).catch((err) => {
    showError(err);
  });
}

// Buttons to create new write/prime keys
document.getElementById('add-key').addEventListener('click', () => addKey('write'));
document.getElementById('add-prime-key').addEventListener('click', () => addKey('prime'));
