# MaterialLuCI 文档

本开发分支已实现 Classic Native 0.1.0；原研究方案保留为设计记录。

## 实现与安装

- [安装、主题切换与回退](INSTALL.md)
- [第一版实现与适配边界](V0.1-IMPLEMENTATION.md)

## 设计基准

- [用户提供的 Classic 设计规范](TurboIMS-Classic-WebUI-Design-Spec-v1.0.md)：原样保留。
- [多风格实现方案](IMPLEMENTATION-PLAN.md)：规划，不代表三种风格都已实现。
- [原主题审计](CURRENT-THEME-AUDIT.md)：静态发现与证据边界。

Classic 自绘为默认；其他风格后续接入。原规范的 KernelSU/IMS 业务、宿主接口与 SPA 路由不照搬到 LuCI。
代码在 GitHub 维护，构建仅 Actions；main 本轮不合并。
