# MaterialLuCI

面向小米 AX3000T / ImmortalWrt 21.02 Lua LuCI 的 Material 风格主题。**当前正式版本：1.0.0。**

提供 **Classic** 与 **M3E** 两种可切换风格，采用固定顶栏、桌面侧栏和手机抽屉，保留 LuCI 原生菜单、路由、页面标签、表单及保存应用流程。所有运行资源随安装包本地提供，无需 CDN。

## 功能

- Classic：经典 Material 外观，结合官方 MDC Web 控件与原生 LuCI 适配。
- M3E：Material 3 语义配色、官方 Material Web 开关/选择控件与涟漪，配合项目实现的 Expressive 外观和波浪加载反馈。
- 浅色、深色、跟随系统；自定义强调色、卡片及额外着色范围。
- 自定义顶栏标题与文字颜色；侧边栏设备名称可隐藏或自定义。
- 保留原生标签页、嵌套 SectionValue、旧式备份恢复及宽表格局部横向滚动。
- 加载、等待反馈与手机输入法视口适配；滚动时减少无关控件发现、结构扫描和标题颜色计算。

Material Web 2.5.0 提供的是 Material 3 组件；M3E 的波浪进度条由本项目实现，并非官方 Expressive Web 组件。文本框、下拉菜单等仍使用 MDC/原生适配，不宣称全部控件均为 Material Web。

## 下载与安装

[正式版本](https://github.com/Pew2018/MaterialLuCI/releases) · [Actions 构建](https://github.com/Pew2018/MaterialLuCI/actions) · [完整安装与回退说明](docs/INSTALL.md)

1. 下载正式版本中的 IPK，或下载对应 Actions 的 artifact ZIP 并解压。
2. 安装 `luci-theme-materialluci_1.0.0_aarch64_cortex-a53.ipk`。
3. 在 LuCI「系统 → 系统 → 语言和界面 / 语言与样式」选择 MaterialLuCI，保存并应用。
4. 刷新页面，在主题选择项后的「主题外观（此浏览器）」设置风格和颜色。

外观偏好仅保存在当前浏览器，不写入路由器业务配置。无既有偏好时默认 M3E、跟随系统、强调色 `#42A5F5`、启用卡片，额外着色关闭。切换 Classic/M3E 后在下一次完整页面加载时生效，不自动刷新或保存表单；先保存自己的业务修改，再刷新页面。

## 适配范围与验证

当前安装包针对 **aarch64_cortex-a53 / mediatek/mt7981**，目标环境为 AX3000T 的 ImmortalWrt 21.02 Lua LuCI。尚未确认其他固件、架构、ucode LuCI 或全部第三方插件的兼容性。

1.0.0 包含用户已测试的 `0.3.0-16 / 8a77cf948e20` 性能修复。用户反馈滚动性能有极大提升；该反馈不等于所有设备、浏览器和页面均已完成性能验证。

默认 Actions 执行语法、模板、轻量行为回归和最终 IPK 完整性检查，不安装浏览器、不运行截图矩阵。模拟测试不等于真机 CSS 渲染或真实保存应用验证。发布流程只更新版本与文档，保留已测试实现。

## 开发与文档

实际打包源为 `theme/root`，版本与架构元数据来自 `theme/package.json`；重复 `root` 目录保留，不作为当前打包源。代码通过 GitHub 维护、GitHub Actions 构建。

`main` 保存正式成果，后续开发在 `feature/` 或 `fix/` 分支进行，合并正式分支需明确授权。

[文档索引](docs/README.md) · [1.0.0 版本记录](docs/V1.0.0.md) · [Release 文案](docs/release-notes/v1.0.0.zh-CN.md)

## 许可证

本项目采用 [Apache-2.0](LICENSE)。打包时保留 MDC Web、Material Web、Material Color Utilities、Lit 等依赖的许可证及版权说明，见安装包中的 `/usr/share/doc/luci-theme-materialluci/`。
