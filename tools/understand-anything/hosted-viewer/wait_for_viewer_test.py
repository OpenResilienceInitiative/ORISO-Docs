import unittest,tempfile,pathlib,threading,http.server,socket
from wait_for_viewer import host_port,wait

class Quiet(http.server.BaseHTTPRequestHandler):
    def do_GET(self):self.send_response(404);self.end_headers()
    def log_message(self,*a):pass

class WaitForViewerTests(unittest.TestCase):
    def test_reads_the_single_published_port(self):
        with tempfile.TemporaryDirectory() as d:
            f=pathlib.Path(d)/'c.yml';f.write_text('services:\n  a:\n    ports:\n    - 127.0.0.1:5191:5191\n  b:\n    ports:\n    - 127.0.0.1:6000:5000\n')
            self.assertEqual(host_port(f,'a'),5191);self.assertEqual(host_port(f,'b'),6000)
    def test_service_without_one_port_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            f=pathlib.Path(d)/'c.yml';f.write_text('services:\n  a:\n    image: x\n')
            with self.assertRaises(ValueError):host_port(f,'a')
    def test_any_http_answer_counts_as_up(self):
        server=http.server.HTTPServer(('127.0.0.1',0),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
        try:self.assertTrue(wait(server.server_address[1],timeout=5,interval=0.1))
        finally:server.shutdown()
    def test_closed_port_times_out(self):
        s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close()
        self.assertFalse(wait(port,timeout=0.6,interval=0.1))
if __name__=='__main__':unittest.main()
