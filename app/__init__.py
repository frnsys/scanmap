import config
from flask_sse import sse
from .routes import bp, cache, get_conf
from flask import Flask

def create_app(package_name=__name__, static_folder='../static', template_folder='../templates', **config_overrides):
    app = Flask(package_name,
                static_url_path='/static',
                static_folder=static_folder,
                template_folder=template_folder)
    app.config.from_object(config)
    app.register_blueprint(sse, url_prefix='/location-stream')
    app.register_blueprint(bp)
    cache.init_app(app)
    app.sse = sse
    return app
