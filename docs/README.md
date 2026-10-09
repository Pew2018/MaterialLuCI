# MaterialLuCI 研究与设计文档

当前阶段：只归档设计与实现规划，尚未开始制作主题或配置 Actions。

## 阅读顺序

1. [用户提供的 Classic 设计规范](TurboIMS-Classic-WebUI-Design-Spec-v1.0.md)：原样保留，包括尺寸、颜色算法、涟漪代码与证据边界。
2. [实现方案与多风格架构](IMPLEMENTATION-PLAN.md)：LuCI 适配、三个风格、组件接口、构建和验收思路。
3. [当前主题审计](CURRENT-THEME-AUDIT.md)：基于导出包的已确认发现及缺失证据。

## 约束与适用范围

Classic 自绘为默认和严格验收基准；Classic MDC 尽量保持相同设计。
Material 3 是另一个审美配置，不能声称满足 Classic 禁止胶囊、大圆角等全部形状约束；具体规范待定。

原规范面向 KernelSU 模块。MaterialLuCI 继承审美与通用交互，不照搬 IMS、KernelSU 桥接、宿主安全区接口或跨页面不适用的 SPA 路由。

代码在本仓库维护，编译通过 GitHub Actions。当前 main 的新增内容仅为文档。
方案中拟定的目录、包拆分、导航和接口尚未实现；待决事项见实现方案。
