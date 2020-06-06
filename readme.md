App is broken down by location, which is just a key identifying a location, e.g. `NY`.

You need three files to configure the application:

- `config.py`: general app/maps configuration options
- `config.js`: mostly for setting up mapbox
- `keys.yml`: adding/revoking keys for adding to maps

Notation here is `<description:example value>`.

```
# config.py

# Version timestamp, which can be used
# to get frontend clients to reload for an update
VERSION = '1591117380'

# Maximum amount of logs to send
MAX_LOGS = 200

# Where the database and keys files are located
DB_PATH = 'data/logs.db'
KEYS_FILE = 'data/keys.yml'

# Redis instance for SSE
REDIS_URL = 'redis://localhost'

# For querying coordinates for locations
GOOGLE_PLACES_API_KEY = '<key>'

LOCATIONS = {
    '<location key:NY>': {
        'LIVE': <display map link on homepage:True>,
        'CAMERAS': '<traffic cam file:data/cams/ny.json>',
        'MAP_CENTER': <lnglat:[-73.96161699999999, 40.678806]>,
        'SEARCH': {
            'FILTER': '<address filter term: NY >',
            'CENTER': <latlng:[40.678806,-73.96161699999999]>,
            'RADIUS': <search radius in m:15000>
        },
        'INFO': '<additional info to include>'
    }
}
```

```
# keys.yml
<location key:NY>:
    prime: # admin keys
        - <auth key>
    write: # regular write access keys
        - <auth key>
        - <auth key>
```

---

# pre-reqs

**redis**

- handles the pub/sub for server sent events.
- with docker: `docker run --name scanmap-redis -p 6379:6379 -d redis`

# Running

1. Install frontend deps: `npm install -d`
2. Install backend deps: `pip install -r requirements.txt`
3. Start frontend: `npm start`
4. Start backend: `gunicorn server:app --worker-class gevent --bind 127.0.0.1:8000`

## Tests

Run `PYTHONPATH="$(pwd)/tests/app:$(pwd)" pytest` from the project root

# Deployment notes

- Ensure that proper permissions/ownership are set for files that are written to (e.g. `data/keys.yml`)

---

Example `config.py`:

```
VERSION = '1591117380'
MAX_LOGS = 200
DB_PATH = 'data/logs.db'
KEYS_FILE = 'data/keys.yml'
GOOGLE_PLACES_API_KEY = '<KEY>'
REDIS_URL = 'redis://localhost'
DEBUG = False

LOCATIONS = {
    'NY': {
        'LIVE': True,
        'CAMERAS': 'cams/ny.json',
        'MAP': {
            'CENTER': [-73.96161699999999, 40.678806],
            'ZOOM': 12
        },
        'SEARCH': {
            'FILTER': ' NY ',
            'CENTER': [40.678802, -73.95528399999999],
            'RADIUS': 15000 # in m
        },
        'INFO': ''
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
<location key:NY>:
    <type key:write>:
        - <auth key>
        - <auth key>
        - <auth key>
```
