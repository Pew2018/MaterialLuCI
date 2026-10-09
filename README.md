# MaterialLuCI

面向小米 AX3000T / ImmortalWrt 21.02 Lua LuCI 的经典系统工具主题。

第一版 Classic Native 严格以用户提供的 [Classic 设计规范](docs/TurboIMS-Classic-WebUI-Design-Spec-v1.0.md) 为审美基础：
56 px 顶栏与底导航、平面/2 px 卡片分组、细轨道开关、下划线输入、主次方形按钮、确认点按涟漪、语义强调色与浅/深/系统。

- 独立主题目录，保留 LuCI 原配置与 RPC；不覆盖共享核心资源。
- 当前实现仅 Classic Native，无 MDC/Material Web 依赖。
- 默认 system / #42A5F5 / 平面 / 额外着色关闭。
- 菜单动态读取，三入口状态/网络/设置；保留原页面 URL。
- 所有资源本地，界面偏好只保存在浏览器。
- GitHub Actions 构建唯一目标 aarch64_cortex-a53 的 .ipk，并做真实上游 LuCI JS 控件浏览器验证。

[安装与回退](docs/INSTALL.md) · [实现记录](docs/V0.1-IMPLEMENTATION.md) · [研究文档](docs/README.md)

预览数据为模拟内容；设备插件、保存应用及整套状态页仍需在目标路由器验证。
