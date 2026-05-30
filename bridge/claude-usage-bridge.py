#!/usr/bin/env python3
"""
claude-usage-bridge.py
Exposes usage.py output over HTTP so Scriptable on the phone
can read Claude rate-limit data over Tailscale.

GET /usage  →  usage.py JSON
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import os

USAGE_SCRIPT = os.path.join(os.path.dirname(__file__), "usage.py")
PORT = 9753


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/usage":
            self.send_response(404)
            self.end_headers()
            return

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

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Claude usage bridge on :{PORT}")
    server.serve_forever()
