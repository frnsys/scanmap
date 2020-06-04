import json
import sqlite3
from datetime import datetime, timezone

class Database:
    def __init__(self, path):
        self.con = sqlite3.connect(path)
        self.cur = self.con.cursor()
        self.cur.execute('CREATE TABLE IF NOT EXISTS logs \
                         (timestamp text primary key,\
                         location text,\
                         submitter text,\
                         data json not null)')

    def add(self, location, submitter, log):
        timestamp = datetime.utcnow().replace(tzinfo=timezone.utc).timestamp()
        self.cur.execute(
            'INSERT INTO logs(timestamp, location, submitter, data) VALUES (?,?,?,?)',
            (timestamp, location, submitter, json.dumps(log)))
        self.con.commit()

    def logs(self, location, n):
        rows = self.cur.execute(
                'SELECT timestamp, submitter, data FROM logs WHERE location == ? LIMIT ?',
                (location, n)).fetchall()
        return [{
            'timestamp': timestamp,
            'data': json.loads(data),
            'submitter': submitter[:8]
        } for timestamp, submitter, data in rows]

    def delete(self, location, timestamp):
        self.cur.execute(
            'DELETE FROM logs WHERE location == ? AND timestamp == ?',
            (location, timestamp)).fetchone()
        self.con.commit()

    def update(self, location, timestamp, log):
        self.cur.execute('UPDATE logs SET data = ? WHERE location == ? AND timestamp == ?',
                         (json.dumps(log), location, timestamp))
        self.con.commit()