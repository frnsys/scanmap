function get(url, onSuccess) {
  return fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'GET'
  })
    .then((res) => res.json())
    .then((json) => onSuccess(json));
}

// Convenience function to create HTML elements
function el(spec) {
  let pa = document.createElement(spec.tag);
  let children = spec.children || [];
  delete spec.tag;
  delete spec.children;

  Object.keys(spec).forEach((k) => {
    pa[k] = spec[k];
  });

  children.forEach((ch) => {
    let e = el(ch);
    pa.appendChild(e);
  });
  return pa;
}

export {get, el};
