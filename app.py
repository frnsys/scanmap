import json
import config
import requests
from functools import wraps
from datetime import datetime, timezone
from flask import Flask, abort, request, render_template, jsonify

app = Flask(__name__)


@app.route('/')
def map():
    return render_template('map.html')


@app.route('/log', methods=['GET', 'POST'])
def log():
    if request.method == 'POST':
        auth = request.headers.get('X-AUTH')
        if auth not in config.AUTH_KEYS:
            return abort(401)

        data = request.get_json()
        data['timestamp'] = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()
        with open(config.DB_FILE, 'a') as f:
            f.write(json.dumps(data) + '\n')
        return jsonify(success=True)
    else:
        with open(config.DB_FILE, 'r') as f:
            logs = f.read().split('\n')
        return jsonify(logs=[json.loads(l) for l in logs if l])


@app.route('/location', methods=['POST'])
def query_location():
    auth = request.headers.get('X-AUTH')
    if auth not in config.AUTH_KEYS:
        return abort(401)
    data = request.get_json()
    query = data['query']
    results = google_search_places(query)
    # Filter to NY
    results = [r for r in results if ' NY ' in r['address']]
    return jsonify(results=results)


def google_search_places(query):
    """Reference: <https://developers.google.com/places/web-service/search?hl=ru#nearby-search-and-text-search-responses>"""
    url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    params = {
        'key': config.GOOGLE_PLACES_API_KEY,
        'query': query,

        # Limit to NYC
        'location': [40.678802, -73.95528399999999],
        'radius': 15000
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