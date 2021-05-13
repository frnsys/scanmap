import pytest
import tempfile
from app.labels import LabelManager

EXPECTED = {
    'foo': {
        'icon': '🏵',
        'hide': False
    }
}

@pytest.fixture
def empty_labels():
    with tempfile.NamedTemporaryFile(mode='w+') as f:
        yield LabelManager(f.name)

@pytest.fixture
def labels():
    with tempfile.NamedTemporaryFile(mode='w+') as f:
        f.write('ny:\n')
        f.write('  foo:\n')
        f.write('    icon: 🏵\n')
        f.write('    hide: false\n')
        f.flush()
        yield LabelManager(f.name)

def test_get_labels_empty(empty_labels):
    """Tests getting labels when none exist for location"""

    assert(empty_labels.labels('ny') == {})

def test_get_labels_not_empty(labels):
    """Tests getting labels for location"""
    assert(labels.labels('ny') == EXPECTED)

def test_add_label(labels):
    """Tests adding label"""
    success = labels.create('ny', 'baz', '🔮')
    expected = dict({
        'baz': {
            'icon': '🔮',
            'hide': False
        },
    }, **EXPECTED)
    assert(success)
    assert(labels.labels('ny') == expected)

def test_add_label_existing_conflict(labels):
    """Tests adding label when another exists"""
    success = labels.create('ny', 'foo', '🔮')
    assert(not success)
    assert(labels.labels('ny') == EXPECTED)

def test_hide_label(labels):
    success = labels.hide('ny', 'foo')
    expected = dict(**EXPECTED)
    expected['foo']['hide'] = True
    assert(success)
    assert(labels.labels('ny') == expected)

def test_unhide_label(labels):
    success = labels.hide('ny', 'foo')
    expected = dict(**EXPECTED)
    expected['foo']['hide'] = True
    assert(labels.labels('ny') == expected)
    success = labels.unhide('ny', 'foo')
    expected['foo']['hide'] = False
    assert(success)
    assert(labels.labels('ny') == expected)

def test_edit_icon(labels):
    success = labels.edit_icon('ny', 'foo', '🔮')
    expected = dict(**EXPECTED)
    expected['foo']['icon'] = '🔮'
    assert(success)
    assert(labels.labels('ny') == expected)
