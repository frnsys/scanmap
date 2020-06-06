# config.py

# Version timestamp, which can be used
# to get frontend clients to reload for an update
VERSION = 'TEST'

# Maximum amount of logs to send
MAX_LOGS = 200

# Where the database and keys files are located
DB_PATH = '<STUB>'
KEYS_FILE = 'tests/app/data/keys.yml'

# For querying coordinates for locations
GOOGLE_PLACES_API_KEY = '<STUB>'

LOCATIONS = {
    'NY': {
        'CAMERAS': 'tests/app/data/cams/ny.json',
        'MAP': {
            'CENTER': [-73.96161699999999, 40.678806],
            'ZOOM': 12
        },
        'SEARCH': {
            'FILTER': 'NY',
            'CENTER': [40.678806,-73.96161699999999],
            'RADIUS': 15000
        },
        'INFO': ''
    }
}
