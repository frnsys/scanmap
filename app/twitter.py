import json
import tweepy

labels = json.load(open('static/labels.json'))

class Twitter:
    def __init__(self, consumer_key, consumer_secret, access_token, access_token_secret):
        auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
        auth.set_access_token(access_token, access_token_secret)
        self.api = tweepy.API(auth)

    def tweet(self, log):
        # Only tweet events
        if log['type'] == 'event':
            ev = log['data']
            lat, lng = ev['coordinates'].split(',')
            icon = labels['event'].get(ev['label'], '')
            text = '{icon} {label} @ {location}: {text}'.format(icon=icon, **ev)
            self.api.update_status(text, lat=lat, long=lng)