"""
Maintains SSE connections
and also triggers the disconnecting of stale clients
"""

import json
import config
from time import sleep
from server import app

while True:
    print('Pinging')
    with app.app_context():
        for location in config.LOCATIONS.keys():
            app.sse.publish(json.dumps({'keepalive': True}), channel=location)
    sleep(45)