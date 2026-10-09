# MaterialLuCI

面向小米 AX3000T / ImmortalWrt 21.02 Lua LuCI 的经典 Material 系统工具主题。

以用户提供的 [Classic 设计规范](docs/TurboIMS-Classic-WebUI-Design-Spec-v1.0.md) 为视觉基础：
56px 顶栏、平面分组、小圆角、细轨道开关、下划线输入、主次按钮、克制涟漪和浅色/深色/跟随系统。

0.3 网页适配采用桌面侧栏与手机抽屉。保留原 LuCI 菜单分组、顺序、URL、页面标签和业务控件。
正文不再限宽 620px，宽表格局部横向滚动。主题外观收纳在原主题选择项后的折叠区。

- 独立主题目录，保留 LuCI 配置与 RPC，不覆盖共享核心资源。
- 当前为 Classic Native；0.3 首次接入官方 MDC Web 线性进度条，其余界面继续自绘。
- 默认 system / #42A5F5 / 平面；所有资源本地，偏好仅存于浏览器。
- 手机输入法通过可见视口适配弹窗，正文保留自然滚动与浏览器缩放。
- Actions 仅构建 aarch64_cortex-a53 IPK；下载 ZIP 解压后安装内部 IPK。

[安装与回退](docs/INSTALL.md) · [0.2 实现与验证边界](docs/V0.2-WEB-ADAPTATION.md) · [研究文档](docs/README.md)

浏览器验证使用模拟数据和固定版真实 LuCI 控件。
实际设备插件、保存应用及 iOS/Android 真机输入法仍需在路由器确认。
