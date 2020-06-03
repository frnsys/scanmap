import json
import yaml
import config
import requests
from datetime import datetime, timezone
from flask import Flask, abort, request, render_template, jsonify

app = Flask(__name__)

CAMERAS = {}
for loc, conf in config.LOCATIONS.items():
    if conf.get('CAMERAS'):
        cams = json.load(open(conf['CAMERAS']))
        cams = [{
            'lat': float(c['latitude']),
            'lng': float(c['longitude']),
            'url': c['img_url']
        } for c in cams]
        CAMERAS[loc] = cams


def check_key(key, loc):
    keys = yaml.load(open('keys.yml'))
    return key in keys.get(loc, [])

def get_conf(loc):
    try:
        return config.LOCATIONS[loc]
    except KeyError:
        abort(404)

@app.route('/')
def index():
    return render_template('index.html', locations=config.LOCATIONS.keys())

@app.route('/version')
def version():
    return jsonify(version=config.VERSION)

@app.route('/<location>/')
def map(location):
    conf = get_conf(location)
    return render_template('map.html', conf=conf, version=config.VERSION)

@app.route('/<location>/cams')
def cams(location):
    cameras = CAMERAS.get(location, [])
    conf = get_conf(location)
    return jsonify(cams=cameras)

@app.route('/<location>/log', methods=['GET', 'POST'])
def log(location):
    conf = get_conf(location)
    if request.method == 'POST':
        auth = request.headers.get('X-AUTH')
        if not check_key(auth, location):
            abort(401)

        data = request.get_json()
        data['submitter'] = auth
        data['timestamp'] = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()
        with open(conf['DB_FILE'], 'a') as f:
            f.write(json.dumps(data) + '\n')
        return jsonify(success=True)
    else:
        try:
            with open(conf['DB_FILE'], 'r') as f:
                logs = f.read().split('\n')
        except FileNotFoundError:
            logs = []
        return jsonify(logs=[json.loads(l) for l in logs if l])

@app.route('/<location>/location', methods=['POST'])
def query_location(location):
    conf = get_conf(location)
    auth = request.headers.get('X-AUTH')
    if not check_key(auth, location):
        abort(401)
    data = request.get_json()
    results = google_search_places(data['query'], conf)
    return jsonify(results=results)

def google_search_places(query, conf):
    """Reference: <https://developers.google.com/places/web-service/search?hl=ru#nearby-search-and-text-search-responses>"""
    params = {
        'key': config.GOOGLE_PLACES_API_KEY,
        'query': query,

        # Influence results
        'location': conf['SEARCH']['CENTER'],
        'radius': conf['SEARCH']['RADIUS']
    }

    # Not paginating results because we
    # only will show a few
    resp = requests.get(
            'https://maps.googleapis.com/maps/api/place/textsearch/json',
            params=params)
    data = resp.json()
    results = data['results']

    # Hard filter to keep search results relevant to the region
    results = [r for r in results
                if conf['SEARCH']['FILTER'] in r['formatted_address']]

    return [{
        'name': r['name'],
        'coordinates': [
            r['geometry']['location']['lat'],
            r['geometry']['location']['lng']
        ]
    } for r in results]


if __name__ == '__main__':
    app.run(debug=config.DEBUG, port=8800)