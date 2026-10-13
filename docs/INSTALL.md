# MaterialLuCI 1.0.1 安装说明（modern-luci 开发分支）

先确认固件的 LuCI 模板引擎和包管理器，再选择产物。不要将 IPK 改名为 APK，也不要在同一设备混用两种包。SDK 构建产物含 build-manifest.json、提交身份与资源哈希；详见 [兼容范围](MODERN-LUCI.md)。

## 旧版 Lua LuCI：IPK

保留原有 AX3000T / aarch64_cortex-a53 目标，使用 opkg：

```sh
opkg install /tmp/luci-theme-materialluci_1.0.1_aarch64_cortex-a53.ipk
```

Lua 入口为 `/usr/lib/lua/luci/view/themes/materialluci/`。其他旧版架构没有本轮验证，也没有移除原架构断言。

## OpenWrt 25.12.5：ucode APK

本轮固定官方 OpenWrt 25.12.5，与该发布版本固定的 LuCI 提交配套。新版入口为 `/usr/share/ucode/luci/template/themes/materialluci/`。APK 依赖 SDK 默认的 libc、luci-base 及其原生 ucode 依赖，不安装 Lua 模板、不额外要求 luci-lua-runtime。

把 Actions 的真实 APK 上传到 /tmp：

```sh
apk add --allow-untrusted /tmp/luci-theme-materialluci-1.0.1-r1.apk
```

这是自行构建的未签名包，所以使用 --allow-untrusted。包架构是 noarch，来源于资源类型检查及 SDK 的 LUCI_PKGARCH=all 映射；SDK 使用 x86/64，不表示所有硬件已实测。其他 OpenWrt/LuCI 和 ImmortalWrt 分支仍未验证。

## 选择主题与浏览器偏好

安装只注册 MaterialLuCI，不强制更改当前主题。优先使用 LuCI 的“系统 → 系统 → 语言和界面”选择；也可执行：

```sh
uci set luci.main.mediaurlbase='/luci-static/materialluci'
uci commit luci
```

随后刷新页面。默认 M3E、跟随系统、强调色 #42A5F5、卡片开启、额外着色关闭。主题外观保存在当前浏览器，与路由器业务配置分开。切换 Classic/M3E 后重新加载，明暗/强调色可即时应用。需要恢复默认偏好时只清除此站点以 materialluci- 开头的 localStorage 项，不清理路由器菜单配置。

## 升级、卸载与回退

保留官方 Bootstrap。升级安装同名更高版本包，资源 URL 同时带版本和提交标识，不覆盖 LuCI 核心文件。安装脚本只注册本主题；卸载脚本只清理本主题注册项，并在其正在使用时选择已安装的 Bootstrap 入口。APK 的 post-upgrade/pre-deinstall 由官方 SDK 生成，升级路径保留主题选择。

建议先在 LuCI 中切换至 Bootstrap，然后卸载：

```sh
# 固定新版固件
apk del luci-theme-materialluci
# 旧版固件
opkg remove luci-theme-materialluci
```

也可先手动选择已安装的 Bootstrap：

```sh
uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci commit luci
```

不要删除 /etc/config/luci、菜单定义或其他主题。旧版本回退先切回 Bootstrap，再卸载当前 MaterialLuCI，并按相同固件对应的包管理器安装先前包；浏览器外观偏好仍可能保留。

## 新固件最少复测

1. 安装、选择主题、登录及菜单权限。
2. 两种风格和明暗模式、手机输入法与滚动。
3. 一个可回退配置的校验/保存应用/reset，动态列表和嵌套字段。
4. 实际插件页面、LED 说明、局部表格滚动、卸载和重装。

CI 不执行真实设备保存应用、刷写或全插件验证。
