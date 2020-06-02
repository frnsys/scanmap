import json
import config
import requests
from functools import wraps
from datetime import datetime, timezone
from flask import Flask, abort, request, render_template, jsonify

app = Flask(__name__)

def get_conf(loc):
    try:
        return config.LOCATIONS[loc]
    except KeyError:
        abort(404)

@app.route('/')
def index():
    return render_template('index.html', locations=config.LOCATIONS.keys())

@app.route('/<location>/')
def map(location):
    conf = get_conf(location)
    return render_template('map.html', conf=conf)


@app.route('/<location>/log', methods=['GET', 'POST'])
def log(location):
    conf = get_conf(location)
    if request.method == 'POST':
        auth = request.headers.get('X-AUTH')
        if auth not in conf['AUTH_KEYS']:
            return abort(401)

        data = request.get_json()
        data['timestamp'] = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()
        data['submitter'] = auth
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
    if auth not in conf['AUTH_KEYS']:
        return abort(401)
    data = request.get_json()
    query = data['query']
    results = google_search_places(query, conf)
    results = [r for r in results if conf['FILTER'] in r['address']]
    return jsonify(results=results)


def google_search_places(query, conf):
    """Reference: <https://developers.google.com/places/web-service/search?hl=ru#nearby-search-and-text-search-responses>"""
    url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    params = {
        'key': config.GOOGLE_PLACES_API_KEY,
        'query': query,

        # Influence results
        'location': conf['SEARCH']['CENTER'],
        'radius': conf['SEARCH']['RADIUS']
    }
    resp = requests.get(url, params=params)
    data = resp.json()
    results = data['results']
    while 'next_page_token' in data:
        page_token = data['next_page_token']
        params = {
            'key': config.GOOGLE_PLACES_API_KEY,
            'pagetoken': page_token,
        }
        resp = requests.get(url, params=params)
        data = resp.json()
        results += data['results']
    return [{
        'source': 'google',
        'name': r['name'],
        'coordinates': [
            r['geometry']['location']['lat'],
            r['geometry']['location']['lng']
        ],
        'address': r['formatted_address']
    } for r in results]


if __name__ == '__main__':
    app.run(debug=config.DEBUG, port=8800)