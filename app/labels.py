import os
import yaml

class LabelManager:
    def __init__(self, path):
        self.path = path

    def _path(self, location):
        return os.path.join(self.path, '{}.yml'.format(location))

    def load(self, location):
        path = self._path(location)
        if not os.path.exists(path):
            return {}
        else:
            return yaml.load(open(path), Loader=yaml.SafeLoader) or {}

    def save(self, location, labels):
        path = self._path(location)
        yaml.dump(labels,
                open(path, 'w'),
                default_flow_style=False)

    def create(self, location, label, icon):
        labels = self.load(location)
        if label not in labels:
            labels[label] = {
                'icon': icon,
                'hide': False
            }
            self.save(location, labels)
            return True
        else:
            return False

    def hide(self, location, label):
        labels = self.load(location)
        if label in labels:
            labels[label]['hide'] = True
            self.save(location, labels)
            return True
        else:
            return False

    def edit_icon(self, location, label, icon):
        labels = self.load(location)
        if label in labels:
            labels[label]['icon'] = icon
            self.save(location, labels)
            return True
        else:
            return False
