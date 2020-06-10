import os

# For Flask-Cache. Allow testing with caching enabled.
CACHE_TYPE = 'simple'

# Version timestamp, which can be used
# to get frontend clients to reload for an update
VERSION = 'TEST'

# Maximum amount of logs to send
MAX_LOGS = 200

# Show only logs from within the past
LOGS_AFTER = {
    'days': 1
}

# Where the database and keys files are located
DB_PATH = ':memory:'   # Hack to prevent creating a dummy DB file
KEYS_FILE = os.devnull # Hack to prevent creating a dummy key file

# For querying coordinates for locations
GOOGLE_PLACES_API_KEY = '<STUB>'

LOCATIONS = {
    'NY': {
        'LIVE': True,
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
