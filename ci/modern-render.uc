// Matching ucode engine and fixed core templates; mock OS/ubus/HTTP inputs only.
import { readfile, writefile } from 'fs';
const root = ARGV[0];
const output = ARGV[1];
const base = {
 theme: 'materialluci', media: '/luci-static/materialluci', resource: '/luci-static/resources',
 config: {main: {pollinterval: '5'}, apply: {}}, pkgs_update_time: 1,
 ctx: {request_path: ['admin','system','general'], path: ['admin','system','general']},
 dispatched: {title: 'System & settings'}, node: {},
 version: {distversion: '25.12.5'}, rollback_token: null,
 blank_page: false, css: null, trigger_apply: false, trigger_revert: false, media_error: null,
 lua_active: false, duser: 'root', fuser: null,
 _: s => s,
 striptags: s => replace(s, /<[^>]*>/g, ''),
 entityencode: s => replace(replace(replace(replace(replace(s ?? '', '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), "'", '&#39;'),
 dispatcher: {lang: 'en', build_url: (...args) => '/cgi-bin/luci/' + join('/', args),
   lookup: path => true, rollback_pending: () => null},
 http: {prepare_content: s => {}, getenv: s => ({
   SCRIPT_NAME: '/cgi-bin/luci', PATH_INFO: '/admin/system/general', DOCUMENT_ROOT: '/www'
 })[s]},
 uci: {get: (...args) => []},
 ubus: {call: (...args) => ({hostname: 'router"><script>alert(1)</script>&', rootfs_type: 'initramfs'})}
};
let scopes = [proto(base, global)];
function include(path, local) {
 const filename = path == 'header' || path == 'footer' || path == 'sysauth'
  ? root + '/core/' + path + '.ut'
  : root + '/theme/' + path + '.ut';
 const scope = proto(local ?? {}, scopes[-1]);
 push(scopes, scope);
 try { call(loadfile(filename, {raw_mode: false}), null, scope); }
 catch (ex) { pop(scopes); die(ex); }
 pop(scopes);
}
base.include = include;
global.test_password = '';
writefile(output + '/modern.html', render(() => {
 include('header');
 print('<div id="view"></div><script>L.require("view.modern-contract");</script>');
 include('footer');
}));
base.blank_page = true;
writefile(output + '/blank.html', render(() => {include('header'); print('<p id="blank-marker">Blank content</p>');include('footer');}));
base.blank_page = false;
base.ctx.path = [];
base.ctx.request_path = ['admin'];
base.fuser = 'bad-user';
writefile(output + '/login.html', render(() => include('themes/materialluci/sysauth')));
base.dispatcher.lookup = path => false;
global.test_password = 'hashed-password';
base.ubus.call = (...args) => ({hostname: 'router',rootfs_type: 'squashfs'});
writefile(output + '/restricted.html', render(() => {include('header');print('<div id="view"></div>');include('footer');}));
