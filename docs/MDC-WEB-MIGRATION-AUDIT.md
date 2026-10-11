# MDC Web 控件迁移审计与冻结基线

审计日期：2026-10-10（UTC）。工作分支：`feature/classic-native-v1`。本次只新增审计文档，不改变主题运行资源、LuCI 业务、路由或 main。

## 1. 可回退基线

- 审计及备份提交：`fdd2c5b02e9ac783cd7a3d9454eaca1c142fa53c`。
- 备份分支：[`archive/classic-native-v1-20261010-mdc-baseline`](https://github.com/Pew2018/MaterialLuCI/tree/archive/classic-native-v1-20261010-mdc-baseline)，已读回核对提交一致。
- 对应成功 Actions：[38038434565](https://github.com/Pew2018/MaterialLuCI/actions/runs/38038434565)，重新核对 head_sha 与上述提交一致，conclusion 为 success。
- IPK：`luci-theme-materialluci_0.3.0-3_aarch64_cortex-a53.ipk`。
- 上一轮包检验记录 SHA256：`eb3fb5a73ca898ae9187dc3ca64ac431b9dc1ac04988c54b7630ee133bb01c3b`。本轮没有重新下载计算，不把历史哈希记录当作重新检验。
- 缓存版本：`0.3.0-3-fdd2c5b02e9a`；[IPK artifact](https://github.com/Pew2018/MaterialLuCI/actions/runs/38038434565/artifacts/11664941579)；[浏览器截图 artifact](https://github.com/Pew2018/MaterialLuCI/actions/runs/38038434565/artifacts/11665011443)。

备份是固定参考，不在备份分支继续开发。后续从工作分支继续，每批独立提交；需要回退时明确选择对应提交，避免覆盖后续有效修改。本次文档提交不会产生新界面版本；上述 Actions/IPK 对应冻结代码提交，而不是本次文档提交。

## 2. 审计范围与证据边界

直接读取冻结提交的 package.json、theme/mdc.scss、app.js、feedback.js、textfield.js、wait.js、cascade.css、resources/materialluci-menu.js，并阅读仓库设计规范与 MDC Web v14.0.0 官方组件文档。结论是源码级集成审计，不是完整安全审计，也不证明当前路由器正在加载这些资源。

已有 Actions 截图基于解包后的 IPK 和上游 LuCI 渲染器，业务数据由测试提供；不能等同真机 LuCI、真实权限或真实网络配置提交。路由器页面、iPhone Safari 浏览器状态栏和主屏幕显示模式均仍需实机复核。此前附件在当前环境不可读取，本轮不依据那些截图判断像素级对齐。

## 3. 现有控件清单

| 控件 | 源码中的实际实现 | 审计结论 |
| --- | --- | --- |
| 布尔开关 | app.js 创建官方 MDCSwitch；保留原 checkbox，以原字段为提交及状态依据 | 已接入官方组件，不应再次整体替换 |
| 文本框、密码框、textarea | textfield.js 增强原字段，实例化 MDCTextField；不另建替代业务字段 | 已接入官方组件；保留 LuCI 校验、禁用、只读及 reveal 按钮关系 |
| 不确定性进度 | wait.js 实例化 MDCLinearProgress，分别观察 view 与 modal 生命周期 | 已接入官方组件，继续验证真实载入标记和清理 |
| 侧边栏父级 | 同一个原生 button，带 mdc-button/label/icon 类；没有官方 ripple 节点或 MDCRipple 初始化 | 部分官方样式集成，不能称完整 MDC 按钮增强 |
| 侧边栏箭头 | 本地 Google Material Icons expand_more SVG，通过样式展示 | MDC Web 无独立箭头组件；保留官方本地图标与整行按钮，不引入第二个点击控件 |
| 普通按钮、危险操作、页面动作 | 保留 LuCI button/input/div.btn，cascade.css 自定义 MD1 外观 | 下一批优先迁移，先选真实 button |
| 图标按钮 | 本地 SVG/CSS；ml-icon-button 尚未接入官方 icon-button 样式与 MDCRipple | 适合与普通按钮分范围逐步接入 |
| 刷新/暂停 | 保留 LuCI poll-status 元素与原处理；同步可访问名称、键盘和图标 | 存在特殊 DOM 契约，不可直接更换成独立 toggle |
| 涟漪 | feedback.js 在确认 pointerup 且未滚动后插入 tap-ripple；开关排除 | 多数控件仍为自绘；官方与自绘不得同时绑定 |
| 分组 checkbox、原生 radio | 保留原字段，目前主要由 CSS accent-color 着色 | 可接入 MDCCheckbox、MDCRadio、MDCFormField；不是布尔开关 |
| 主题显示模式、choose 单选 | 自定义按钮 role=radio；单选圆环为 CSS | 宜改善原生单选及方向键操作；choose 为公开辅助接口，尚不能证明所有真实页面均调用 |
| 主题色板 | 自定义颜色按钮与选中标记 | MDC Web 无标准色板选择器；保留业务控件，可增强按钮反馈 |
| select、cbi-dropdown、动态列表 | 原 LuCI 元素、键盘行为和字段权威，主题只做外观 | 中高风险；不能把全部下拉框套上 MDCSelect |
| 页签 | LuCI 路由链接和原表单页签，CSS 与自绘反馈 | 先区分导航与局部切换，再考虑 MDCTabBar |
| 对话框、抽屉 | LuCI 原 modal 加主题外观；主题辅助 dialog/drawer 自有焦点、inert、历史处理 | 最后评估；不得叠加两套焦点/关闭管理 |
| 表格、网络设备信息、无线和图表 | LuCI 业务 DOM 与主题语义表面 | 无需为组件覆盖率整体替换；保留状态颜色与原业务功能 |

当前显式 MDC 依赖为 @material/linear-progress、switch、textfield、button，均固定 14.0.0。共同样式由 theme/mdc.scss 构建；名称为 mdc-linear-progress.css 的输出还承载其他 MDC 样式，排查加载时不能仅按文件名判断。

文本框采用官方无内部标签结构，保留 LuCI 外部标签。填充表面 ripple 被主题隐藏，官方底部 line ripple 保留；不能把视觉调整误判成没有使用 MDCTextField。

开关增强只处理符合条件的单一布尔字段；cbi-dropdown、role=group 和多 checkbox 字段被排除。因此“所有 checkbox 都已转为官方开关”不成立。

## 4. 分批实施顺序

### 第一批：普通按钮及适配简单的图标按钮

引入固定版本 @material/ripple、@material/icon-button，补齐官方 ripple/focus/label 结构。先处理主题创建的按钮及确认 DOM 契约安全的 LuCI button，保留原节点、type、name、disabled、事件与确认流程。执行重置只调整表现，不在视觉测试中执行真实重置。

MDC 普通按钮不要求一个 MDCButton JavaScript 构造器；官方增强是 MDCRipple。不得仅添加类名就宣称完整迁移。icon button 可使用本地 SVG，不引入 Google Fonts CDN。

不能立即包装所有按钮文字：部分 LuCI 代码直接访问 firstChild、textContent 或 previousElementSibling。input[type=submit/button/reset] 及 div.btn 作为单独适配范围，先保留当前行为。

每个元素只有一个反馈所有者。现有“确认点按后才涟漪”的行为与官方按下阶段反馈存在差异，需在适配方案中明确处理滑动取消，不能同时保留 tap-ripple 和官方效果。键盘焦点、disabled、reduced-motion 同样需要覆盖。

刷新/暂停后续单独适配：保留 LuCI 指示器首个文本节点和 poll.start/stop 权威，不用 MDCIconButtonToggle 额外重复翻转状态。

### 第二批：分组 checkbox、radio 与主题模式

增加 MDCCheckbox、MDCRadio、MDCFormField，复用原 input 的 id/name/value/checked/disabled/indeterminate，不生成第二套参与提交的字段。保持字段位置契约、标签点击与原生组行为。

主题模式以真实单选语义实现方向键、Tab、Space；保留 localStorage 偏好以及跟随系统逻辑。不要把色板冒称 MDC 官方 color picker。

### 第三批：页签

区分 materialluci-menu.js 输出的路由 anchor 与表单局部页签。导航必须保留 href、ACL 可见性、当前页与新标签页行为；局部切换保留 LuCI 校验、依赖与显示逻辑。避免官方组件和 LuCI 都处理同一次选择。

### 第四批：简单单选下拉

MDCSelect v14 使用 menu 与 data-value 选项结构，不是给原生 select 加类名即可使用；其官方文档还要求对应版本的 deprecated-list 结构。先建立针对简单单值字段的适配，验证隐藏字段、提交值、必填、禁用、键盘、长选项和 viewport 定位。

cbi-dropdown 多选、动态值、动态列表、文件选择器均不包含在第一轮选择框迁移。对无法安全适配的控件保留 LuCI 原逻辑。

### 最后：dialog、menu、drawer

先盘点真实页面调用及 LuCI 生命周期，再考虑官方组件。保证仅一套焦点圈闭、Escape、遮罩、inert 和历史回退处理；不得损坏异步保存、错误提示或未保存表单。无需为全面替换而把普通表格改成 MDCDataTable。

## 5. 设计与业务边界

遵循仓库 TurboIMS-Classic-WebUI-Design-Spec-v1.0.md 的字体、语义颜色、2px 小圆角、克制动效及 48px 触控目标，并结合 LuCI 桌面宽屏布局。不照搬该参考项目的底部导航、特权业务或固定手机内容宽度。

经典 Material 1 视觉与 MDC Web 默认风格并不完全相同；使用固定官方组件实现，通过语义 tokens 和必要样式适配经典外观。不要顺带升级为 Material 3。原设计文档中的自绘控件条目，以本项目当前官方迁移目标为准。

保持：
- 侧边栏同时最多展开一个大项；父级整行一次操作，叶子继续导航；不产生合成“· 概览”入口。
- LuCI 权限、导航路由、原字段值与原生 change、表单提交、确认流程不变。
- 统一字体与颜色角色，强调色文字和背景分开映射；禁止默认 MDC 样式覆盖为固定蓝色或灰底。
- 资源随主题本地打包，构建仅在 Actions，运行时无 CDN。

## 6. 每批验证与交付门槛

1. 在 Actions 构建 IPK 后解包，断言官方代码、必要样式/图标、模板和提交缓存版本确实在包内，记录 run、SHA、IPK 文件名和 SHA256。
2. 手机及桌面 Chromium/WebKit 截图检查：浅/深色、分组卡片开/关、强调色、48px 命中区域、hover/pressed/focus/disabled、缩放/长文字/窗口改变。
3. 交互测试关注行为：一次点击一次原字段变更或业务操作；键盘可用；滑动不误触；DOM 替换后清理且不重复初始化。不能只断言存在类名、构造器或 open=true。
4. 保留真实上游 LuCI 渲染器测试，但明确测试业务数据的边界。安装后核对路由器实际响应 URL、查询版本、资源内容及哈希，而非只清空缓存后猜测。
5. 真机页面复核设置、侧边栏、表单、状态页载入、IPv4、无线、实时信息、刷新/暂停；记录截图与实际结果。配置写入类操作需使用允许测试的字段，真实重置不得用于外观验收。
6. iPhone Safari 状态栏、地址栏、底部工具栏及主屏幕模式单列真机结果。自动 WebKit 截图不能代替；没有证据一律“待验证”。

本轮未修改运行资源、未制作新安装包、未进行新的路由器或 iPhone 实测。后续从第一批按钮开始，每批提交、构建、验收，再推进下一批。

## 7. 官方参考（固定组件版本）

- [Button v14](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-button/README.md)
- [Ripple v14](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-ripple/README.md)
- [Icon button v14](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-icon-button/README.md)
- [Checkbox v14](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-checkbox/README.md)
- [Radio v14](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-radio/README.md)
- [Select v14](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-select/README.md)
- [Tab bar v14](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-tab-bar/README.md)
