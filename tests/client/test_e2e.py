from app.db import Database
from app.keys import KeyRing
from app.labels import LabelManager
import multiprocessing
import pytest
import subprocess
import tempfile
import time

@pytest.fixture(autouse=True)
def server(monkeypatch):
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
    from app import routes

    # Stub key ring and database
    monkeypatch.setattr(routes, 'kr', KeyRing(keyf.name))
    monkeypatch.setattr(routes, 'db', Database(dbf.name))
    monkeypatch.setattr(routes, 'lm', LabelManager(labelsf.name))

    import server
    server.app.config['TESTING'] = True
    proc = multiprocessing.Process(target=lambda: server.app.run(port=8800, debug=True))
    proc.start()

    time.sleep(5)

    yield

    proc.terminate()
    keyf.close()
    labelsf.close()
    dbf.close()

def run_end_to_end_test(testf):
  """
  Runs frontend automated testing script.

  Expectations:
    - Frontend assets to be compiled
    - Frontend dependencies to be installed
  """

  e2e_test = subprocess.run(
    [
      'node',
      './node_modules/taiko/bin/taiko.js',
      # '--observe', # Uncomment to observe actions
      'tests/client/{}.js'.format(testf)
    ],
    # capture_output=True,
    check=True
  )

  assert(e2e_test.returncode == 0)

def test_basic_annotation():
  """Tests basic adding to map"""
  run_end_to_end_test('annotation')

def test_basic_annotation_unauthenticated():
  """Tests basic adding to map, but unauthenticated"""
  run_end_to_end_test('annotation_noauth')
