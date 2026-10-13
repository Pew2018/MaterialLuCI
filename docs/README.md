# MaterialLuCI 文档

当前正式版本为 **1.0.0**，包含 Classic 与 M3E 两种可切换风格。默认设置及安装包范围以当前源码和下列正式说明为准。

## 当前版本

- [安装、升级、主题切换与回退](INSTALL.md)
- [1.0.0 实现、性能修复与验证边界](V1.0.0.md)
- [首个 Release 发布文案](release-notes/v1.0.0.zh-CN.md)

## 历史设计与实现记录

以下文档记录各阶段当时的方案、默认设置和测试结果，不能据此推断当前版本或当前默认 Actions 流程。

- [初始多风格实现规划](IMPLEMENTATION-PLAN.md)
- [原主题静态审计](CURRENT-THEME-AUDIT.md)
- [用户提供的 Classic 设计规范](TurboIMS-Classic-WebUI-Design-Spec-v1.0.md)
- [0.1 实现记录](V0.1-IMPLEMENTATION.md)
- [0.2 网页适配记录](V0.2-WEB-ADAPTATION.md)
- [MDC Web 迁移审计](MDC-WEB-MIGRATION-AUDIT.md)
- [MDC 控件迁移](MDC-CONTROLS-MIGRATION.md)
- [MDC 进度条](MDC-PROGRESS.md)
- [M3E 阶段记录](m3e-phase-one.md)
- [0.3.0-12 最终报告](m3e-0.3.0-12-final-report.zh-CN.md)
- [0.3.0-12 设备审计](m3e-device-audit-0.3.0-12.md)

原 Classic 规范中的 KernelSU/IMS 业务、宿主接口和底栏方案未直接照搬到 LuCI。当前使用桌面侧栏、手机抽屉及原生 LuCI 导航。

代码在 GitHub 维护，通过 Actions 构建；实际打包源为 `theme/root`。正式成果保存在 `main`，开发在 `feature/` 或 `fix/` 分支进行。
