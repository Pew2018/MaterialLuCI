# MDC Web 线性进度条（0.3.0）

仅引入官方 @material/linear-progress 14.0.0。Actions 用 Sass 编译其样式、esbuild 打包组件及必要依赖，路由器离线使用本地资源。未引入整套 MDC 或 Material Web / M3。

## 接入位置
依据 LuCI 的明确忙碌标记 spinning，适用于：
- ui.changes.displayStatus：开始应用、等待确认、回滚等待和撤销配置。
- opkg 的配置读取/保存、软件包执行等待。
- 其他使用 p.spinning 的 LuCI 等待弹窗。
拥有真实百分比的上传进度不叠加不确定条；成功、错误、确认选择和普通编辑弹窗不显示。

## 生命周期与兼容
ui.showModal / hideModal、UCI 应用、回滚和 RPC 完全由 LuCI 保持。
opkg 会删除 modal.lastChild；UCI 会每秒替换弹窗内容。
因此进度组件作为 overlay 内的稳定兄弟节点，由 modal 通过 aria-owns 关联，不插入业务内容的子节点列表。
忙碌状态更新复用同一个实例，避免每秒重新启动动画。
状态结束或弹窗关闭时 destroy；新的任务重新创建。
只有经典 MDC 的双线段动画，无虚构百分比。颜色来自当前主题；减少动态效果时保留静态忙碌指示与原状态文字。

## 验证
真实 LuCI ui.changes.displayStatus、opkg 视图及 lastChild 删除行为均有回归用例。
检查动画时间推进、状态更新不重建实例、正常/错误/关闭时清理、已知上传进度不重复，以及浅/深色和缩小手机视口。
此验证不向真实路由器写入配置，设备应用流程仍须实机确认。
