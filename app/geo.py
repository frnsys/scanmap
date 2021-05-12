import config
import requests

def search_places(query, conf):
    """Reference: <https://developers.google.com/places/web-service/search?hl=ru#nearby-search-and-text-search-responses>"""
    point = [str(p) for p in conf['SEARCH']['CENTER']]
    params = {
        'key': config.GOOGLE_PLACES_API_KEY,
        'input': query,
        'inputtype': 'textquery',
        'fields': ','.join(['formatted_address','name','geometry']),

        # Influence results
        'locationbias': 'point:{}'.format(','.join(point))
    }

    # Not paginating results because we
    # only will show a few
    resp = requests.get(
            'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
            params=params)
    data = resp.json()
    results = data['candidates']

    # Hard filter to keep search results relevant to the region
    # print(results)
    results = [r for r in results
                if r.get('formatted_address') and conf['SEARCH']['FILTER'] in r['formatted_address']]

    return [{
        'name': r['name'],
        'coordinates': [
            r['geometry']['location']['lat'],
            r['geometry']['location']['lng']
        ]
    } for r in results]
