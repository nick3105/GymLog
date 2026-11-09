"""Production entry point for PythonAnywhere's WSGI configuration."""

from gymlog import create_app

application = create_app()
