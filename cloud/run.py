"""Local development entry point. Never enable local mode on an internet host."""
import argparse
from app import create_app

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--local", action="store_true", help="Allow cookies over local HTTP")
    parser.add_argument("--port", type=int, default=8770)
    args = parser.parse_args()
    if not args.local:
        parser.error("Use --local for localhost; for hosting use wsgi.py over HTTPS.")
    create_app({"SESSION_COOKIE_SECURE": False}).run(host="127.0.0.1", port=args.port, debug=False)
