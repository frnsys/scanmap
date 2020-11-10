"""
Data should be JSON, formatted like:

[{
    "location": "NY",
    "data": {
        "coordinates": "40.,-73.",
        "image": "foo.jpg",
        "label": "camera",
        "location": "X and Y",
        "text": "A surveillance camera"
    }
}, ...]

Note that you can place images in `data/uploads/` and reference them. For example, the image above references `data/uploads/foo.jpg`.
"""

import os
import sys
sys.path.insert(1, os.path.join(sys.path[0], '..'))

import json
import sqlite3
from shutil import copyfile
from app.db import Database
from datetime import datetime, timezone

# Load data
rows = json.load(open(sys.argv[1]))

# Back up db
now = datetime.utcnow()
backup_fname = '../data/backup/logs.{}.db'.format(now.isoformat())
copyfile('../data/logs.db', backup_fname)
print('Database backed up to {}'.format(backup_fname))

db = Database('../data/logs.db')
con, cur = db._con()
submitter = 'script'
for row in rows:
    timestamp = datetime.utcnow().timestamp()
    cur.execute(
        'INSERT INTO logs(timestamp, type, location, submitter, data) VALUES (?,?,?,?,?)',
        (timestamp, 'static', row['location'], submitter, json.dumps(row['data'])))
con.commit()
print('Finished')