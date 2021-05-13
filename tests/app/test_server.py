from app.db import Database
from app.keys import KeyRing
from app.labels import LabelManager
from datetime import datetime, timezone
import json
import pytest
import requests
import tempfile

class MockResponse:
    def __init__(self, response_file):
        self.response_path = 'tests/app/data/responses/{}.json'.format(response_file)

    def json(self):
        with open(self.response_path, mode='r') as f:
            return json.load(f)

class MockSSE:
    def __init__(self):
        self.publish_called = 0

    def publish(self, *args, **kwargs):
        self.publish_called += 1

@pytest.fixture
def log_in_db():
    from app import routes

    routes.db.add(
        'event',
        'ny',
        'WRITE',
        {'text': 'TEST', 'location': 'X AND Y ST', 'coordinates': '0,0', 'label': 'other'})

    yield routes.db.logs('ny', 1)[0]

@pytest.fixture
def admin_log_in_db():
    from app import routes

    routes.db.add(
        'admin',
        'ny',
        'WRITE',
        {'text': 'TEST', 'location': 'X AND Y ST', 'coordinates': '0,0', 'label': 'other'})

    yield routes.db.logs('ny', 1, type='admin')[0]


@pytest.fixture
def sse(monkeypatch):
    from app import routes

    mock = MockSSE()

    monkeypatch.setattr(routes, 'sse', mock)

    yield mock

@pytest.fixture()
def client(monkeypatch):
    # Copy over the test keys to the temporary key file
    keyf = tempfile.NamedTemporaryFile()
    with open('tests/app/data/keys.yml', mode='rb') as testkeyf:
        keyf.write(testkeyf.read())
        keyf.flush()

    labelsf = tempfile.NamedTemporaryFile()
    with open('tests/app/data/labels.yml', mode='rb') as testlabelsf:
        labelsf.write(testlabelsf.read())
        labelsf.flush()

    dbf = tempfile.NamedTemporaryFile()
    from app import routes, create_app

    # Stub key ring and database
    monkeypatch.setattr(routes, 'kr', KeyRing(keyf.name))
    monkeypatch.setattr(routes, 'db', Database(dbf.name))
    monkeypatch.setattr(routes, 'lm', LabelManager(labelsf.name))

    import server
    server.app.config['TESTING'] = True
    yield server.app.test_client()

    keyf.close()
    labelsf.close()
    dbf.close()

# ---------------------
# ---------------------
# ---  GET /version ---
# ---------------------
# ---------------------

def test_get_version(client):
    """Tests version route to ensure json body is expected"""

    version_response = client.get('/version')

    assert(version_response.status_code == 200)
    assert(version_response.is_json)
    assert('version' in version_response.get_json())

    # Sanity check to ensure the config that's being used is
    # the one defined in tests/app/config.py.
    assert(version_response.get_json()['version'] == 'TEST')

# -------------------------
# -------------------------
# ---  GET /<location>/ ---

# -------------------------
# -------------------------

def test_get_map_location(client):
    """Tests getting a known location"""

    map_response = client.get('/ny/')

    assert(map_response.status_code == 200)

def test_get_unknown_map_location(client):
    """Tests getting an unknown map location"""

    map_response = client.get('/BOGUS/')

    assert(map_response.status_code == 404)

# -----------------------------
# -----------------------------
# ---  GET /<location>/cams ---
# -----------------------------
# -----------------------------

def test_get_cams(client):
    """Tests getting cams"""

    cams_response = client.get('/ny/cams')

    assert(cams_response.status_code == 200)

def test_get_cams_unknown_location(client):
    """Tests getting cams from an unknown location"""

    cams_response = client.get('/YN/cams')

    assert(cams_response.status_code == 404)

# ----------------------------------
# ----------------------------------
# ---  GET, POST /<location>/log ---
# ----------------------------------
# ----------------------------------

def test_get_log(client, log_in_db):
    """Tests getting logs without auth"""

    log_response = client.get('/ny/log/event')

    assert(log_response.status_code == 200)
    assert(len(log_response.get_json()['logs']) == 1)

def test_get_log_unknown_location(client, log_in_db):
    """Tests getting logs with unknown location"""

    log_response = client.get('/YN/log/event')

    assert(log_response.status_code == 404)

def test_get_log_hit_cache(client, sse, log_in_db):
    """Tests getting logs populated cache"""

    from app import routes

    log_response = client.get('/ny/log/event')

    assert(log_response.status_code == 200)

    cached = routes.cache.get('/ny/log/event_noauth')

    assert(cached.status_code == 200)
    assert(len(cached.get_json()['logs']) == 1)

def test_new_log_unauthorized(client, log_in_db):
    """Tests adding log without a key"""

    log_response = client.post('/ny/log/event')

    assert(log_response.status_code == 401)

def test_new_log_ok(client, sse, log_in_db):
    """Tests adding a new log record"""

    from app import routes

    log_response = client.post(
        '/ny/log/event',
        headers={'X-AUTH': 'WRITE'},
        json={'text': 'TEST', 'location': 'A AND B ST', 'coordinates': '0,0', 'label': 'other'})

    assert(log_response.status_code == 200)
    assert(log_response.get_json() == {'success': True})
    assert(sse.publish_called)
    assert(len(routes.db.logs('ny', 10)) == 2)

def test_new_log_no_cache(client, sse, log_in_db):
    """Tests adding a new log doesn't populate cache"""

    from app import routes

    log_response = client.post(
        '/ny/log/event',
        headers={'X-AUTH': 'WRITE'},
        json={'text': 'TEST', 'location': 'A AND B ST', 'coordinates': '0,0', 'label': 'other'})

    assert(log_response.status_code == 200)

    cached = routes.cache.get('/ny/log/event_WRITE')

    assert(cached == None)

def test_get_log_admin(client, log_in_db):
    """Tests getting admin logs"""

    log_response = client.get('/ny/log/admin')
    assert(log_response.status_code == 400)

    log_response = client.get('/ny/log/admin/all')
    assert(log_response.status_code == 400)

def test_new_log_admin(client, sse, log_in_db):
    """Tests adding a new admin log record"""

    from app import routes

    log_response = client.post(
        '/ny/log/admin',
        headers={'X-AUTH': 'WRITE'},
        json={'text': 'TEST', 'location': 'A AND B ST', 'coordinates': '0,0', 'label': 'other'})

    assert(log_response.status_code == 400)


# ----------------------------------
# ----------------------------------
# ---  POST /<location>/log/edit ---
# ----------------------------------
# ----------------------------------

def test_edit_log_unauthorized_key(client, sse, log_in_db):
    """Tests editing a log file with an unauthorized key"""

    edit_log_response = client.post('/ny/log/edit', headers={'X-AUTH': 'BOGUS'})

    assert(edit_log_response.status_code == 401)

def test_edit_log_bad_payload(client, sse, log_in_db):
    """Tests edit log route with badly formed payload"""

    with pytest.raises(KeyError):
        edit_log_response = client.post(
            '/ny/log/edit',
            headers={'X-AUTH': 'PRIME'},
            json={'bogus': ''})

def test_edit_log_unknown_action(client, sse, log_in_db):
    """Tests edit log with an unknown action"""

    edit_log_response = client.post(
        '/ny/log/edit',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'bogus', 'timestamp': log_in_db['timestamp']})

    assert(edit_log_response.status_code == 200)
    assert(edit_log_response.get_json() == {'success': False, 'error': 'Unknown action'})

def test_edit_log_delete(client, sse, log_in_db):
    """Tests deleting a log record"""

    edit_log_response = client.post(
        '/ny/log/edit',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'delete', 'timestamp': log_in_db['timestamp']})

    assert(edit_log_response.status_code == 200)
    assert(edit_log_response.get_json() == {'success': True})
    assert(sse.publish_called)

def test_edit_log_update(client, sse, log_in_db):
    """Tests updating a log record"""

    from app import routes

    request_body = {
        'action': 'update',
        'timestamp': log_in_db['timestamp'],
        'changes': {'location': 'NEW ADDRESS'}
    }

    edit_log_response = client.post(
        '/ny/log/edit',
        headers={'X-AUTH': 'WRITE'},
        json=request_body)

    assert(edit_log_response.status_code == 200)
    assert(edit_log_response.get_json() == {'success': True})
    assert(sse.publish_called)
    assert(
        routes.db.log('ny', log_in_db['timestamp'])['data']['location'] == 'NEW ADDRESS'
    )

def test_edit_log_editor_is_not_submitter(client, sse, log_in_db):
    """Tests updating a log record with a key that differs from the submitter's key"""

    from app import routes

    routes.kr.add_key('ny', 'write', 'WRITE_2')

    request_body = {
        'action': 'update',
        'timestamp': log_in_db['timestamp'],
        'changes': {'location': 'NEW ADDRESS'}
    }

    edit_log_response = client.post(
        '/ny/log/edit',
        headers={'X-AUTH': 'WRITE_2'},
        json=request_body)

    assert(edit_log_response.status_code == 401)

def test_edit_admin_log_delete(client, sse, admin_log_in_db):
    """Tests deleting an admin log record"""

    edit_log_response = client.post(
        '/ny/log/edit',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'delete', 'timestamp': admin_log_in_db['timestamp']})

    assert(edit_log_response.status_code == 400)

def test_edit_admin_log_update(client, sse, admin_log_in_db):
    """Tests updating an admin log record"""

    edit_log_response = client.post(
        '/ny/log/edit',
        headers={'X-AUTH': 'PRIME'},
        json={
            'action': 'update',
            'timestamp': admin_log_in_db['timestamp'],
            'changes': {'location': 'NEW ADDRESS'}
        })

    assert(edit_log_response.status_code == 400)


# ----------------------------------
# ----------------------------------
# ---  POST /<location>/location ---
# ----------------------------------
# ----------------------------------

def test_get_location_unauthorized(client):
    """Tests searching for location with an unauthorized key"""

    location_response = client.post(
        '/ny/location',
        headers={'X-AUTH': 'BOGUS'},
        json={'query': 'barclays center'})

    assert(location_response.status_code == 401)

def test_get_location_barclays_center(client, monkeypatch):
    """Tests searching for address of a business"""

    monkeypatch.setattr(
        requests,
        'get',
        lambda *args, **kwargs: MockResponse('google_places_ok_0_address'))

    location_response = client.post(
        '/ny/location',
        headers={'X-AUTH': 'WRITE'},
        json={'query': 'barclays center'})

    assert(location_response.status_code == 200)
    assert(any(location_response.get_json()['results']))

def test_get_location_cross_streets(client, monkeypatch):
    """Tests searching for a cross streets"""

    monkeypatch.setattr(
        requests,
        'get',
        lambda *args, **kwargs: MockResponse('google_places_ok_1_cross'))

    location_response = client.post(
        '/ny/location',
        headers={'X-AUTH': 'WRITE'},
        json={'query': 'bergen st and 4th av'})

    assert(location_response.status_code == 200)
    assert(any(location_response.get_json()['results']))

# ------------------------------
# ------------------------------
# ---  GET /<location>/panel ---
# ------------------------------
# ------------------------------

def test_get_panel_ok(client):
    """Tests getting a panel"""

    panel_response = client.get('/ny/cams')

    assert(panel_response.status_code == 200)

def test_get_panel_unknown_location(client):
    """Tests getting a panel from an unknown location"""

    panel_response = client.get('/YN/cams')

    assert(panel_response.status_code == 404)

# -----------------------------------
# -----------------------------------
# ---  GET, POST /<location>/panel/keys ---
# -----------------------------------
# -----------------------------------

def test_keys_no_auth(client):
    """Tests keys route with no auth"""

    keys_response = client.get('/ny/panel/keys')

    assert(keys_response.status_code == 401)

def test_keys_not_prime(client):
    """Tests keys route with an auth key that isn't an admin"""

    keys_response = client.get('/ny/panel/keys', headers={'X-AUTH': 'WRITE'})

    assert(keys_response.status_code == 401)

def test_keys_prime_get(client):
    """Tests keys route with a prime key"""

    keys_response = client.get('/ny/panel/keys', headers={'X-AUTH': 'PRIME'})

    assert(keys_response.status_code == 200)

def test_keys_new_key_unauthorized(client):
    """Tests adding a new key with an unauthorized key"""

    keys_response = client.post(
        '/ny/panel/keys',
        headers={'X-AUTH': 'WRITE'},
        json={'action': 'create'})

    assert(keys_response.status_code == 401)

def test_keys_new_key_ok(client):
    """Tests add a key with a prime key"""

    from app import routes

    keys_response = client.post(
        '/ny/panel/keys',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'create'})

    assert(keys_response.status_code == 200)
    assert(len(routes.kr.get_keys('ny')['write']) == 2)

def test_keys_revoke_key_unauthorized(client):
    """Tests revoking a key with an unauthorized key"""

    keys_response = client.post(
        '/ny/panel/keys',
        headers={'X-AUTH': 'WRITE'},
        json={'action': 'revoke', 'key': 'WRITE'})

    assert(keys_response.status_code == 401)

def test_keys_revoke_key_ok(client):
    """Tests revoking a key with a prime key"""

    from app import routes

    keys_response = client.post(
        '/ny/panel/keys',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'revoke', 'key': 'WRITE'})

    assert(keys_response.status_code == 200)
    assert(len(routes.kr.get_keys('ny')['write']) == 0)

# -------------------------------------------
# -------------------------------------------
# ---  GET, POST /<location>/panel/labels ---
# -------------------------------------------
# -------------------------------------------

def test_labels_no_auth(client):
    """Tests labels route with no auth"""
    response = client.get('/ny/panel/labels')
    assert(response.status_code == 401)

def test_labels_not_prime(client):
    """Tests labels route with an auth key that isn't an admin"""
    response = client.get('/ny/panel/labels', headers={'X-AUTH': 'WRITE'})
    assert(response.status_code == 401)

def test_labels_prime_get(client):
    """Tests labels route with a prime key"""
    response = client.get('/ny/panel/labels', headers={'X-AUTH': 'PRIME'})
    assert(response.status_code == 200)

def test_labels_new_label_unauthorized(client):
    """Tests adding a new label with an unauthorized key"""
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'WRITE'},
        json={'action': 'create', 'label': 'bar', 'icon': '🔮'})
    assert(response.status_code == 401)

def test_labels_new_label_ok(client):
    """Tests add a label with a prime key"""
    from app import routes
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'create', 'label': 'bar', 'icon': '🔮'})
    assert(response.status_code == 200)
    assert(len(routes.lm.labels('ny')) == 2)

def test_labels_hide_label_unauthorized(client):
    """Tests hiding a label with an unauthorized key"""
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'WRITE'},
        json={'action': 'hide', 'label': 'foo'})
    assert(response.status_code == 401)

def test_labels_hide_label_ok(client):
    """Tests hiding a key with a prime key"""
    from app import routes
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'hide', 'label': 'foo'})
    assert(response.status_code == 200)
    assert(routes.lm.labels('ny')['foo']['hide'])

def test_labels_unhide_label_unauthorized(client):
    """Tests unhiding a label with an unauthorized key"""
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'WRITE'},
        json={'action': 'unhide', 'label': 'foo'})
    assert(response.status_code == 401)

def test_labels_unhide_label_ok(client):
    """Tests unhiding a key with a prime key"""
    from app import routes
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'unhide', 'label': 'foo'})
    assert(response.status_code == 200)
    assert(not routes.lm.labels('ny')['foo']['hide'])

def test_labels_edit_label_unauthorized(client):
    """Tests editing a label with an unauthorized key"""
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'WRITE'},
        json={'action': 'edit', 'label': 'foo', 'icon': '🔮'})
    assert(response.status_code == 401)

def test_labels_edit_label_ok(client):
    """Tests editing a key with a prime key"""
    from app import routes
    response = client.post(
        '/ny/panel/labels',
        headers={'X-AUTH': 'PRIME'},
        json={'action': 'edit', 'label': 'foo', 'icon': '🔮'})
    assert(response.status_code == 200)
    assert(routes.lm.labels('ny')['foo']['icon'] == '🔮')

# -----------------------------------
# -----------------------------------
# ---  POST /<location>/checkauth ---
# -----------------------------------
# -----------------------------------

def test_check_auth_ok_key(client):
    """Tests check auth with a good key and location"""

    auth_response = client.post('/ny/checkauth', headers={'X-AUTH': 'WRITE'})

    assert(auth_response.status_code == 200)
    assert(auth_response.is_json)
    assert(auth_response.get_json() == {'success': True})

def test_check_auth_bad_key(client):
    """Tests check auth with a bad key"""

    auth_response = client.post('/ny/checkauth', headers={'X-AUTH': 'BOGUS'})

    assert(auth_response.status_code == 200)
    assert(auth_response.is_json)
    assert(auth_response.get_json() == {'success': False})
