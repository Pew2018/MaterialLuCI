# MaterialLuCI Classic Native 0.3.0 安装与回退

目标：小米 AX3000T / ImmortalWrt 21.02-SNAPSHOT（mediatek/mt7981，aarch64_cortex-a53，Lua LuCI）。
GitHub Actions artifact 下载文件是 ZIP，ZIP 内只包含目标路由器的 IPK。不要把 ZIP 改名为 `.ipk`；先解压，再把解压得到的 IPK 上传到路由器。

## 安装

在 Actions 下载 artifact `MaterialLuCI-0.3.0-IPK-in-ZIP-AX3000T-aarch64_cortex-a53`。在 Mac 上双击 ZIP 解压，找到：

`luci-theme-materialluci_0.3.0-1_aarch64_cortex-a53.ipk`

请上传这个 `.ipk` 文件本身；不要上传外层 ZIP，也不要上传 macOS 展开 IPK 后显示的 `control.tar.gz`、`data.tar.gz`、`debian-binary`。

把 IPK 上传到路由器的 `/tmp/` 并安装。请在命令中填写你自己的路由器地址和 SSH 端口：

    scp -O -P <你的 SSH 端口> ~/Downloads/luci-theme-materialluci_0.3.0-1_aarch64_cortex-a53.ipk root@<路由器地址>:/tmp/
    ssh -p <你的 SSH 端口> root@<路由器地址>
    opkg install /tmp/luci-theme-materialluci_0.3.0-1_aarch64_cortex-a53.ipk

安装只注册主题，不自动切换。网页“系统 → 系统 → 语言和界面 / 语言与样式”选择 MaterialLuCI，保存并应用，然后强制刷新浏览器。
也可以在确认安装成功后执行：

    uci set luci.main.mediaurlbase='/luci-static/materialluci'
    uci commit luci
    rm -f /tmp/luci-indexcache

## 回退

路由器内恢复原有主题：

    uci set luci.main.mediaurlbase='/luci-static/bootstrap_mod'
    uci commit luci
    rm -f /tmp/luci-indexcache

刷新网页。卸载：

    opkg remove luci-theme-materialluci

卸载脚本只删除本主题注册项；卸载前先切回已安装主题。

## 验证边界

Actions 检查 IPK 文件和目录条目，并以固定版 LuCI 21.02 JS 真实控件在 Chromium 与 WebKit 验证桌面、手机和平板尺寸。浏览器预览使用模拟数据，设备插件、保存应用与路由器实际呈现仍需在目标设备确认。
