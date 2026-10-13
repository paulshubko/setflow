#!/usr/bin/env python3
"""Tiny read-only static server for the SetFlow shed (exercise images + catalog).

Serves only .jpg, .webp and .json files under --root, adds CORS so the PWA on
GitHub Pages can cache images from here, and accepts URLs both with and
without the /shed prefix (Tailscale may or may not strip the mount path).
Standard library only.
"""
import argparse
import os
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ALLOWED = (".jpg", ".webp", ".json")
PREFIX = "/shed"


class Handler(SimpleHTTPRequestHandler):
    server_version = "setflow-shed"

    def _strip(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path == PREFIX:
            path = "/"
        elif path.startswith(PREFIX + "/"):
            path = path[len(PREFIX):]
        self.path = path

    def do_GET(self):
        self._strip()
        if not self._allowed():
            return self.send_error(404)
        super().do_GET()

    def do_HEAD(self):
        self._strip()
        if not self._allowed():
            return self.send_error(404)
        super().do_HEAD()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _allowed(self):
        clean = posixpath.normpath(self.path)
        if ".." in clean.split("/"):
            return False
        return clean.lower().endswith(ALLOWED)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        if self.path.lower().endswith((".jpg", ".webp")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--port", type=int, default=8090)
    ap.add_argument("--host", default="127.0.0.1")
    a = ap.parse_args()
    root = os.path.abspath(a.root)
    handler = lambda *args, **kw: Handler(*args, directory=root, **kw)
    ThreadingHTTPServer((a.host, a.port), handler).serve_forever()


if __name__ == "__main__":
    main()
