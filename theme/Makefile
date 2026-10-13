# Copyright 2026 Patrick (Pew2018). Apache-2.0.
include $(TOPDIR)/rules.mk
include $(CURDIR)/version.mk
LUCI_TITLE:=MaterialLuCI Classic and M3E (ucode)
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all
LUCI_MINIFY_JS:=0
LUCI_MINIFY_CSS:=0
LUCI_MINIFY_LUA:=0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
LUCI_URL:=https://github.com/Pew2018/MaterialLuCI
LUCI_MAINTAINER:=Patrick <Pew2018@users.noreply.github.com>

define Package/luci-theme-materialluci/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
uci -q set luci.themes.MaterialLuCI='/luci-static/materialluci'
uci -q commit luci
exit 0
endef

define Package/luci-theme-materialluci/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
[ "$${PKG_UPGRADE}" = "1" ] && exit 0
[ "$$1" = "upgrade" ] && exit 0
if [ "$$(uci -q get luci.main.mediaurlbase)" = "/luci-static/materialluci" ]; then
    fallback=''
    for candidate in bootstrap bootstrap-light bootstrap-dark; do
        if [ -f "/usr/share/ucode/luci/template/themes/$$candidate/header.ut" ]; then
            fallback="/luci-static/$$candidate"
            break
        fi
    done
    [ -n "$$fallback" ] || { echo "Select another installed theme before removing MaterialLuCI." >&2; exit 1; }
    uci -q set luci.main.mediaurlbase="$$fallback"
fi
uci -q delete luci.themes.MaterialLuCI
uci -q commit luci
exit 0
endef
include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
