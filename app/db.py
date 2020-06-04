import json
import sqlite3
from datetime import datetime, timezone

class Database:
    def __init__(self, path):
        self.path = path
        _, cur = self._con()
        cur.execute('CREATE TABLE IF NOT EXISTS logs \
                (timestamp text primary key,\
                location text,\
                submitter text,\
                data json not null)')

    def _con(self):
        con = sqlite3.connect(self.path)
        cur = con.cursor()
        return con, cur

    def add(self, location, submitter, log):
        timestamp = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()
        con, cur = self._con()
        cur.execute(
            'INSERT INTO logs(timestamp, location, submitter, data) VALUES (?,?,?,?)',
            (timestamp, location, submitter, json.dumps(log)))
        con.commit()

    def logs(self, location, n):
        con, cur = self._con()
        rows = cur.execute(
                'SELECT timestamp, submitter, data FROM logs WHERE location == ? LIMIT ?',
                (location, n)).fetchall()
        return [{
            'timestamp': timestamp,
            'data': json.loads(data),
            'submitter': submitter[:8]
        } for timestamp, submitter, data in rows]

    def log(self, location, timestamp):
        con, cur = self._con()
        res = cur.execute(
                'SELECT submitter, data FROM logs WHERE location == ? AND timestamp == ?',
                (location, timestamp)).fetchone()
        return res[0]

    def delete(self, location, timestamp):
        con, cur = self._con()
        cur.execute(
            'DELETE FROM logs WHERE location == ? AND timestamp == ?',
            (location, timestamp))
        con.commit()

    def update(self, location, timestamp, log):
        con, cur = self._con()
        cur.execute('UPDATE logs SET data = ? WHERE location == ? AND timestamp == ?',
                (json.dumps(log), location, timestamp))
        con.commit()