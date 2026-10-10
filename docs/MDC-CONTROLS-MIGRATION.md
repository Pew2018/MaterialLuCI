# MDC Web 控件迁移

工作分支 feature/classic-native-v1。备份 archive/classic-native-v1-20261010-mdc-baseline 已按用户授权同步至 6fcd2782065055b7cafeb2da072affd2e35d88cf，包含通过 Actions 38040711225 的顶栏修正。本轮控件迁移不进入备份或 main。

## 覆盖

固定 MDC Web 14.0.0，本地打包：
- 普通 button、按钮链接、legacy div.btn 和页面原生提交按钮的呈现层：官方 Button 样式及 MDCRipple。
- 菜单/返回图标和原 LuCI 刷新/暂停元素：官方 Icon Button 样式及 MDCRipple，不引入额外 toggle 状态。
- 侧边栏、页签链接：官方 MDC Ripple，原导航与展开事件不变。
- 分组 checkbox、radio、独立 ui.Checkbox：官方 MDCCheckbox、MDCRadio，具备标签时接入 MDCFormField；布尔字段继续使用已接入的 MDCSwitch。
- LuCI ui.showModal 弹窗和主题选择对话框：实例化官方 MDCDialog。
- 既有 MDCTextField、MDCSwitch、MDCLinearProgress 保留。

不把增加 CSS 类名当作 JavaScript 已初始化：运行时元素保存对应官方实例，IPK 断言检查官方 bundle 与结构样式，浏览器测试读取实例与实际行为。

## 保持体验的适配

保留原节点、firstChild、名称、字段值、listeners、type、disabled、表单提交、确认、轮询及路由。部分 LuCI 元素的首个文本节点不能包进新的 label；只对已有安全 span 添加 label 类，其余保留文本节点，在原按钮末尾追加官方 ripple 结构。原 input[type=submit/button/reset] 不替换成会改变 FormData 的另一个按钮，官方反馈作用于既有呈现 wrapper。

涟漪由官方 MDCRipple/MDCRippleFoundation 绘制。支持的 foundation adapter 屏蔽默认 pointerdown 与兼容鼠标监听，沿用已确认 pointerup、移动阈值、滚动取消，再激活官方波纹；不会再插入自绘 tap-ripple。键盘、禁用、减少动态效果另行处理。ResizeObserver 更新尺寸，节点卸载时 destroy。

ui.Select 使用 input/label/description 的 sibling 链；官方 checkbox/radio 复用旧 frame，附加背景及涟漪节点放在原孩子之后。不包装或移动 input，不代理第二次点击。保留 checked、indeterminate、disabled 和表单 reset。

LuCI 直接使用 modal_overlay.firstElementChild、modal.lastChild 和调用返回的 modal 节点。因此旧 modal 同时充当官方 dialog 的 container/surface/content，不重新包装业务孩子。通过 MDC 官方 focus-trap factory 提供无 sentinel 的兼容适配，避免焦点节点进入业务孩子列表。关闭、内容替换仍由 ui.showModal/hideModal 权威决定，不新增 Escape/遮罩关闭，忙碌操作不会自动消失。主题 choose 保留原 history 和一次回调；官方组件不叠加第二套按钮 ripple 或重排动作。

视觉继续采用现有字体、尺寸、灰白/深色表面、2px 圆角、语义强调色；不使用 MDC 默认蓝色、字距、大写或更大的最小按钮宽度。移动键盘、弹窗宽度、侧边栏单展开规则保留。

## 边界

复杂 cbi-dropdown、动态列表、文件选择以及原生 select 保留 LuCI。MDCSelect 的自定义菜单会改变原生选择器体验与业务 DOM，无法在“只换组件、体验不改”的要求下直接替换；不宣称已迁移。页签只更换反馈，不引入会改变路由/局部页签行为的 MDCTabBar 状态机。桌面/手机抽屉沿用现有控制逻辑，侧边栏项使用官方反馈；网络盒子、无线状态及图表不是通用 MDC 控件，不整体重建。

这轮覆盖主要动作、输入和模态控件，未声称所有 LuCI 或第三方应用控件都已迁移。原生 window.alert/confirm 保留业务代码调用，本轮不异步改写浏览器阻塞 API。

## Actions 验证

ci/mdc-controls.mjs 使用解包 IPK，检查真实控件的迁移前后尺寸、字体、颜色、圆角与首节点，官方实例、原生字段变更次数、上游 ui.Select sibling 链、ui.Checkbox 隐藏字段、MDCDialog 生命周期、焦点、history 及卸载清理。CI 专用 init flag 才采集 before 样式，运行时不保存整套 computed styles。

延续所有手机/桌面 Chromium/WebKit 测试、状态页、键盘视口与顶栏对比度检查；输出两引擎 dialog/choice/control 截图。真实路由器与 iPhone Safari：待验证。以 Actions 包标识及页面实际资源 cache/SHA 为部署核对依据。
