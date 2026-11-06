"""WSGI entry point; the hosting provider supplies HTTPS."""
from app import create_app

application = create_app()
