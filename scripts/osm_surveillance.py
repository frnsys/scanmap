"""
Usage:

    python osm_surveillance.py <area query> <scanmap location>

Example:

    python osm_surveillance.py NYC NY

Outputs file to `output/`
"""

import sys
import json
from datetime import datetime
from OSMPythonTools.nominatim import Nominatim
from OSMPythonTools.overpass import Overpass, overpassQueryBuilder

# E.g. NYC
city = sys.argv[1]

# E.g. NY (i.e. the scanmap name)
location = sys.argv[2]

overpass = Overpass()
nominatim = Nominatim()

place = nominatim.query(city)
query = overpassQueryBuilder(area=place.areaId(), elementType='node', selector='"man_made"="surveillance"', out='body')
results = overpass.query(query)
data = results.toJSON()

# Format for POI ingestion script
pois = []
for el in data['elements']:
    el['tags'].pop('man_made')
    text = '\n'.join(
            '{}={}'.format(k, v)
            for k, v in el['tags'].items())
    text = '{}\nosm_id={}'.format(text, el['id'])
    loc = nominatim.query(el['lat'], el['lon'], reverse=True)
    pois.append({
        'location': location,
        'data': {
            'coordinates': "{},{}".format(el['lat'], el['lon']),
            'label': 'camera',
            'image': None,
            'location': loc.displayName().replace(', United States of America', ''),
            'text': text
        }
    })

now = datetime.utcnow().isoformat()
with open('output/surveillance__{}_{}_{}.json'.format(city, location, now), 'w') as f:
    json.dump(pois, f)
