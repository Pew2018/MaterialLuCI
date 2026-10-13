# MaterialLuCI 1.0.0 安装与回退

目标环境：小米 AX3000T / ImmortalWrt 21.02 Lua LuCI，`mediatek/mt7981`、`aarch64_cortex-a53`。本包是主题资源包，不是路由器固件。

## 下载

- [GitHub Releases](https://github.com/Pew2018/MaterialLuCI/releases)：发布后下载对应版本的 IPK。
- [GitHub Actions](https://github.com/Pew2018/MaterialLuCI/actions)：选择目标提交的成功构建，下载 `MaterialLuCI-1.0.0-aarch64_cortex-a53-<提交前12位>` artifact。

Actions 下载的是 ZIP，包含安装包和 `build-manifest.json`。先解压，再使用：

`luci-theme-materialluci_1.0.0_aarch64_cortex-a53.ipk`

不要把 ZIP 改名为 IPK，也不要安装展开 IPK 后的 `control.tar.gz`、`data.tar.gz` 或 `debian-binary`。构建清单记录提交、架构、IPK SHA-256、资源缓存标识和检查结果。

## 安装或升级

先在 LuCI 保存当前业务修改，确认路由器符合目标环境。将 IPK 上传到 `/tmp/`；以下占位符需要换成自己的 SSH 端口和地址：

```sh
scp -O -P <SSH端口> ~/Downloads/luci-theme-materialluci_1.0.0_aarch64_cortex-a53.ipk root@<路由器地址>:/tmp/
ssh -p <SSH端口> root@<路由器地址>
opkg install /tmp/luci-theme-materialluci_1.0.0_aarch64_cortex-a53.ipk
```

安装注册 MaterialLuCI，不自动切换到该主题；升级保留已有主题选择和浏览器外观偏好。

在网页「系统 → 系统 → 语言和界面 / 语言与样式」选择 MaterialLuCI，保存并应用，再刷新页面。也可在安装成功后执行：

```sh
uci set luci.main.mediaurlbase='/luci-static/materialluci'
uci commit luci
```

安装脚本会清理 LuCI 索引与模块缓存。每个构建以版本及提交更新静态资源缓存标识；若升级后仍显示旧资源，强制刷新浏览器。无需删除菜单文件、共享资源或其他主题目录。

## 外观设置

主题选择项后提供「主题外观（此浏览器）」，默认展开；手机可手动折叠，桌面保持展开。可选择：

- Classic / M3E；浅色 / 深色 / 跟随系统。
- 强调色、卡片与额外着色范围。
- 顶栏标题、自动或自定义标题文字颜色。
- 侧边栏设备名称的显示状态和自定义文字。

偏好只作用于当前浏览器。无既有偏好时默认 M3E、跟随系统、`#42A5F5`、启用卡片。风格切换在下次完整加载生效；先保存业务修改，再刷新，不会自动保存或应用 LuCI 配置。

## 回退与卸载

在 LuCI 中先切换到另一款**实际已安装**的主题并保存应用，然后刷新页面。终端也可将 `mediaurlbase` 设置为已安装主题的路径，例如确认安装 Bootstrap 后：

```sh
uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci commit luci
```

确认原主题可用后卸载：

```sh
opkg remove luci-theme-materialluci
```

卸载脚本在 MaterialLuCI 仍被选中时优先回退到已安装的 Bootstrap Mod，其次 Bootstrap；两者均不存在时会拒绝卸载并要求先选择其他主题。浏览器中的外观偏好不会随卸载删除。

## 验证边界

默认 Actions 检查脚本、模板、轻量行为契约，以及实际 IPK 的结构、资源、许可证、提交身份、资源哈希和缓存标识。不会默认运行 Chromium/WebKit 或截图矩阵。

用户已测试 1.0.0 所基于的开发版本，反馈滚动性能有极大提升。其他浏览器、固件及第三方插件仍需实际验证；备份恢复、固件刷写、重启等原生操作保持 LuCI 自身语义。
