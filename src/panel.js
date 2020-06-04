import {get, post, el} from './util';

const errEl = document.getElementById('panel-errors');
function showError(err) {
  errEl.innerText = err;
  errEl.style.display = 'block';
}

function addKey() {
  post('keys', {
    action: 'create'
  }, (json) => {
    keyItem(json.key);
  }, KEY);
}

const keysEl = document.getElementById('keys');
function keyItem(key) {
  let li = el({
    tag: 'li',
    innerText: key,
    children: [{
      tag: 'span',
      className: 'revoke-key action',
      innerText: 'revoke',
      on: {
        'click': () => {
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
    json.keys.forEach((k) => keyItem(k));
  }, KEY).catch((err) => {
    showError(err);
  });
}

let KEY;
document.getElementById('key').addEventListener('keydown', (ev) => {
  if (ev.key == 'Enter') {
    KEY = ev.target.value;
    ev.target.parentNode.removeChild(ev.target);
    document.getElementById('panel-main').style.display = 'block';
    loadKeys();
  }
});

document.getElementById('add-key').addEventListener('click', () => {
  addKey();
});
