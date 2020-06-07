function get(url, onSuccess, authKey) {
  return fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-AUTH': authKey
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
}

function post(url, data, onSuccess, authKey) {
  return fetch(url, {
    headers: {
      'X-AUTH': authKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify(data)
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

function debounce (fn, ms) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export {get, post, el, debounce};
