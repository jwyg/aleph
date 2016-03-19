import os
from apikit import jsonify
from flask import render_template, current_app, Blueprint, request
from jsonschema import ValidationError

from aleph.model.constants import CORE_FACETS, SOURCE_CATEGORIES
from aleph.model.constants import COUNTRY_NAMES, LANGUAGE_NAMES

blueprint = Blueprint('base_api', __name__)


def angular_templates():
    partials_dir = os.path.join(current_app.static_folder, 'templates')
    for (root, dirs, files) in os.walk(partials_dir):
        for file_name in files:
            file_path = os.path.join(root, file_name)
            with open(file_path, 'rb') as fh:
                file_name = file_path[len(partials_dir) + 1:]
                yield (file_name, fh.read().decode('utf-8'))


@blueprint.route('/')
def ui(**kwargs):
    from aleph.views.cache import enable_cache
    enable_cache(server_side=True)
    return render_template("layout.html", templates=angular_templates())


@blueprint.route('/api/1/metadata')
def metadata():
    from aleph.views.cache import enable_cache
    enable_cache(server_side=False)
    return jsonify({
        'status': 'ok',
        'fields': CORE_FACETS,
        'source_categories': SOURCE_CATEGORIES,
        'countries': COUNTRY_NAMES,
        'languages': LANGUAGE_NAMES
    })


@blueprint.app_errorhandler(403)
def handle_authz_error(err):
    return jsonify({
        'status': 'error',
        'message': 'You are not authorized to do this.',
        'roles': request.auth_roles,
        'user': request.auth_user
    }, status=403)


@blueprint.app_errorhandler(ValidationError)
def handle_validation_error(err):
    return jsonify({
        'status': 'error',
        'message': err.message
    }, status=400)
