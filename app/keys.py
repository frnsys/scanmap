import yaml
import config
import random
import string

class KeyRing:
    def __init__(self, path):
        self.path = path

    def check_key(self, key, loc, typ=None):
        valid = self.get_keys(loc, typ=typ)
        return key in valid

    def get_keys(self, loc, typ=None):
        keys = self.load_keys()
        if typ:
            return keys.get(loc, {}).get(typ, [])
        else:
            return sum(keys.get(loc, {}).values(), [])

    def new_key(self):
        return ''.join(random.choices(
            string.ascii_letters + string.digits, k=32))

    def add_key(self, loc, typ, key):
        keys = self.load_keys()
        try:
            keys[loc][typ].append(key)
            self.save_keys(keys)
            return True
        except KeyError:
            return False

    def del_key(self, loc, typ, key):
        keys = self.load_keys()
        try:
            keys[loc][typ] = [k for k in keys[loc][typ] if k != key]
            self.save_keys(keys)
            return True
        except KeyError:
            return False

    def load_keys(self):
        return yaml.load(open(self.path))

    def save_keys(self, keys):
        yaml.dump(keys,
                open(self.path, 'w'),
                default_flow_style=False)
