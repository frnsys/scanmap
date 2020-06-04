import config
from app.db import Database
from app.cams import cameras
from app.keys import KeyRing
from app.geo import search_places
from flask import Flask, abort, request, render_template, jsonify

app = Flask(__name__)
kr = KeyRing(config.KEYS_FILE)
db = Database(config.DB_PATH)

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
    cams = cameras.get(location, [])
    conf = get_conf(location)
    return jsonify(cams=cams)

@app.route('/<location>/log', methods=['GET', 'POST'])
def log(location):
    conf = get_conf(location)
    if request.method == 'POST':
        auth = request.headers.get('X-AUTH')
        if not kr.check_key(auth, location):
            abort(401)

        data = request.get_json()
        db.add(auth, data)
        return jsonify(success=True)
    else:
        # Limit amount of logs sent
        logs = db.logs(location, n=config.MAX_LOGS)
        return jsonify(logs=logs)

@app.route('/<location>/location', methods=['POST'])
def query_location(location):
    conf = get_conf(location)
    auth = request.headers.get('X-AUTH')
    if not kr.check_key(auth, location):
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
    auth = request.headers.get('X-AUTH')
    if not kr.check_key(auth, location, typ='prime'):
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

    keys = kr.get_keys(location, typ='write')
    return jsonify(keys=keys)

@app.route('/<location>/log/edit', methods=['POST'])
def edit_log(location):
    auth = request.headers.get('X-AUTH')
    if not kr.check_key(auth, location, typ='prime'):
        abort(401)

    if request.method == 'POST':
        data = request.get_json()
        action = data['action']
        timestamp = data['timestamp']
        if action == 'delete':
            db.delete(location, timestamp)
            return jsonify(success=True)
        elif action == 'update':
            log = data['log']
            db.update(location, timestamp, log)
            return jsonify(success=True)
        return jsonify(success=False)
    return jsonify(success=False)


if __name__ == '__main__':
    app.run(debug=config.DEBUG, port=8800)