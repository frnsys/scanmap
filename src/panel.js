import {get, post, el} from './util';

const errEl = document.getElementById('panel-errors');
function showError(err) {
  errEl.innerText = err;
  errEl.style.display = 'block';
}

function addKey(type) {
  post('keys', {
    action: 'create',
    type: type
  }, (json) => {
    keyItem(json.key, type);
  }, KEY);
}

const keysEl = document.getElementById('keys');
const typeNames = {
  'write': 'write',
  'prime': 'admin'
};
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

function loadKeys() {
  get('keys', (json) => {
    Object.keys(json.keys).forEach((type) => json.keys[type].forEach((k) => keyItem(k, type)));
    document.getElementById('panel-main').style.display = 'block';

    get('log/pinned', (json) => {
      if (json.logs.length > 0) {
        document.getElementById('pinned').value = json.logs[0].data.text;
      }
    });
  }, KEY).catch((err) => {
    showError(err);
  });
}

let KEY;
document.getElementById('key').addEventListener('keydown', (ev) => {
  if (ev.key == 'Enter') {
    KEY = ev.target.value;
    ev.target.parentNode.removeChild(ev.target);
    loadKeys();
  }
});

document.getElementById('add-key').addEventListener('click', () => {
  addKey('write');
});

document.getElementById('add-prime-key').addEventListener('click', () => {
  addKey('prime');
});

document.getElementById('set-pinned').addEventListener('click', () => {
  let text = document.getElementById('pinned').value;
  if (text.length > 0) {
    let formData = new FormData();
    formData.set('text', text);
    post('log/pinned', formData, (json) => {
      if (json.success) {
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
