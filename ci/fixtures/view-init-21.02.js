/* Verbatim View.__init__ from openwrt/luci openwrt-21.02 luci.js.
   Test dependency shim only; fixture executes the native returned promise.
   Upstream ISC license: https://github.com/openwrt/luci/blob/openwrt-21.02/LICENSE */
window.NativeViewInit=function() {
			var vp = document.getElementById('view');

			DOM.content(vp, E('div', { 'class': 'spinning' }, _('Loading view…')));

			return Promise.resolve(this.load())
				.then(LuCI.prototype.bind(this.render, this))
				.then(LuCI.prototype.bind(function(nodes) {
					var vp = document.getElementById('view');

					DOM.content(vp, nodes);
					DOM.append(vp, this.addFooter());
				}, this)).catch(LuCI.prototype.error);
		};
