from app.db import Database
from app.keys import KeyRing
import multiprocessing
import pytest
import subprocess
import tempfile
import time

@pytest.fixture(autouse=True)
def server(monkeypatch):
    with tempfile.NamedTemporaryFile() as keyf:
        # Copy over the test keys to the temporary key file
        with open('tests/app/data/keys.yml', mode='rb') as testkeyf:
            keyf.write(testkeyf.read())
            keyf.flush()

        with tempfile.NamedTemporaryFile() as dbf:
            from app import routes

            # Stub key ring and database
            monkeypatch.setattr(routes, 'kr', KeyRing(keyf.name))
            monkeypatch.setattr(routes, 'db', Database(dbf.name))

            import server

            proc = multiprocessing.Process(target=lambda: server.app.run(port=8800))
            proc.start()

            time.sleep(5)

            yield

            proc.terminate()

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
