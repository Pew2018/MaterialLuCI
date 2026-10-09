# MaterialLuCI Classic Native 0.1.0 安装与回退

目标：小米 AX3000T，ImmortalWrt 21.02-SNAPSHOT，mediatek/mt7981，aarch64_cortex-a53，Lua LuCI。
只有一个目标架构的 IPK；这是 Lua 模板与本地网页资源包，不含 ELF，不需要重新刷固件。

## 安装

从本分支成功的 Actions 下载 MaterialLuCI-0.1.0-AX3000T-aarch64_cortex-a53 artifact，解压取得：
luci-theme-materialluci_0.1.0-1_aarch64_cortex-a53.ipk

Mac 终端（路由器 SSH 端口 9210）：

    scp -O -P 9210 ~/Downloads/luci-theme-materialluci_0.1.0-1_aarch64_cortex-a53.ipk root@192.168.6.1:/tmp/
    ssh -p 9210 root@192.168.6.1

路由器内：

    opkg install /tmp/luci-theme-materialluci_0.1.0-1_aarch64_cortex-a53.ipk

安装只注册主题，不自动切换。网页 系统 → 系统 → 语言和界面 / 语言与样式，选择 MaterialLuCI，保存并应用；浏览器强制刷新。
也可以在已确认安装成功后使用：

    uci set luci.main.mediaurlbase='/luci-static/materialluci'
    uci commit luci
    rm -f /tmp/luci-indexcache

顶栏调色板按钮进入外观：浅/深/系统、卡片、强调色、着色范围。本地浏览器偏好不写路由器配置。
三底部入口打开动态菜单，原页面链接照常导航；外观子页返回保留当前表单 DOM 和草稿。

## 回退

路由器内恢复你原有主题：

    uci set luci.main.mediaurlbase='/luci-static/bootstrap_mod'
    uci commit luci
    rm -f /tmp/luci-indexcache

刷新网页。卸载：

    opkg remove luci-theme-materialluci

卸载脚本只删除本主题注册项；若正在使用新主题，优先切回已安装 bootstrap_mod，再回退 bootstrap；没有可用回退则拒绝卸载。升级不注销主题。

## 验证边界

Actions 编译 Lua 模板、压缩本地 JS、检查目标 IPK 和安装脚本；以固定版上游 LuCI 21.02 JS 真实 Checkbox/Select/弹窗验证 Chromium 与 WebKit。预览使用模拟菜单与只读 RPC，不能替代设备验证。
首次实测应核对登录、现有无线/加速/QoS插件、未保存修改、保存应用和主题回退。尚无你的路由器远程访问，不能声称已在该设备运行通过。
复杂多选、搜索下拉与插件原生弹窗保留原业务交互；第一版不改造全部配置页面为独立编辑页，也不替换路由器状态的数据来源。
