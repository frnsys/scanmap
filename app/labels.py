import os
import yaml

class LabelManager:
    def __init__(self, path):
        self.path = path

    def labels(self, location):
        labels = self.load()
        return labels.get(location, {})

    def load(self):
        if not os.path.exists(self.path):
            return {}
        else:
            return yaml.load(open(self.path), Loader=yaml.SafeLoader) or {}

    def save(self, location, labels):
        labels_ = self.load()
        labels_[location] = labels
        yaml.dump(labels_,
                open(self.path, 'w'),
                default_flow_style=False)

    def create(self, location, label, icon):
        labels = self.labels(location)
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
        labels = self.labels(location)
        if label in labels:
            labels[label]['hide'] = True
            self.save(location, labels)
            return True
        else:
            return False

    def unhide(self, location, label):
        labels = self.labels(location)
        if label in labels:
            labels[label]['hide'] = False
            self.save(location, labels)
            return True
        else:
            return False

    def edit_icon(self, location, label, icon):
        labels = self.labels(location)
        if label in labels:
            labels[label]['icon'] = icon
            self.save(location, labels)
            return True
        else:
            return False
