# MaterialLuCI 1.0.1-9：滚动证据与交付

测量中的持续滚动大间隔已明显改善，弹窗控件和 Classic Switch 的悬浮位移已修复。**用户 macOS Safari、物理触控板惯性和真实路由器仍未验证；完整加载阶段仍有大 rAF 间隔，不能宣布全部流畅性问题已经解决。**

## 安装包与源码身份

- 分支：`feature/m3e-theme`。没有修改或合并 main/master、feature/modern-luci。
- 正式打包生产提交：`78a264b89437c6fe848682896a9fbe4ab7532145`。
- 版本：`1.0.1-9`，从实际已构建的 `1.0.1-8` 递增，theme/package.json 与顶层 package.json 同步。
- [成功构建](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480404)。
- [IPK 与 build-manifest.json](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480404/artifacts/11880890127)。
- 文件：`luci-theme-materialluci_1.0.1-9_aarch64_cortex-a53.ipk`。
- SHA-256：`db402769d63b6a6ca9a6254818b960bc5ba0007824a8b70c8107b0f24c0c7f5f`。
- 架构：aarch64_cortex-a53；目标：mediatek/mt7981；资源缓存标记：`1.0.1-9-78a264b89437`。
- 实际解包核实：四份阴影 SVG 资源齐全，包中没有 CI 脚本、诊断禁用开关或压力轮询；保留官方 MDC 14 与 Material Web 2.5.0。manifest 的全部包审计检查通过，并独立核对了实际 IPK 的 SHA-256。

部分最终回归/对照运行在 a3dbce222354552eb64f1107060d8e580f8ab629，加载任务运行在 c07bc18b7466d8d7715444f8ba7d977b115bb8b4。它们与最终打包提交的**整个 theme 源码树 SHA 完全相同**：
`2e7cc5c7f09ecf2fce61bfd4b30c7b59fc25f84d`。
后续差异仅是 CI 工作流和时钟补测脚本，[可核对差异](https://github.com/Pew2018/MaterialLuCI/compare/a3dbce222354552eb64f1107060d8e580f8ab629...78a264b89437c6fe848682896a9fbe4ab7532145)。打包缓存标记随构建 SHA 改变，生产主题代码、资源和元数据版本相同。此报告是之后的文档归档，不改变上述打包源码。

## 对 #387 的直接回答

#387（447dcfe70cb454988592fb42510a9cc10dc07e23、1.0.1-8）**有流畅性优化，但不完整**。它继承了：

1. 移除 html 上阻断 WebKit wheel 链路的 overscroll containment，保留嵌套侧栏/modal 的原生边界。
2. 外观设置初始化只计算色板所需的前景色，并将整树同步反馈绑定交给运行时逐个发现。

“retire superseded measurement runs” 这笔提交本身只清理旧 CI。上述改动并没有证明持续滚动已经解决，用户仍感到低流畅性与后续有效测量相符。

较早 c34/f327 的 WebKit 主页面 wheel 场景实际没有滚动容器移动；不能把其 rAF 间隔作为可见滚动验收。旧工作流的性能步骤完成与整套回归成功也必须区分。

## 已证明、关联与未确认

**已证明，限于本轮 Actions 浏览器条件：**

- 原 html containment 会让 WebKit 收到未被阻止的 wheel，却不移动主页面；仅改变该边界即可恢复移动。这项修复已在 #387 中。
- 停止并排空全部原生 poll 后，System 长表卡片仍有大量连续长间隔。只去掉阴影的单变量诊断显著改善；保持背景、padding、圆角、尺寸和 DOM 的阴影九片绘制也显著改善。因此原生大卡片阴影绘制路径是该 GTK WebKit fixture 的关键成本来源。**尚未取得它内部具体栅格/合成范围的 WebKit trace，更不能直接将它命名为用户 Safari 的根因。**
- 原外观初始化的全色板生成与整树反馈绑定是已采样的 JS 热点；此前已减负，本包继续保留。
- Classic opkg checkbox 的官方 ripple 默认测量整个句子标签，测得 foreground 初始尺寸约 200px、最终直径约 335px。局部控制层应为 48px。
- Classic Switch 普通态为 48px、hover 规则却为 36px，造成滑块横移 6px；hover 没有改变其值。

**关联线索：**用户 Safari 的低流畅性可能与上述渲染路径有关，但没有真机 Timelines/Frames/Layers 证明。卡片开关同时改变几何，因此早期“卡片关联”本身不能证明阴影因果；本轮另做了阴影单变量。

**未确认候选：**sticky/overflow 的其他渲染边界、MDC 尺寸布局、discover/prepareRecords 的潜在极端成本，以及剩余加载/稀有尖峰。没有据此添加全局图层、contain、content-visibility、惯性滚动或延长延迟。

单纯把阴影移到伪元素，或给诊断伪元素合成候选，没有改善 WebKit，已放弃且没有进入生产包。

## 最小修改

实际源码始终是 theme/root，顶层旧 root 副本没有被当作打包源码修改。

| 文件/位置 | 改动 |
| --- | --- |
| theme/root/www/luci-static/materialluci/cascade.css：原卡片规则 | 使用缓存的小尺寸 border-image 绘制阴影边缘；保留背景、padding、圆角、间距、DOM、原滚动容器和原生滚动 |
| design-m3.css、icons/card-shadow-*-v1.svg | Classic/M3E、浅/深色四份 80×80 阴影，半径 2/16px、原阴影颜色/偏移/模糊参数；只缩放直边，没有为卡片创建独立 GPU 图层 |
| controls.js selection()/geometry() | 用官方 MDCRippleFoundation 的公开 adapter 测量 48px 控制反馈层；保留原 input/label/description 兄弟关系、值、回调、键盘和销毁 |
| cascade.css：modal 原生动作与 label | 覆盖 opkg 的原生 div.btn，两个按钮统一 48px 高；标签保留 auto flex basis，窄屏正常换行 |
| cascade.css：Switch 原尺寸规则 | 普通/hover/active/disabled 均保留 48px hit 几何，消除 6px 位移 |
| theme/mdc.scss 与反馈规则 | 保留官方轻微 hover/focus/pressed 状态层；Classic hover opacity 为 .04，没有用关闭官方反馈掩盖问题 |
| app.js openAppearance()/updateSwatches()、palette.js swatchForeground() | 此前 #387 已有的初始化减负继续打包，前景色与原全色板结果精确一致，未重复实现 |
| package.json、theme/package.json | 1.0.1-9；保留 SHA 缓存失效 |

浅色阴影诊断的几何完全不变；Chromium 前后截图的边缘最大通道差异为 Classic 4/255、M3E 2/255，属于两种模糊绘制的边缘差异，并非像素完全相同。没有重新设计按钮、弹窗或菜单。深色、窄屏等截图见相应产物，真实 Retina Safari 的边缘呈现未验证。

Material 官方支持悬浮状态反馈，悬浮不代表 selected 值改变。轻微状态提示合理；本次 6px 滑块位移属于主题尺寸冲突。参考：[MDC v14 Switch 状态](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-switch/_switch-theme.scss)、[Material Web 2.5.0 Switch tokens](https://github.com/material-components/material-web/blob/v2.5.0/tokens/_md-comp-switch.scss)。没有关闭整个反馈组件。

## 条件与有效性

- Actions Ubuntu 24.04，Playwright 1.55.1，Chromium 140.0.7339.186、WebKit 26.0（GTK）。headed，Xvfb，1280×844 / 390×844；控件回归另有 320px。
- 默认浏览器缩放/设备缩放配置；未核实真实显示器刷新率，也没有记录足够完整的 runner 忙碌状态。不能把 16.7ms 固定作为所有设备的验收预算。
- 每个成对条件至少三次，AB/BA/AB 顺序；所有计入滚动结论的 case 都断言容器移动超过 200px。
- wheel 上下及反转，scrollTo 只用于复位。固定输入次数与请求间隔，**实际采样时长不同**，因为 browser wheel acknowledgement 在慢场景会阻塞。因此数据不是等墙钟时长/FPS 对照，也不能直接比较总更新次数或跨线程累计时长。
- System 使用固定版真实旧 LuCI System/NTP 实现，加 40 行原生 JSONMap 长表扩展使页面足够长。扩展不是路由器生产 System 的原样长度。
- [OpenWrt LuCI 固定版本](https://github.com/openwrt/luci/tree/e4c46338b196e486a88b1a75b78e283708c82bc4)，ImmortalWrt 补充固定版本 5829eabba50ec0afa17d2ee486bc90dc15180c34。目标固件的实际 LuCI commit 未知，不能声称完全等同目标 SNAPSHOT DOM。
- System idle：停止原生 poll，等待全部在途项 ready，再等待 1.2 秒，断言时钟写入计数和值不增长。最终 idle 组 clockWrites 为 0。
- 原生时钟格式/节点/写法保留，周期 5s。72 wheel 的部分 native 组未实际更新，被排除出更新期结论。补测使用 120 wheel，**每个 before/after case 都必须实际发生至少一次时钟写入**。早期短窗口数据仍保存，未删去好/坏样本。
- 图表为固定版实际 SVG 与原始更新回调，1/4 图、停止更新/原生 3s/150ms 压力周期分开；不再以 16 个模拟 SVG 作为生产结论。
- 加载：从文档初始化前开始记录 rAF/trace，加载阶段包含浏览器/主题初始化及 fixture 准备；原生 120 行代表租约表插入后立即开始 wheel，不把所有加载成本称为主题 JS。它不是目标固件租约页的完整复刻。
- 原生 RPC/设备写入没有执行；控制回归使用隔离 JSONMap 与只读模拟数据。没有实际安装/删除软件、修改网络或固件。

## 性能结果：范围与异常

下面是每侧三次重复的范围；max 是该组所有样本最大值，尖峰次数为三次总计。单位 ms。完整 P50/P95/P99、原始序列、时间位置、更新记录、实例/分类计数在 comparison.json。

### 真正空闲，System，浅色、卡片开启，72 wheel，#387 → 最终主题

| WebKit 场景 | P95 前 → 后 | max 前 → 后 | >34ms 前 → 后 |
| --- | --- | --- | --- |
| Classic 1280 | 104–105 → 18–19 | 113 → 24 | 624 → 0 |
| M3E 1280 | 81–85 → 17–18 | 146 → 22 | 463 → 0 |
| Classic 390 | 45–46 → 17 | 52 → 18 | 651 → 0 |
| M3E 390 | 35–38 → 17 | 47 → 17 | 166 → 0 |

各组实际时长：桌面 Classic 前约 21.1–21.7s、后 6.0–6.1s；桌面 M3E 前 13.1–13.6s、后约 5.2s。390px 前约 8.0–9.7s、后约 4.0–4.3s。所有这些组没有业务时钟更新；实例稳定、surfacePasses 为 0。Chromium P95 约 16.7–16.8ms，已有单次 before M3E 桌面约 49.9ms，after 对应组最大约 16.8ms；不据此排除 WebKit 问题。

### 原生时钟确实更新，120 wheel，#387 → 最终主题

| WebKit 场景 | P95 前 → 后 | max 前 → 后 | >34ms 前 → 后 |
| --- | --- | --- | --- |
| Classic 1280 浅 | 207–212 → 26 | 229 → 35 | 1063 → 1 |
| Classic 1280 深 | 209–224 → 26 | 240 → 29 | 1052 → 0 |
| M3E 1280 浅 | 135–143 → 19–20 | 153 → 22 | 1022 → 0 |
| M3E 1280 深 | 138–139 → 20 | 156 → 25 | 1017 → 0 |
| Classic 390 浅 | 91–92 → 18 | 100 → 20 | 750 → 0 |
| M3E 390 浅 | 61–62 → 17 | 64 → 18 | 991 → 0 |

每个 Chromium case 至少一次时钟写入；每个 WebKit case 1–14 次，随实际时长变化。WebKit 桌面 Classic 前 71.4–76.0s、后约 12.0–12.1s；M3E 前约 45.4–47.1s、后约 10.4–10.7s。Chromium 各组 P95 仍约 16.7–16.8ms，但 **after Classic 390 有一次 66.7ms 间隔**；before M3E 390 有 366.6ms 异常。不能用 P95 隐藏它们或无证据称为正常噪声。较早 72 wheel 的有效 WebKit M3E 深色桌面 native case 也保留了一次 35ms after 间隔。

### 原生图表，1280，浅色、卡片开启，72 wheel，#387 → 最终主题

| WebKit 条件 | P95 前 → 后 | max 前 → 后 | >34ms 前 → 后 |
| --- | --- | --- | --- |
| Classic 1 图、更新停 | 132–133 → 19 | 140 → 21 | 611 → 0 |
| Classic 1 图、原生 3s | 133–134 → 18–19 | 161 → 21 | 611 → 0 |
| Classic 1 图、压力 150ms | 133–136 → 19 | 150 → 21 | 635 → 0 |
| Classic 4 图、更新停 | 121–122 → 18–19 | 132 → 25 | 546 → 0 |
| Classic 4 图、原生 3s | 121 → 18–19 | 141 → 20 | 555 → 0 |
| Classic 4 图、压力 150ms | 122–124 → 18–19 | 157 → 29 | 598 → 0 |
| M3E 1 图、更新停 | 158–163 → 19–20 | 201 → 23 | 598 → 0 |
| M3E 1 图、原生 3s | 166–172 → 20 | 205 → 22 | 603 → 0 |
| M3E 1 图、压力 150ms | 157–168 → 20–21 | 188 → 23 | 638 → 0 |
| M3E 4 图、更新停 | 141–149 → 20 | 166 → 24 | 543 → 0 |
| M3E 4 图、原生 3s | 147–149 → 20 | 165 → 23 | 562 → 0 |
| M3E 4 图、压力 150ms | 147–149 → 21 | 169 → 24 | 612 → 0 |

所有 native/pressure case 发生了真实图表更新，off 组为 0。WebKit 前约 22–32s、后约 5.8–6.8s，因此 before 的更新次数更多。off 组同样改善，支持共同的卡片绘制成本，而不是把全部成本归因于图表业务脚本或声称主题改写了它。生产轮询周期和图表脚本没有降低/删除。

Chromium 基本保持 P95 16.7–16.8ms；before M3E 单图压力组有 116.6ms、2 次 >34ms 异常，after 该组最大约 16.8ms。不能据单次异常宣称 Chromium 广泛提速。

### 加载/增强：历史 f327 → 最终主题

| 指标 | Chromium 前 → 后 | WebKit 前 → 后 |
| --- | --- | --- |
| 各样本最大 flush 的范围 | 24.7–31.1 → 9.9–14.3 | 24–30 → 10–15 |
| 完整加载阶段最大 rAF 间隔 | 70.0 → 60.4 | 287 → 212 |
| 租约长表插入后桌面 wheel P95 | 约 16.7–16.8，基本不变 | 226–234 → 21–22 |

该 JS 减负在 #387 中已经存在，不能称为 1.0.1-9 新增的调度优化。完整加载包含业务 fixture 准备，仍有显著间隔；修改后的租约加载重叠滚动中，Classic 桌面最高 71ms、M3E 桌面最高 37ms。**加载流畅性没有完全解决。**

采样中 discover/collect/prepareRecords/owner/updateSurfaces 的最大值在约 0.1–3.7ms 范围，没有支持进一步删除同步分类或改造整个运行时的证据。诊断包装只在测试路由，生产没有持续日志。8ms 协作预算没有被宣称为整个浏览器任务硬上限。

## 渲染 trace 的口径

Chromium 原始 trace 包含线程元数据、style/layout/paint/raster 类别；分析同时处理 X 和 B/E。204 个 Chromium 原始压缩 trace 的解压内容 SHA-256 已按 case 索引独立核对。

示例采集有效性：System trace 的 RasterTask 全 trace 2347/采样段 1545，修改后示例 2556/1585，证明不是没有采到栅格。图表示例为 1902/819 与 1897/833。

Chromium 图表采样的事件上界：Layout 0.566 → 0.484ms、UpdateLayoutTree 0.923 → 0.408ms、Paint 0.520 → 0.534ms（CrRendererMain）；RasterTask 2.247 → 3.135ms（ThreadPoolForegroundWorker）。这些是矩阵事件上界核验，不是某个相同 case 的帧耗时，**不能将其相加、称为全面渲染提速，或拿它解释 WebKit 的绘制成本**。每个 case 的独立成本和 JS URL/调用栈见 traceEvidence。

CompositeLayers/DrawFrame 等旧事件名为 0 不代表没有合成或呈现。本轮没有可靠 presented-frame/FPS 结论。WebKit 无 CDP style/layout/paint/raster/composite trace，也没有 Safari Timelines/Frames/Layers，只有输入移动、更新记录和 rAF 数据。剩余 35/66.7ms 等尖峰未证明因果，未盲目加 CSS 或修改官方布局。

## 回归与截图

全部成功：

- [原生 opkg 弹窗/checkbox/Switch hover](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833731)：Classic/M3E、深浅、1280/390/320；每引擎 24 个 before/after case。两个按钮均 48px，高亮最终直径 48px，原 checkbox 单次 change、原节点/兄弟顺序保留，Space 键切换，关闭回调；Classic thumb 的 x/y/宽高不因 hover 改变。窄屏标签宽约 260px 且不是竖排。移除软件命令没有执行。
- [原生滚动行为](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833793)：blank/button/switch 起手真实 wheel 与反转，不产生点击或改变值，没有遗留激活涟漪；主内容/侧栏独立滚动、抽屉、菜单选值保持、长 modal 滚动与背景锁定、关闭后原页面位置和无全页横向溢出。
- [既有 UI 回归](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833790)：配置审阅关闭/恢复普通态透明、主操作末端、真实 UIComboButton、菜单 hit-test、原生回调与 modal 复用等。
- [构建语法、模板、性能契约、色板契约、实际 IPK 审计](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480404)。

[Chromium 前后截图及结果](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833731/artifacts/11879482478)、
[WebKit 前后截图及结果](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833731/artifacts/11878834672)。
截图路径如 `dist/selection-dialog/*-classic-light-320-after-pressed.png`，同时保留 before 和 Switch hover。阴影诊断截图见下表对应任务。测试中发现并修复的 18px flex-basis 竖排问题没有留在最终包。

## 原始证据索引

各性能产物均包含 comparison.json、case-index.json、scope.txt；Chromium 含索引到原始 .json.gz 及解压 SHA-256，WebKit 的 trace 字段为 null，不能伪造渲染 trace。原始 rAF、P50/P95/P99/max/时间位置、clock/graph 写入、实例/分类/等待计数及阶段标记保留。

| 路径/任务 | 原始产物 |
| --- | --- |
| [System 最终对照](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833771) | [WK Classic](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833771/artifacts/11880435144)、[WK M3E](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833771/artifacts/11879764344)、[Chrome Classic](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833771/artifacts/11879678949)、[Chrome M3E](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833771/artifacts/11880135497) |
| [真实时钟补测](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480477) | [WK Classic](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480477/artifacts/11880129623)、[WK M3E](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480477/artifacts/11881246212)、[Chrome Classic](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480477/artifacts/11881325210)、[Chrome M3E](https://github.com/Pew2018/MaterialLuCI/actions/runs/38536480477/artifacts/11880626316) |
| [原生图表对照](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833732) | [WK Classic](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833732/artifacts/11880171762)、[WK M3E](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833732/artifacts/11880880174)、[Chrome Classic](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833732/artifacts/11879649221)、[Chrome M3E](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534833732/artifacts/11879913250) |
| [加载/增强](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534959436) | [WK](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534959436/artifacts/11879234385)、[Chrome](https://github.com/Pew2018/MaterialLuCI/actions/runs/38534959436/artifacts/11879123545) |
| [阴影伪元素/合成候选，已放弃](https://github.com/Pew2018/MaterialLuCI/actions/runs/38530718282) | 任务内四个浏览器/设计产物，候选只在 CI |
| [九片伪元素诊断](https://github.com/Pew2018/MaterialLuCI/actions/runs/38531674167) | 任务内原始数据与前后截图，候选只在 CI |
| [原卡片 border-image 单变量](https://github.com/Pew2018/MaterialLuCI/actions/runs/38532380530) | 任务内四份原始数据、截图、trace 与索引；没有新的定位容器 |

## 必须直接回答的四项

1. **System 桌面卡片：改善。**真正空闲与实际原生时钟更新的成对 wheel 均显著降低 GTK WebKit 的持续长间隔，保留卡片/阴影；仍有 35ms 单次间隔，Classic 更新组 P95 26ms，不能宣称所有帧预算达标。
2. **图表更新：改善。**单/多原生图表、正常/压力更新都改善；新组最大 29ms、>34ms 为 0。业务图表实现和刷新周期未被降低，不能称为真机 Safari FPS。
3. **加载增强：部分改善，未完全解决。**已有 JS 减负验证有效，完整加载和加载重叠滚动仍有大间隔，不能将 CI 成功等同首屏流畅。
4. **持续空闲滚动：已在有效移动的 GTK WebKit fixture 复现，并显著改善。**最终 idle 样本未再出现 >34ms 大尖峰；用户 macOS Safari、物理触控板惯性与路由器真机未验证，不能宣布用户环境已经彻底解决。
