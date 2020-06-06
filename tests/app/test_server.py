from app.db import Database
from datetime import datetime, timezone
import pytest
import tempfile

@pytest.fixture()
def client(monkeypatch):
    import config

    with tempfile.NamedTemporaryFile() as dbf:
        monkeypatch.setattr(config, 'DB_PATH', dbf.name)

        from server import app

        app.config['TESTING'] = True

        yield app.test_client()

def test_get_version(client):
    """Tests version route to ensure json body is expected"""

    version_response = client.get('/version')

    assert(version_response.status_code == 200)
    assert(version_response.is_json)
    assert('version' in version_response.get_json())

    # Sanity check to ensure the config that's being used is
    # the one defined in tests/app/config.py.
    assert(version_response.get_json()['version'] == 'TEST')

def test_get_map_location(client):
    """Tests getting a known location"""

    map_response = client.get('/NY/')

    assert(map_response.status_code == 200)

def test_get_unknown_map_location(client):
    """Tests getting an unknown map location"""

    map_response = client.get('/BOGUS/')

    assert(map_response.status_code == 404)

def test_get_cams(client):
    """Tests getting cams"""

    cams_response = client.get('/NY/cams')

    assert(cams_response.status_code == 200)

def test_get_unknown_cams_location(client):
    """Tests getting cams from an unknown location"""

    cams_response = client.get('/YN/cams')

    assert(cams_response.status_code == 404)

def test_keys_no_auth(client):
    """Tests keys route with no auth"""

    keys_response = client.get('/NY/keys')

    assert(keys_response.status_code == 401)

def test_keys_not_prime(client):
    """Tests keys route with an auth key that isn't an admin"""

    keys_response = client.get('/NY/keys', headers={'X-AUTH': 'WRITE'})

    assert(keys_response.status_code == 401)

def test_keys_prime_get(client):
    """Tests keys route with a prime key"""

    keys_response = client.get('/NY/keys', headers={'X-AUTH': 'PRIME'})

    assert(keys_response.status_code == 200)

def test_check_auth_ok_key(client):
    """Tests check auth with a good key and location"""

    auth_response = client.post('/NY/checkauth', headers={'X-AUTH': 'WRITE'})

    assert(auth_response.status_code == 200)
    assert(auth_response.is_json)
    assert(auth_response.get_json() == {'success': True})

def test_check_auth_bad_key(client):
    """Tests check auth with a bad key"""

    auth_response = client.post('/NY/checkauth', headers={'X-AUTH': 'BOGUS'})

    assert(auth_response.status_code == 200)
    assert(auth_response.is_json)
    assert(auth_response.get_json() == {'success': False})
