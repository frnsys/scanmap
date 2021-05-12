App is broken down by location, which is just a key identifying a location, e.g. `ny`.

# Overview

- Provides a map that can be collaboratively annotated in real-time.
- Map annotations are called "logs". There are three types of logs:
    - `event`:
        - Visible by default
        - Fade out if they are older than `config.LOGS_AFTER`
    - `static`
        - Hidden by default (shown when "Points of Interest" are toggled)
        - Permanent
    - `pinned`
        - A pinned announcement message
        - Only the latest one is shown
- Adding to the map requires an authentication key (which are kept in `data/keys.yml`).
    - There are two types of keys: `write` keys, which let the bearer add to the map; and admin (`prime`) keys, which can be used to create write keys.

---

# Configuration

The following API keys are required:

- Mapbox, for rendering the map
- Google Places, for searching/fuzzy matching locations

You need three files to configure the application:

- `config.py`: general app/maps configuration options
- `config.js`: mostly for setting up mapbox
- `data/keys.yml`: adding/revoking keys for adding to maps

Notation here is `<description:example value>`.

```
# config.py

# Version timestamp, which can be used
# to get frontend clients to reload for an update
VERSION = '1591117380'

# Maximum amount of logs to send
MAX_LOGS = 200

# Show only logs from within the past
LOGS_AFTER = {
    'days': 1
}

# Where the database and keys files are located
DB_PATH = 'data/logs.db'
KEYS_FILE = 'data/keys.yml'

# Redis instance for SSE
SSE_REDIS_URL = 'redis://localhost'

# For querying coordinates for locations
GOOGLE_PLACES_API_KEY = '<key>'

LOCATIONS = {
    '<location key:ny>': {
        'LIVE': <display map link on homepage:True>,
        'MAP_CENTER': <lonlat:[-73.96161699999999, 40.678806]>,
        'SEARCH': {
            'FILTER': '<address filter term: NY >',
            'CENTER': <latlon:[40.678806,-73.96161699999999]>,
        },
        'INFO': '<additional info to include>',

        # scanmap-specific config options
        'EXTRAS': {
            'CAMERAS': '<traffic cam file:data/cams/ny.json>',
            'HELICOPTERS': '<helicopters file:data/helis/ny.json>',
        },
    }
}
```

```
# data/keys.yml
<location key:ny>:
    prime: # admin keys
        - <auth key>
    write: # regular write access keys
        - <auth key>
        - <auth key>
```

Example `config.py`:

```
VERSION = '1591117380'

MAX_LOGS = 200
LOGS_AFTER = {
    'days': 1
}

DB_PATH = 'data/logs.db'
KEYS_FILE = 'data/keys.yml'
GOOGLE_PLACES_API_KEY = '<KEY>'
SSE_REDIS_URL = 'redis://localhost'
DEBUG = False

CACHE = {
    'CACHE_TYPE': 'simple'
}

LOCATIONS = {
    'ny': {
        'LIVE': True,
        'MAP': {
            'CENTER': [-73.96161699999999, 40.678806],
            'ZOOM': 12
        },
        'SEARCH': {
            'FILTER': ' NY ',
            'CENTER': [40.678802, -73.95528399999999],
        },
        'INFO': '',
        'EXTRAS': {
            'CAMERAS': 'data/cams/ny.json',
            'HELICOPTERS': 'data/helis/ny.json',
        },
    }
}
```

Example `config.js`:

```
export default {
  MAPBOX_TOKEN: '<mapbox token>'
};
```

Example `keys.yml`:

```
<location key:ny>:
    <type key:write>:
        - <auth key>
        - <auth key>
        - <auth key>
```

## Adding new cities

To add a new city:

1. Add a new entry to the `LOCATIONS` key in `config.py`
2. Add a new entry to `data/keys.yml`, specifying at least one initial `prime` key.

At minimum you need the coordinates for the center the map.

## Adding new languages

There is basic support for other languages (for the map labels).

You need to provide a translation file with the label translations in the `static/lang` folder. See `static/lang/es.json` for an example.

Note: `static/lang/en.json` is empty b/c the label default language is English.

UI elements that should be translated can have a "translate" attribute added to them, and then a corresponding entry in the translation file. For example:

```
<div class="foo" translate>No recent posts</div>
```

Then, in the translation file, e.g. `static/lang/es.json`:

```
{
    ...
    "No recent posts": "No hay publicaciones recientes",
    ...
}
```

## Adding new labels

Edit `LABELS` in `src/labels.js`. Make sure you update the translations in the language files (see above).

---

# Development

## Prereqs

- `redis`
    - handles the pub/sub for server sent events.
    - with docker: `docker run --name scanmap-redis -p 6379:6379 -d redis`

## Setup

1. Install frontend deps: `npm install -d`
2. Install backend deps: `pip install -r requirements.txt`

## Running

1. Start frontend: `npm start`
2. Start backend: `gunicorn server:app --worker-class gevent --bind 127.0.0.1:8000`

## Tests

Set the environment variable `SCANMAP_TEST_GOOGLE_PLACES_API_KEY=<token>`

Run `PYTHONPATH="$(pwd)/tests/app:$(pwd)" pytest` from the project root

If you need to debug the end-to-end/frontend tests, uncomment the `--observe` line in `tests/client/test_e2e.py`

---

# Deployment

Initial set up:

- basic server hardening
- create a non-root user (here named `friend`)

```
sudo apt install nginx python3 python3-dev python3-pip python3-setuptools libxml2-dev libxslt-dev --no-install-recommends
sudo pip3 install virtualenv==16.7.10

# Copy this repo to /srv/scanmap
sudo chown -R friend:www-data /srv/scanmap

# Set up python dependencies
virtualenv -p python3.8 env
source env/bin/activate
pip install -r requirements.txt

# Increase the number of file descriptors to support SSE
sudo tee -a /etc/systemd/system.conf > /dev/null <<EOT
DefaultLimitNOFILE=65536
DefaultLimitNOFILESoft=65536
EOT
sudo systemctl daemon-reload

# This may be irrelevant for systemd:
sudo tee -a /etc/security/limits.conf > /dev/null <<EOT
*               soft    nofile            65536
*               hard    nofile            65536
EOT

# Check that the limits are changed
systemctl show | grep NOFILE
```

## `systemd` units

`/etc/systemd/system/gunicorn.service`:

```
[Unit]
Description=gunicorn daemon
Requires=gunicorn.socket
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
RuntimeDirectory=gunicorn
WorkingDirectory=/srv/scanmap
ExecStart=/srv/scanmap/env/bin/gunicorn server:app --workers 12 --worker-class gevent --bind unix:/run/gunicorn.sock --log-level=info --capture-output --enable-stdio-inheritance
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/gunicorn.socket`:

```
[Unit]
Description=gunicorn socket

[Socket]
ListenStream=/run/gunicorn.sock
# Our service won't need permissions for the socket, since it
# inherits the file descriptor by socket activation
# only the nginx daemon will need access to the socket
User=www-data
# Optionally restrict the socket permissions even more.
# Mode=600

[Install]
WantedBy=sockets.target
```

`/etc/systemd/system/gunicorn-keepalive.service` (necessary to maintain SSE connections):

```
[Unit]
Description=scanmap sse keepalive process
PartOf=gunicorn.service
After=gunicorn.service

[Service]
Type=simple
User=www-data
Group=www-data
Restart=always
WorkingDirectory=/srv/scanmap
ExecStart=/srv/scanmap/env/bin/python -u keepalive.py

[Install]
WantedBy=gunicorn.service
```

Then enable:

```
systemctl daemon-reload
systemctl enable --now gunicorn.socket
systemctl enable --now gunicorn-keepalive
```

## `nginx`

`/etc/nginx/conf.d/site.conf`:

```
server {
    listen       80;
    server_name  domain.com;

    location / {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
    }
}
```

## Deployment notes

- Ensure that proper permissions/ownership are set for files that are written to (primarily `data/keys.yml` and `data/logs.db`)

---

# Other tips

Surveillance camera data from OpenStreetMap:

- First install

```
from OSMPythonTools.nominatim import Nominatim
from OSMPythonTools.overpass import Overpass, overpassQueryBuilder

overpass = Overpass()
nominatim = Nominatim()

nyc = nominatim.query('NYC')
query = overpassQueryBuilder(area=nyc.areaId(), elementType='node', selector='"man_made"="surveillance"', out='body')
results = overpass.query(query)
print(results.toJSON())
```

There are scripts that help you do this in `scripts/`:

1. Get data from OSM: `python osm_surveillance.py NYC ny`, which creates `output/surveillance__NYC_ny_....json`
2. Load data into scanmap: `python ingest_pois.py output/surveillance__NYC_ny....json`

---

# Adapting to other uses

You can adapt scanmap for other uses too. At its core scanmap is a real-time collaborative mapping system with a few extra things for how it is currently used (scanner tracking).

For the backend these extra parts are contained entirely in `server.py`. So to adapt the backend, you only need to change this file to suit your needs.

For the frontend these extra parts are defined in `src/extra` and loaded in `src/main.js`. You'll probably also want to update `src/labels.js` for whatever you need. This file not only defines icons for labels but also what labels can be used in the first place. The `LABELS` constant in the file is structured like so:

```
{
    <event type>: {
        <label>: <label icon>,
        ...
    },
    ...
}
```
