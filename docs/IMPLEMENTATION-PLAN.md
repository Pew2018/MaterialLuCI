# MaterialLuCI 实现方案与多风格架构

日期：2026-10-09（Asia/Hong_Kong）
状态：研究与规划；尚未实现主题、构建流程或运行测试。

## 1. 已确认的要求

- 项目：Pew2018/MaterialLuCI，默认分支 main。
- 源码在 GitHub 维护，通过 GitHub Actions 检查、构建安装包和生成预览；不在本地克隆、编辑或编译项目代码。
- 当前只允许归档文档，不开始实现。本文中的目录、接口、包名和导航都是实施建议，不代表已有代码。
- Classic 的审美以用户提供的 TurboIMS-Classic-WebUI-Design-Spec-v1.0.md 为基准。
- 用户要求三种风格：自绘 Classic、使用 MDC Web 的经典 Material、使用新版 Material 组件的风格。
- 不复制 TurboIMS 的 IMS 业务、KernelSU 桥接或宿主专用接口。

## 2. 目标环境与证据

用户设备：ImmortalWrt 21.02-SNAPSHOT r20651-02fff2aebc，mediatek/mt7981，aarch64_cortex-a53，小米 AX3000T。
LuCI base：git-23.098.38725-847bd6b；页面标识为 openwrt-21.02 分支。
当前 mediaurlbase：/luci-static/bootstrap_mod。
分析依据：用户导出的主题文件与截图；未直接访问路由器，未验证真机操作。
详细发现见 CURRENT-THEME-AUDIT.md。

目标是独立可切换的 LuCI 主题包，保留原主题作为回退。不覆盖共享 menu-bootstrap.js、cbi.js、ui.js 等核心资源；新主题使用独立路径。

## 3. 风格与组件实现分离

| 风格标识（建议） | 实现 | 规则 |
| --- | --- | --- |
| classic-native | 原生 HTML/CSS/JS | 默认版本，严格复现用户文档 |
| classic-mdc | MDC Web 按需组件 | 尽量复现 Classic；默认组件与规范的差异逐项记录 |
| material3 | @material/web 按需 Web Components | 独立视觉规则，共享功能语义与质量要求 |

第一版先实现 classic-native，验证 LuCI 适配层与设计系统，再接入另外两种。
自绘不是“性能一定更好”的保证；官方组件也不必然更慢。资源体积、初始化、绑定次数、测量与滚动需要实际测量。

MDC Web 不等于精确的 Material 1 实现；选定版本及组件后仍需调整。
真正 Material 3 的形状与状态语言与 Classic 禁止胶囊、大圆角的规则存在冲突。用户要求的新风格作为单独范围；其具体尺寸与形状尚待确定，不能声称同时严格满足 Classic 全部规则。

官方资料：
- https://github.com/material-components/material-components-web （2025-01-13 归档）
- https://github.com/material-components/material-web （Material 3；维护模式）
- https://github.com/material-components/material-web/discussions/5642

依赖在实施时锁定版本；所有运行资源本地打包，无 CDN。保留各上游许可证和版权，用户提供规范不自动替代组件源码的授权。

## 4. 四层职责

### LuCI 适配层

负责原控件的值、名字、校验、依赖、脏状态、保存应用、菜单和权限。
业务以 LuCI 为准；UI 不自行绕过权限、拼接 shell 或重复实现后端。
适配 Lua CBI 与 JavaScript 页面，并核对现有插件行为。

### 共享交互层

负责加载、错误、忙碌状态、焦点、弹窗、草稿保护与可访问性。
保持按钮标签稳定，执行状态单独展示。
导航与外观修改不写入路由器配置。

### 控件实现层

提供按钮、switch、checkbox、choice、text field、dialog、tabs、progress 等实现。
建议共同接口：mount、getValue、setValue、setDisabled、setReadOnly、setError、focus、destroy。
事件转发必须触发 LuCI 原有依赖和验证，防止重复监听。
先保留原控件契约，再逐项增强；不把全部 checkbox 当作 switch。
Web Components 单独核对事件、表单参与、焦点与 Shadow DOM 样式边界。

### 视觉风格层

提供字体、尺寸、间距、表面、阴影、动效和颜色映射。
同一用户 seed 可以映射到不同风格的角色，但原 HEX 不改变。
Classic 使用规范附录算法；Material 3 的映射单独定义。

## 5. 建议源码组织

这是未来规划，当前不创建以下实现目录：

- shared/luci：LuCI 适配。
- shared/ui：共享交互、焦点与状态。
- shared/theme：偏好与风格注册。
- renderers/native、renderers/mdc、renderers/material-web：组件实现。
- styles/classic-native、styles/classic-mdc、styles/material3：风格资源。
- packages：包定义、依赖、注册与安装文件。
- previews：明确标识模拟数据的预览页面。
- tests：有意义的兼容、交互和颜色测试。
- .github/workflows：后续 Actions。
- docs：规范、架构、审计与设计决策。

使用单仓库共享代码，不以长期独立分支承载每种风格。实际目录可在确认构建体系后调整。

## 6. 风格注册与偏好

每个风格登记 id、名称、renderer、资源入口、能力、颜色策略、布局参数、回退与版本。
新增风格只修改该风格及注册入口，不修改业务保存逻辑。
能力描述包括卡片、着色顶栏、自定义强调色等；不支持的选项不要假装生效。

偏好使用 materialluci-* 前缀：
- 风格。
- 浅色／深色／系统。
- 原始强调色。
- 各风格独立的卡片、着色范围等设置。

Classic 默认：跟随系统、平面、seed #42A5F5、额外着色关闭。
启动前置读取避免主题闪烁；localStorage 不可用时有安全默认值。
系统模式监听 prefers-color-scheme；强制浅深色不随系统变化。

浅深色和颜色即时切换。第一版跨 renderer 切换保存偏好后刷新，先处理未保存修改；不现场强制重建所有表单。

## 7. Classic 布局与导航

- 56 px 顶栏与 56 px 底导航，正文独立滚动。
- 默认产品标题 MaterialLuCI；页面标题用正文分组层级；专用编辑页显示字段名称。
- 620 px 普通内容最大宽；24 px 平面左右边距。
- 建议三个入口：状态／网络／设置。状态包含运行信息与日志；网络包含接口、无线、DHCP、路由、防火墙；设置包含系统、插件、软件包与外观。
- 三入口分组属于建议，具体菜单映射须核对 LuCI 菜单树。保持真实 URL、权限和插件发现，不写死插件列表。
- 宽表格局部横向滚动；如果真机测试证明 620 px 明显限制操作，宽屏例外单独记录和确认。
- 不直接将 LuCI 改造成 SPA。跨页面保留真实导航；同页外观子页、弹窗按规范使用 History API。
- 原文的 tabs replaceState 与常驻 DOM 不能生硬照搬到跨文档 LuCI 链接。需测试未保存修改、返回和浏览器 forward。

## 8. 组件与行为约束

- 正文 14/1.4，标题与说明按原规范；普通数据中性，危险独立语义。
- 分组平面默认、可选 2 px 圆角卡片；不每行卡片。
- 标准主次操作 112×48 px、2 px 圆角；长文案和紧凑表格操作需明确适配，不隐藏必要文字。
- switch 28×10 轨道、16 px 滑块、48 px hit area，ON/OFF/disabled 分开。
- 简单单选使用自绘 dialog；复杂多选、搜索下拉保留功能再适配。
- 标准输入使用下划线；独立字段适合编辑页，复杂表单保持原位。
- 288 px dialog 用于简短选择与确认，复杂 LuCI 编辑 dialog 按内容适配。
- 优先保留 LuCI 弹窗生命周期，只替换视觉与必要的反馈，不全局替换 Promise 或确认逻辑。
- input[type=submit] 不能直接插入 ripple span；用安全外层反馈或逐项转换，不损坏提交行为。
- 保存、应用、重置草稿、恢复系统原值是不同动作，保留原含义。

## 9. 涟漪、动态控件与性能

Classic 按规范 pointerdown 记录、pointerup 确认；鼠标 8 px／触摸 10 px 容差，滚动 >2 px 取消，360 ms 动画、500 ms 清理。
适配实际滚动祖先，包括 dialog 和局部表格；普通行与正文不统一绑定。
动态挂载补绑定，WeakSet 防重；destroy 清理组件监听与实例。
只加载当前风格的资源，按需引入组件，不初始化三个库或全组件集。
优先接入已知渲染生命周期；插件回退使用范围受限观察，避免全页反复扫描。
MDC/Material Web 自带反馈与自绘反馈不能叠加；Classic MDC 必须核对规范时序。
不拦截惯性滚动，不全局 pointermove，不为每行常驻 will-change。
数据、地址、日志和输入可复制；控件清除浏览器默认蓝色遮罩。
保留 focus-visible、reduced motion、dialog 焦点与 keyboard 行为。

## 10. 状态首页与未完成研究

状态页按设备摘要、系统信息、资源、网络顺序组织；摘要只读，不伪装跳转大卡片。
标签次文字，数据主文字；数值与资源条分离，不装饰性 Dashboard。
WAN 已连接不等同互联网可用；未知数据明确表示。
导出包缺少完整状态页、核心 UI 与插件源码，因此尚未确定温度、CPU、网口区域的真实生成结构。

实施前继续读取匹配版本的状态、网络、防火墙、软件页与 mtwifi-cfg、eqos-mtk、turboacc-mtk 等页面；核对核心 cbi/ui/form 和菜单契约。不要求上传包含密码的整机配置备份。

## 11. Actions 与交付

- 面向实际 Lua LuCI 环境构建 .ipk，不编译整套固件。
- 计划共享核心包 + 三个可选风格包，可选合集；包拆分属于建议，先验证安装依赖与卸载回退。
- 默认自绘 Classic，其他风格按需安装。
- Actions 做静态检查、构建、包内容检查、预览截图与 artifact 上传。
- 预览必须区分模拟页面和真实 LuCI，不能把静态截图当作保存应用验证。
- 版本、产物命名、SDK/构建基础与依赖锁定在实施前确定。
- 尚未配置或运行 Actions，本次不宣称编译成功。

## 12. 分阶段与验收

1. 补齐核心及插件研究与授权核对。
2. 自绘 Classic：独立包、布局、颜色、外观设置。
3. 标准控件、导航、弹窗、动态初始化与反馈。
4. 状态、网络、防火墙、软件及现有插件适配。
5. Actions 构建与路由器实测。
6. 接入 Classic MDC，然后 Material 3。

同场景比较资源体积、初始化、动态渲染与滚动操作，不预先宣称性能结果。
验收覆盖登录、主题切换、菜单权限、值与依赖、未保存草稿、保存应用、失败恢复、卸载回退。
Classic 颜色文字 >=4.5:1，控件 >=3:1；全预设和极值、浅深色、按钮按下都检查。
确认动态节点无重复绑定，滚动无误反馈、操作不因 UI 渲染被重复执行。

## 13. 待决事项

- 三入口菜单最终分类与插件放置。
- 宽表格的桌面宽度例外。
- Material 3 的具体视觉参数及与 Classic 共用的密度边界。
- 组件库固定版本、首批使用组件及回退策略。
- 包拆分、构建基础、版本号与产物命名。
- 上游实现与组件许可证核对。

这些不阻碍归档研究，但不能在开始实现时默认全部已获确认。
