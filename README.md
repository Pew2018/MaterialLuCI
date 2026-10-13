# MaterialLuCI

MaterialLuCI 为 LuCI 提供共享的 Classic 与 M3E 外观，使用固定顶栏、桌面侧栏和手机抽屉。资源与官方 Material 组件全部本地打包，无 CDN。

当前开发版本 **1.0.1**。本分支 `feature/modern-luci` 在保留旧版 Lua IPK 的基础上，增加固定 **OpenWrt 25.12.5 / LuCI 128a7812f4be233c5dd7f7466f534fd888785caf** 的原生 ucode 模板和 SDK APK 构建。稳定 main 仍为 1.0.0，不受本分支影响。

| 安装包 | 入口与支持范围 |
| --- | --- |
| Lua IPK | 原有 Lua LuCI / AX3000T 目标；aarch64_cortex-a53 |
| ucode APK | 固定 OpenWrt 25.12.5；官方 SDK 生成真实 APK；资源包 noarch，其他设备未实测 |

两类包用于不同固件环境，不能互相改名或混装。新版不要求额外安装 Lua 兼容层。

## 外观与原生功能

- Classic/M3E；浅色、深色、跟随系统；强调色、卡片、顶栏/分类额外着色。
- 顶栏文字和颜色自定义；侧栏设备名称显示与自定义。
- 默认 M3E、跟随系统，强调色 #42A5F5，卡片开启，额外着色关闭。偏好保存在当前浏览器 localStorage；更换风格后重新加载页面。
- 保持原生菜单权限、路由、页面标签、字段、校验、依赖和保存应用行为。
- 保留固定顶栏、手机输入法处理、键盘焦点、嵌套 SectionValue、局部表格滚动及 LED 说明修复。
- 保留已验证的滚动性能优化；迁移未改写共享运行脚本或调整业务轮询。

## 安装、构建与验证

下载 [Actions](https://github.com/Pew2018/MaterialLuCI/actions) 中对应提交的产物；每包带提交、资源哈希、缓存标识及构建清单。

- [安装与卸载](docs/INSTALL.md)
- [固定目标、模板入口、前端契约、架构与复测范围](docs/MODERN-LUCI.md)
- [构建目标及 SDK 校验元数据](ci/modern-target.json)

真实打包源为 `theme/root`；旧 Lua 模板继续保留，新模板位于 `theme/ucode`。重复的顶层 `root` 不参与构建，未删除或同步覆盖。

默认 CI 保留精简旧版校验，并在本适配分支增加 SDK APK 完整性检查、匹配引擎的 ucode 渲染和少量真实新版 LuCI 控件契约验证。无真实路由器环境：保存应用、回退、硬件状态及第三方插件尚需真机复测。未声明所有 ImmortalWrt、所有架构设备或所有新版 LuCI 均已兼容。

项目遵循 Apache-2.0；第三方组件许可随安装包保留。
