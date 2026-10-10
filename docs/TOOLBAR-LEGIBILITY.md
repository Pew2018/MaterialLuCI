# 顶栏可视性审计（2026-10-10）

起点 d12063552297700f6c9be4a0ef24500dd2dcc7df；备份仍为 archive/classic-native-v1-20261010-mdc-baseline。本轮仅修改 feature/classic-native-v1。

根因：primarySurface/onPrimary 是按钮与顶栏共用的最低对比度角色；中间亮度时可读性余量有限。顶栏图标的通用 button hover/active 规则采用 on-action-tonal，而不是顶栏前景；通用 focus 使用 control-strong，可能与顶栏背景接近。源码审计不证明路由器当前部署资源版本。

修改：palette.js 新增独立 toolbarSurface/onToolbar/toolbarHover/toolbarPressed，背景保留原色相，用 OKLab 亮度及必要色域处理得到标题至少 7:1（算法目标 7.1 留舍入余量），暖亮背景采用 #212121 深色字，其余按可读性选择白字；不改 seed、色板、按钮或主题偏好。startup.js 写入角色。cascade.css 将标题、菜单/返回/轮询图标、交互状态与焦点统一到对应顶栏角色。中性顶栏保留原背景及文字。浏览器 theme-color、安全边界与视口不改。

参考：Material 的 [文字可读性](https://m2.material.io/design/color/text-legibility.html) 要求普通文字至少 4.5:1，浅底深字、深底浅字；[颜色系统](https://m2.material.io/guidelines/style/color.html) 规定与表面对应的 on 色。7:1 是本项目提高可视性的增强目标，不是宣称 Material 所有顶栏都必须 7:1。

验证：ci/colors.cjs 在预设及 512 个分散种子上检查浅/深色静态与交互对比度；ci/toolbar.mjs 在解包 IPK 页面上检查 Chromium/WebKit、390/1440 宽、浅/深色、着色开/关、10 个边界/典型种子，读取实际 computed styles，覆盖移动菜单按钮 hover/pressed/focus；截图包含蓝、金、粉、绿。延续原 Actions IPK 资源断言与 LuCI 渲染兼容测试。

真实路由器/手机浏览器：待验证。安装后核对 package-audit.json 的 SHA/run/IPK 哈希与页面 materialluci-build/cache，再核对 palette.js/startup.js/cascade.css 请求的缓存查询版本和响应内容。截图测试不是 iPhone Safari 状态栏结论。
