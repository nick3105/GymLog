"""Production entry point for PythonAnywhere's WSGI configuration."""

from gymlog import create_app

# PythonAnywhere's load balancer puts each visitor's address in X-Real-IP (issue 006).
application = create_app({"TRUST_X_REAL_IP": True})
