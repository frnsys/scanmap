import yaml
import config
import random
import string

class KeyRing:
    """Manages keys (adding/revoking), which provide write access."""
    def __init__(self, path):
        self.path = path

    def check_key(self, key, loc):
        valid = self.get_keys(loc)
        for typ, keys in valid.items():
            if key in keys:
                return typ
        return False

    def get_keys(self, loc):
        keys = self.load_keys()
        return keys.get(loc, {})

    def new_key(self):
        return ''.join(random.choices(
            string.ascii_letters + string.digits, k=32))

    def add_key(self, loc, key, typ):
        keys = self.load_keys()
        try:
            keys[loc][typ].append(key)
            self.save_keys(keys)
            return True
        except KeyError:
            return False

    def del_key(self, loc, key, typ=None):
        keys = self.load_keys()
        if typ is None: # Revoke all instances of key
            typs = list(keys[loc].keys())
        else:
            typs = [typ]
        try:
            for typ in typs:
                keys[loc][typ] = [k for k in keys[loc][typ] if k != key]
            self.save_keys(keys)
            return True
        except KeyError:
            return False

    def load_keys(self):
        return yaml.load(open(self.path), Loader=yaml.SafeLoader) or {}

    def save_keys(self, keys):
        yaml.dump(keys,
                open(self.path, 'w'),
                default_flow_style=False)
