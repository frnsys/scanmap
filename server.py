import json
import config
from app.db import Database
from app.cams import cameras
from app.keys import KeyRing
from app.geo import search_places
from flask_caching import Cache
from flask import Flask, abort, request, render_template, jsonify
from flask_sse import sse
from datetime import datetime, timezone

app = Flask(__name__)
app.config.from_object(config)
app.register_blueprint(sse, url_prefix='/location-stream')

kr = KeyRing(config.KEYS_FILE)
db = Database(config.DB_PATH)
cache = Cache(app)


def get_conf(loc):
    try:
        return config.LOCATIONS[loc]
    except KeyError:
        abort(404)


@app.route('/')
def index():
    return render_template('index.html',
            locations=[k for k in config.LOCATIONS.keys()
                if config.LOCATIONS[k]['LIVE']])


@app.route('/version')
@cache.cached(timeout=600)
def version():
    return jsonify(version=config.VERSION)


@app.route('/<location>/')
def map(location):
    conf = get_conf(location)
    return render_template('map.html', conf=conf, location=location)


@app.route('/<location>/cams')
def cams(location):
    cams = cameras.get(location, [])
    conf = get_conf(location)
    return jsonify(cams=cams)


@app.route('/<location>/log', methods=['GET', 'POST'])
@cache.cached(timeout=5,
              unless=lambda: request.method != 'GET',
              make_cache_key=lambda *args, **kwargs: '{}_{}'.format(
                  request.path,
                  request.headers.get('X-AUTH', 'noauth')))
def log(location):
    conf = get_conf(location)
    key = request.headers.get('X-AUTH')
    auth = kr.check_key(key, location)
    if request.method == 'POST':
        if not auth:
            abort(401)
        data = request.get_json()
        db.add(location, key, data)
        timestamp = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()
        cache.clear()
        sse.publish(json.dumps(
            {'data': data, 'timestamp': timestamp}), channel=location)
        return jsonify(success=True)
    else:
        # Limit amount of logs sent
        logs = db.logs(location, n=config.MAX_LOGS)

        # Strip submitter info
        # Check permissions
        for l in logs:
            submitter = l.pop('submitter')
            if auth and (auth == 'prime' or key.startswith(submitter)):
                l['permit'] = True
        return jsonify(logs=logs)


@app.route('/<location>/log/edit', methods=['POST'])
def edit_log(location):
    key = request.headers.get('X-AUTH')
    auth = kr.check_key(key, location)

    # Abort if not authed at all
    if not auth:
        abort(401)

    if request.method == 'POST':
        data = request.get_json()
        action = data['action']
        timestamp = data['timestamp']
        log = db.log(location, timestamp)
        if log is None:
            abort(404)

        # Abort if not prime key or not submitter
        if auth == 'prime' or key == log['submitter']:
            if action == 'delete':
                db.delete(location, timestamp)
                cache.clear()
                sse.publish('delete' , channel=location)
                return jsonify(success=True)
            elif action == 'update':
                for k, v in data['changes'].items():
                    log['data'][k] = v
                db.update(location, timestamp, log['data'])
                cache.clear()
                sse.publish('update' , channel=location)
                return jsonify(success=True)
            return jsonify(success=False, error='Unknown action')
        else:
            abort(401)
    return jsonify(success=False)


@app.route('/<location>/location', methods=['POST'])
def query_location(location):
    conf = get_conf(location)
    key = request.headers.get('X-AUTH')
    if not kr.check_key(key, location):
        abort(401)
    data = request.get_json()
    results = search_places(data['query'], conf)
    return jsonify(results=results)

# Panel


@app.route('/<location>/panel')
def panel(location):
    conf = get_conf(location)
    return render_template('panel.html', conf=conf)


@app.route('/<location>/keys', methods=['GET', 'POST'])
def keys(location):
    key = request.headers.get('X-AUTH')
    if not kr.check_key(key, location) == 'prime':
        abort(401)

    if request.method == 'POST':
        data = request.get_json()
        action = data['action']
        if action == 'revoke':
            kr.del_key(location, 'write', data['key'])
            return jsonify(success=True)
        elif action == 'create':
            key = kr.new_key()
            kr.add_key(location, 'write', key)
            return jsonify(success=True, key=key)
        return jsonify(success=False)

    keys = kr.get_keys(location).get('write')
    return jsonify(keys=keys)


@app.route('/<location>/checkauth', methods=['POST'])
def check_auth(location):
    key = request.headers.get('X-AUTH')
    typ = kr.check_key(key, location)
    return jsonify(success=bool(typ))


if __name__ == '__main__':
    app.run(debug=config.DEBUG, port=8800)
