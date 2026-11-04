#!/usr/bin/env python3
"""Loopback-only development proxy. No remote credentials, token logging, or production use."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import ssl
import urllib.error
import urllib.parse
import urllib.request

HOP_HEADERS = {'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
               'te', 'trailers', 'transfer-encoding', 'upgrade', 'host', 'content-length'}


def handler(config):
    class Gateway(BaseHTTPRequestHandler):
        def log_message(self, *unused):
            pass  # URLs can contain tokens. Keep them out of local logs.

        def cors(self):
            origin = self.headers.get('Origin', '')
            parsed = urllib.parse.urlsplit(origin)
            if parsed.scheme in ('http', 'https') and parsed.hostname in ('localhost', '127.0.0.1'):
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Access-Control-Allow-Credentials', 'true')
                self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-CSRF-Token, X-Requested-With, X-WHITELIST-HEADER, agencyId, topicId, tenantId, consultantId')

        def reply(self, status, body, headers=None):
            self.send_response(status)
            pairs = headers.items() if hasattr(headers, 'items') else (headers or [])
            for key, value in pairs:
                if key.lower() not in HOP_HEADERS and not key.lower().startswith('access-control-'):
                    self.send_header(key, value)
            self.cors()
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        def do_OPTIONS(self):
            self.reply(204, b'')

        def proxy(self):
            if self.path == '/__oriso_local_health':
                self.reply(200, b'{"status":"UP"}', {'Content-Type': 'application/json'})
                return
            if config.get('app_edge'):
                target = config.get('frontend')
                suffix = self.path
                if not target:
                    self.reply(503, b'{"error":"frontend is not selected; DPA journey is unavailable"}', {'Content-Type': 'application/json'})
                    return
            elif self.path.startswith('/auth/'):
                target = {'url': config['auth']}
                suffix = self.path[len('/auth'):]
            elif self.path.startswith('/service/'):
                suffix = self.path[len('/service'):]
                route = urllib.parse.urlsplit(suffix).path.strip('/').split('/')[0]
                target = config['routes'].get(route)
            else:
                target = None
            if not target:
                self.reply(404, b'{"error":"service not bundled locally"}', {'Content-Type': 'application/json'})
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if length < 0 or length > 16 * 1024 * 1024:
                    self.reply(413, b'')
                    return
                body = self.rfile.read(length) if length else None
                headers = {key: value for key, value in self.headers.items() if key.lower() not in HOP_HEADERS}
                if 'host' in target:
                    headers['Host'] = target['host']
                request = urllib.request.Request(target['url'].rstrip('/') + suffix, data=body, headers=headers, method=self.command)
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
                try:
                    response = opener.open(request, timeout=30)
                except urllib.error.HTTPError as error:
                    response = error  # Preserve upstream failure status, cookies, and response body.
                with response:
                    self.reply(response.status, response.read(), list(response.headers.items()))
            except (OSError, ValueError, urllib.error.URLError):
                self.reply(502, b'{"error":"local upstream unavailable"}', {'Content-Type': 'application/json'})

        do_GET = proxy
        do_POST = proxy
        do_PUT = proxy
        do_PATCH = proxy
        do_DELETE = proxy
        do_HEAD = proxy
    return Gateway


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *unused):
        return None


def server(config):
    instance = ThreadingHTTPServer(('127.0.0.1', config['port']), handler(config))
    if config.get('tls_cert'):
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=config['tls_cert'], keyfile=config['tls_key'])
        instance.socket = context.wrap_socket(instance.socket, server_side=True)
    return instance


if __name__ == '__main__':
    config = json.loads(Path(sys.argv[1]).read_text())
    server(config).serve_forever()
