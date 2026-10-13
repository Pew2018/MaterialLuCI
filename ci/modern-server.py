#!/usr/bin/env python3
import http.server,json,pathlib,os
os.chdir(pathlib.Path(__file__).resolve().parents[1]/'build/modern-web')
def node(title,children=None,satisfied=True,order=10):
 return {'title':title,'satisfied':satisfied,'order':order,'children':children or {}}
MENU={'children':{'admin':node('Administration',{
 'system':node('System',{'general':node('General',{'settings':node('Settings'),'extra':node('Extra',order=20)})}),
 'network':node('Network',{'network':node('Interfaces')},order=20),
 'hidden':node('Forbidden plugin',satisfied=False)})}}
class Handler(http.server.SimpleHTTPRequestHandler):
 def send(self,b,kind):
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def do_GET(self):
  path=self.path.split('?')[0]
  if path.endswith('/admin/menu'):self.send(json.dumps(MENU).encode(),'application/json')
  elif '/admin/translations/' in path:self.send(b';','text/javascript')
  elif path=='/contract-ready':self.send(b'ready','text/plain')
  else:super().do_GET()
 def do_POST(self):
  req=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
  def respond(msg):
   p=msg.get('params',[]);method=p[2] if len(p)>2 else ''
   if method in ('set','add','delete','apply','commit'):raise RuntimeError('Unexpected business write in contract test')
   values={'getFeatures':{},'list':{'entries':[]},'changes':{'changes':{}},'access':{'access':True},'get':{'values':{}}}
   return {'jsonrpc':'2.0','id':msg.get('id'),'result':[0,values.get(method,{})]}
  self.send(json.dumps([respond(m) for m in req] if isinstance(req,list) else respond(req)).encode(),'application/json')
 def log_message(self,*args):pass
http.server.ThreadingHTTPServer(('127.0.0.1',8766),Handler).serve_forever()
