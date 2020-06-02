function setupCams(map) {
  let camsLoaded = false;
  let camMarkers = [];

  document.getElementById('toggle-cams').addEventListener('click', (ev) => {
    if (ev.target.checked) {
      loadCams();
    } else {
      camMarkers.forEach((m) => {
        m.remove();
      });
    }
  });

  function loadCams() {
    if (!camsLoaded) {
      fetch('cams', {
         headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          method: 'GET'
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.cams.length > 0) {
              json.cams.forEach((cam) => {
                if (cam.url) {
                  let desc = `<img src="#" data-src="${cam.url}">`;
                  let className = 'marker marker-camera';
                  let coords = [cam['lng'], cam['lat']];
                  let popup = {
                    maxWidth: 'none'
                  };
                  let interval;
                  let marker = map.addMarker(coords, {desc, className, popup,
                    onPopupOpen: (popup) => {
                      let img = popup._content.querySelector('img');
                      if (img) {
                        let src = img.dataset.src;
                        img.src = src;
                        interval = setInterval(() => {
                          img.src = `${src}#${new Date().getTime()}`;
                        }, 5000);
                      }
                    },
                    onPopupClose: () => {
                      if (interval) clearInterval(interval);
                    }
                  });
                  camMarkers.push(marker);
                }
              });
            } else {
              document.getElementById('toggle-cams').innerHTML = 'No cameras for this region';
            }
          });
    } else {
      camMarkers.forEach()
    }
  }
}

export default setupCams;
