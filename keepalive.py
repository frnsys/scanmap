import json
import config
from time import sleep
from server import app, sse

while True:
    print('Pinging')
    with app.app_context():
        for location in config.LOCATIONS.keys():
            sse.publish(json.dumps({'keepalive': True}), channel=location)
    sleep(45)