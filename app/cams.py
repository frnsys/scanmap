import json
import config

cameras = {}
for loc, conf in config.LOCATIONS.items():
    if conf.get('CAMERAS'):
        cams = json.load(open(conf['CAMERAS']))
        cams = [{
            'lat': float(c['latitude']),
            'lng': float(c['longitude']),
            'url': c['img_url']
        } for c in cams]
        cameras[loc] = cams
