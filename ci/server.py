#!/usr/bin/env python3
import http.server,json,pathlib,os
os.chdir(pathlib.Path(__file__).resolve().parents[1]/"build/preview")
def menu_node(title,children=None,order=10):
 return {"title":title,"satisfied":True,"order":order,"children":children or {}}
MENU={"children":{"admin":menu_node("管理",{
 "status":menu_node("状态",{"overview":menu_node("概览"),"syslog":menu_node("系统日志")}),
 "network":menu_node("网络",{"network":menu_node("接口",{"interfaces":menu_node("接口"),"devices":menu_node("设备",order=20),"globals":menu_node("全局网络选项",order=30)}),"wireless":menu_node("无线"),"firewall":menu_node("防火墙")},40),
 "system":menu_node("系统",{"system":menu_node("系统设置"),"admin":menu_node("管理权"),"opkg":menu_node("软件包")},20),
 "services":menu_node("服务",{"mtwifi":menu_node("无线配置"),"turboacc":menu_node("网络加速")},30),
 "logout":menu_node("退出",order=90)
})}}
class Handler(http.server.SimpleHTTPRequestHandler):
 def send_json(self,obj):
  b=json.dumps(obj).encode();self.send_response(200);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(b)));self.end_headers();self.wfile.write(b)
 def do_GET(self):
  if self.path.split("?")[0].endswith("/admin/menu"):self.send_json(MENU)
  else:super().do_GET()
 def do_POST(self):
  # Read-only mocked JSON-RPC. No actual router or configuration writes.
  req=json.loads(self.rfile.read(int(self.headers.get("Content-Length","0"))))
  def respond(msg):
   params=msg.get("params",[]);method=params[2] if len(params)>2 else ""
   values={"getFeatures":{},"list":{"entries":[]},"changes":{"changes":{}},"access":{"access":True}}
   if method in ("set","add","delete","apply","commit"):raise RuntimeError("Unexpected write in preview")
   return {"jsonrpc":"2.0","id":msg.get("id"),"result":[0,values.get(method,{})]}
  self.send_json([respond(x) for x in req] if isinstance(req,list) else respond(req))
 def log_message(self,format,*args):pass
http.server.ThreadingHTTPServer(("127.0.0.1",8765),Handler).serve_forever()
