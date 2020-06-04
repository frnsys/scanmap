import config
import requests

def search_places(query, conf):
    """Reference: <https://developers.google.com/places/web-service/search?hl=ru#nearby-search-and-text-search-responses>"""
    params = {
        'key': config.GOOGLE_PLACES_API_KEY,
        'query': query,

        # Influence results
        'location': conf['SEARCH']['CENTER'],
        'radius': conf['SEARCH']['RADIUS']
    }

    # Not paginating results because we
    # only will show a few
    resp = requests.get(
            'https://maps.googleapis.com/maps/api/place/textsearch/json',
            params=params)
    data = resp.json()
    results = data['results']

    # Hard filter to keep search results relevant to the region
    results = [r for r in results
                if conf['SEARCH']['FILTER'] in r['formatted_address']]

    return [{
        'name': r['name'],
        'coordinates': [
            r['geometry']['location']['lat'],
            r['geometry']['location']['lng']
        ]
    } for r in results]
