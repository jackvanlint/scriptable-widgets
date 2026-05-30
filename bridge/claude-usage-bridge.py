#!/usr/bin/env python3
"""
claude-usage-bridge.py
Exposes usage.py output over HTTP so Scriptable on the phone
can read Claude rate-limit data over Tailscale.

GET /usage               →  usage.py JSON
GET /script/claude-usage →  raw claude-usage.js for copy-paste into Scriptable
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import os

PLUGIN_DIR = os.path.dirname(__file__)
USAGE_SCRIPT = os.path.join(PLUGIN_DIR, "usage.py")
WIDGETS_DIR = os.path.join(os.path.expanduser("~"), "scriptable-widgets", "widgets")
PORT = 9753


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/usage":
            self._serve_usage()
        elif self.path.startswith("/script/"):
            name = self.path[len("/script/"):]
            self._serve_script(name)
        else:
            self.send_response(404)
            self.end_headers()

    def _serve_usage(self):
        try:
            result = subprocess.run(
                ["python3", USAGE_SCRIPT],
                capture_output=True,
                text=True,
                timeout=12,
            )
            body = (result.stdout or '{"error":"no output"}').encode()
            status = 200
        except subprocess.TimeoutExpired:
            body = b'{"error":"usage.py timed out"}'
            status = 504
        except Exception as e:
            body = f'{{"error":"{e}"}}'.encode()
            status = 500

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_script(self, name):
        path = os.path.join(WIDGETS_DIR, f"{name}.js")
        if not os.path.isfile(path):
            self.send_response(404)
            self.end_headers()
            return
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Claude usage bridge on :{PORT}")
    server.serve_forever()
