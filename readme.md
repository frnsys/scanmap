App is broken down by location, which is just a key identifying a location, e.g. `NY`.

Notation here is `<description:example value>`.

```
# config.py

# For querying coordinates for locations
GOOGLE_PLACES_API_KEY = '<key>'

LOCATIONS = {
    '<location key:NY>': {
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