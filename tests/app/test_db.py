from app.db import Database
from datetime import datetime, timezone
import pytest
import tempfile

@pytest.fixture
def database():
    with tempfile.NamedTemporaryFile() as dbf:
        database = Database(dbf.name)

        yield database

def test_get_empty(database):
    """Tests a fetch on an empty database"""

    assert(not any(database.logs('NY', 1)))

def test_add(database):
    """Tests an add then fetch"""

    database.add(
        'NY',
        'WRITEKEY',
        { 'text': 'TEST', 'location': 'LOCATION', 'coordinates': '0,0', 'label': 'other' })

    logs = database.logs('NY', 1)

    assert(any(logs))
    assert(logs[0]['timestamp'])
    assert(logs[0]['submitter'] == 'WRITEKEY')
    assert(logs[0]['data']['text'] == 'TEST')
    assert(logs[0]['data']['location'] == 'LOCATION')
    assert(logs[0]['data']['coordinates'] == '0,0')
    assert(logs[0]['data']['label'] == 'other')

def test_delete(database):
    """Tests an add then delete"""

    database.add(
        'NY',
        'WRITEKEY',
        { 'text': 'TEST', 'location': 'LOCATION', 'coordinates': '0,0', 'label': 'other' })

    logs = database.logs('NY', 1)

    assert(any(logs))

    database.delete('NY', logs[0]['timestamp'])

    assert(not any(database.logs('NY', 1)))

def test_get_different_locations(database):
    """Tests adding multiple locations and fetching from one"""

    database.add(
        'NY',
        'WRITEKEY',
        { 'text': 'NY TEST', 'location': 'NY LOCATION', 'coordinates': '0,0', 'label': 'other' })

    database.add(
        'PA',
        'WRITEKEY',
        { 'text': 'PA TEST', 'location': 'PA LOCATION', 'coordinates': '0,0', 'label': 'other' })

    assert(len(database.logs('NY', 2)) == 1)
    assert(len(database.logs('PA', 2)) == 1)

def test_get_specific(database):
    """Tests getting a specific log record"""

    database.add(
        'NY',
        'WRITEKEY',
        { 'text': 'TEST', 'location': 'LOCATION', 'coordinates': '0,0', 'label': 'other' })

    logs = database.logs('NY', 10)

    assert(any(logs))
    assert(database.log('NY', logs[0]['timestamp']))

def test_update(database):
    """Tests update"""

    database.add(
        'NY',
        'WRITEKEY',
        { 'text': 'TEST', 'location': 'LOCATION', 'coordinates': '0,0', 'label': 'other' })

    logs = database.logs('NY', 1)

    assert(any(logs))

    database.update(
        'NY',
        logs[0]['timestamp'],
        { 'text': 'NEW', 'location': 'DIFFERENT', 'coordinates': '1,1', 'label': 'another' })

    log = database.log('NY', logs[0]['timestamp'])

    assert(any(log))
    assert(log['data']['text'] == 'NEW')
    assert(log['data']['location'] == 'DIFFERENT')
    assert(log['data']['coordinates'] == '1,1')
    assert(log['data']['label'] == 'another')
