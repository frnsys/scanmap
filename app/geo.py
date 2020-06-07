import config
import requests
import re

def search_places_google(query, conf):
    """ Deprecated in favor of mapbox, but leaving here in case we need to revert!
    Reference: <https://developers.google.com/places/web-service/search?hl=ru#nearby-search-and-text-search-responses>"""
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
                if r.get('formatted_address') and conf['SEARCH']['FILTER'] in r['formatted_address']]

    return [{
        'name': r['name'],
        'coordinates': [
            r['geometry']['location']['lat'],
            r['geometry']['location']['lng']
        ]
    } for r in results]



def search_places(query, conf):
    """Reference: https://docs.mapbox.com/api/search/#forward-geocoding
    please note: mapbox always uses lng,lat NOT lat,lng...
    """

    url = "https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json".format(query)

    params = {
        "access_token": config.MAPBOX_TOKEN,
        "autocomplete": "true",
        "fuzzyMatch": "true",  # accepts bad spelling
        "limit": 5,  # max is 10
        "language": "en",
        "proximity": "{},{}".format(
            conf["SEARCH"]["CENTER"][1], conf["SEARCH"]["CENTER"][0]
        ),
    }

    resp = requests.get(url, params=params)
    data = resp.json()

    results = data["features"]

    results = [r for r in results if conf["SEARCH"]["FILTER"] in r["place_name"]]

    results = [
        {
            "name": re.sub(r" [0-9]{5}, .*$", "", r["place_name"]),
            "coordinates": [
                r["geometry"]["coordinates"][1],
                r["geometry"]["coordinates"][0],
            ],
        }
        for r in results
    ]

    return results
