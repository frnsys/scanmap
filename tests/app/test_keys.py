from app.keys import KeyRing
import pytest
import tempfile

@pytest.fixture
def empty_keys():
    with tempfile.NamedTemporaryFile(mode='w+') as keyf:
        yield KeyRing(keyf.name)

@pytest.fixture
def keys():
    with tempfile.NamedTemporaryFile(mode='w+') as keyf:
        keyf.write('ny:\n')
        keyf.write('  prime:\n')
        keyf.write('  -\n')
        keyf.write('  write:\n')
        keyf.write('  -')
        keyf.flush()
        yield KeyRing(keyf.name)

def test_get_keys_empty(empty_keys):
    """Tests getting a key on an empty key ring"""

    assert(empty_keys.get_keys('ny') == {})

def test_add_prime_key(keys):
    """Tests adding a key"""

    assert(keys.add_key('ny', 'WRITE', 'prime'))
    assert(any(keys.get_keys('ny')['prime']))

def test_add_unknown_type_key(keys):
    """Tests adding a key of an unknown type"""

    assert(not keys.add_key('ny', 'WRITE', 'bogus'))
    assert(not any(keys.get_keys('ny')['prime']))

def test_add_unknown_location_key(keys):
    """Tests adding a key with an unknown location"""

    assert(not keys.add_key('YN', 'prime', 'WRITE'))

def test_add_then_check_key(keys):
    """Tests adding a key then checking"""

    assert(not keys.check_key('WRITE', 'ny'))

    keys.add_key('ny', 'WRITE', 'prime')

    assert(keys.check_key('WRITE', 'ny'))

def test_add_then_check_different_key(keys):
    """Tests adding a key then checking if a different key is present"""

    assert(keys.add_key('ny', 'WRITE', 'prime'))
    assert(not keys.check_key('WRITE_2', 'ny'))

def test_delete_key(keys):
    """Tests adding a key then deleting it"""

    assert(keys.add_key('ny', 'WRITE', 'prime'))
    assert(keys.check_key('WRITE', 'ny'))
    assert(keys.del_key('ny', 'WRITE', 'prime'))

def test_delete_unknown_key(keys):
    """Tests deleting an unknown key"""

    assert(not keys.del_key('ny', 'bogus', 'bogus'))
