App is broken down by location, which is just a key identifying a location, e.g. `NY`.

You need two files, one to configure the app (`config.py`) and one where you add/revoke keys for adding to maps (`keys.yml`).

Notation here is `<description:example value>`.

```
# config.py

# Version timestamp, which can be used
# to get frontend clients to reload for an update
VERSION = '1591117380'

# Maximum amount of logs to send
MAX_LOGS = 200

# For querying coordinates for locations
GOOGLE_PLACES_API_KEY = '<key>'

LOCATIONS = {
    '<location key:NY>': {
        'CAMERAS': '<traffic cam file:cams/ny.json>',
        'DB_FILE': '<db file name:logs.ny.jsonl>',
        'MAP_CENTER': <lnglat:[-73.96161699999999, 40.678806]>,
        'SEARCH': {
            'FILTER': '<address filter term: NY >',
            'CENTER': <latlng:[40.678806,-73.96161699999999]>,
            'RADIUS': <search radius in m:15000>
        },
        'INFO': '<extra info to show up on page>'
    }
}
```

```
# keys.yml
- <location key:NY>:
    - <auth key>
    - <auth key>
    - <auth key>
```

---

Example `config.py`:

```
VERSION = '1591117380'
MAX_LOGS = 200
GOOGLE_PLACES_API_KEY = '<KEY>'

LOCATIONS = {
    'NY': {
        'CAMERAS': 'cams/ny.json',
        'DB_FILE': 'logs.ny.jsonl',
        'MAP_CENTER': [-73.96161699999999, 40.678806],
        'SEARCH': {
            'FILTER': ' NY ',
            'CENTER': [40.678802, -73.95528399999999],
            'RADIUS': 15000 # in m
        },
        'INFO': ''
    }
}
```