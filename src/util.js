// Convenience function to create HTML elements
function el(spec) {
  let pa = document.createElement(spec.tag);
  let children = spec.children || [];
  delete spec.tag;
  delete spec.children;

  let events = spec.on || {};
  Object.keys(events).forEach((ev) => {
    pa.addEventListener(ev, events[ev]);
  });
  delete spec.on;

  let dataset = spec.dataset || {};
  Object.keys(dataset).forEach((k) => {
    pa.dataset[k] = dataset[k];
  });
  delete spec.dataset;

  Object.keys(spec).forEach((k) => {
    pa[k] = spec[k];
  });

  children.forEach((ch) => {
    let e = ch instanceof HTMLElement ? ch : el(ch);
    pa.appendChild(e);
  });
  return pa;
}

// Interface to the backend
const api = {
  authKey: '',

  get(url, onSuccess) {
    return fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-AUTH': this.authKey
      },
      method: 'GET'
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status == 401) {
            throw new Error('Unauthorized');
          } else {
            throw new Error(`Response ${res.status}`);
          }
        }
        return res.json();
      })
      .then(onSuccess);
  },

  post(url, data, onSuccess) {
    let form = data instanceof FormData;
    let headers = {
        'X-AUTH': this.authKey,
        'Accept': 'application/json',
    };
    if (!form) headers['Content-Type'] = 'application/json';
    return fetch(url, {
      headers: headers,
      method: 'POST',
      body: form ? data : JSON.stringify(data)
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status == 401) {
            throw new Error('Unauthorized');
          } else {
            throw new Error(`Response ${res.status}`);
          }
        }
        return res.json();
      })
      .then(onSuccess);
  }
};

// https://stackoverflow.com/a/8943487/1097920
const urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
function linkify(text) {
  return text.replace(urlRegex, function(url) {
    return `<a target="_blank" href="${url}">${url}</a>`;
  });
}

function sanitize(html) {
   let doc = new DOMParser().parseFromString(html, 'text/html');
   return doc.body.textContent || "";
}

function processText(text) {
  return linkify(sanitize(text));
}

export {api, el, processText};
