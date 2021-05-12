import json
import config
import requests
from app import create_app, get_conf, cache
from flask import jsonify, send_from_directory, abort

app = create_app()

cameras = {}
for loc, conf in config.LOCATIONS.items():
    if conf.get('EXTRAS', {}).get('CAMERAS'):
        cams = json.load(open(conf['EXTRAS']['CAMERAS']))
        cams = [{
            'lat': float(c['latitude']),
            'lng': float(c['longitude']),
            'url': c['img_url']
        } for c in cams]
        cameras[loc] = cams

helicopters_config = {}
for loc, conf in config.LOCATIONS.items():
    if conf.get('EXTRAS', {}).get('HELICOPTERS'):
        items = json.load(open(conf['EXTRAS']['HELICOPTERS']))
        helicopters_config[loc] = items
        helicopters_config[loc]['filter'] = set(items['tails'].keys())

def get_helicopter_locations(location):
    if location not in helicopters_config:
        return []

    tails = helicopters_config[location]['tails']
    results = {
        tail: {
            'tail': tail,
            'url': meta['img_url'],
            'owner': meta['owner']
        } for tail, meta in tails.items()}

    url = 'https://data-live.flightradar24.com/zones/fcgi/feed.js'
    params = { 'bounds': helicopters_config[location]['bounds'] }
    headers = { 'User-Agent': 'Mozilla/5.0' }
    resp = requests.get(url, params=params, headers=headers)
    data = resp.json()
    for key, value in data.items():
        if not isinstance(value, list):
            continue
        lat, lng, tail = value[1], value[2], value[16]
        if tail not in helicopters_config[location]['filter']:
            continue
        meta = helicopters_config[location]['tails'][tail]
        results[tail]['lat'] = lat
        results[tail]['lng'] = lng
    return list(results.values())

@app.route('/<location>/cams')
def cams(location):
    conf = get_conf(location) # Check for 404
    cams = cameras.get(location, [])
    return jsonify(cams=cams)

@app.route('/<location>/precincts')
def precincts(location):
    conf = get_conf(location)
    extras = conf.get('EXTRAS', {})
    filename = extras.get('PRECINCTS')
    if filename is None:
        abort(404)
    return send_from_directory('../data/precincts', filename)

# Cache timeout matches flightradar24 frontend
@app.route('/<location>/helis')
@cache.cached(timeout=8)
def helis(location):
    conf = get_conf(location) # Check for 404
    items = get_helicopter_locations(location)
    return jsonify(helis=items)


if __name__ == '__main__':
    import config
    app.run(debug=config.DEBUG, port=8800)
