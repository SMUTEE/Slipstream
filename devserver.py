#!/usr/bin/env python3
"""Static server for local development.

python -m http.server lets the browser cache modules heuristically, which during
this project twice produced a page that booted an old module against a new one
and failed to link. Production is unaffected: Vercel revalidates every file with
an etag. This exists so local testing behaves the same way.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    print(f"serving on http://localhost:{port}/app/  (no-store)")
    ThreadingHTTPServer(("", port), NoCache).serve_forever()
