# 当前主题文件审计

日期：2026-10-09。证据为用户上传 materialluci-theme.tar.gz、截图和终端输出。只读静态分析，未连接路由器，未执行真机或浏览器运行测试。

## 文件范围

压缩包包含 142 个文件，涉及 Bootstrap、Bootstrap Mod、Argon、Edge、OpenWrt、Win98。
当前选中 /luci-static/bootstrap_mod，对应 luci-theme-bootstrap-mod 20220102。

核心：
- usr/lib/lua/luci/view/themes/bootstrap_mod/header.htm
- usr/lib/lua/luci/view/themes/bootstrap_mod/footer.htm
- www/luci-static/bootstrap_mod/cascade.css（约27 KB）
- www/luci-static/bootstrap_mod/mobile.css（约1.3 KB）
- www/luci-static/resources/menu-bootstrap.js（共享资源）

导出的是安装文件，不是完整源码仓库；缺少包 Makefile、完整许可证文件、状态页业务与主要插件实现。部分主题有不同模板机制，不能因为包中含 Win98 ucode 模板就推断当前 LuCI 已支持它。

## 已确认的静态发现

| 发现 | 证据 | 影响与方向 |
| --- | --- | --- |
| 字体栈错误 | font-family: "Helvetica Neue, Helvetica, Arial, sans-serif" | 整串作为一个字体名称；改为合法分项字体栈 |
| 正常数据暗红 | .cbi-value-field、表格单元格 #811 | 不能当作异常信号；使用语义主文字 |
| 首列蓝色 | table td:first-child / .table .td:first-child #127 | 普通标签像链接；改次文字 |
| 顶栏未固定 | position:fixed/top/left/right 被注释 | 新布局统一正文滚动与固定导航 |
| 桌面主机名隐藏 | <=1600 px 隐藏 brand | 断点过宽；重新设计响应式 |
| 下拉悬停展开 | .dropdown:hover .dropdown-menu | 触屏、键盘需明确展开能力 |
| 按钮多色 | 保存紫、重置绿、编辑橙、应用蓝 | 按主次与危险语义映射 |
| 进度文字叠加 | .cbi-progressbar::after 使用 attr(title) | 数值移出需要结构适配，不止 CSS |
| 登录 DOM 脆弱 | window.onload 根据 input 父层级隐藏标签、移动提示 | 不直接复制此登录改造 |
| HTML 结构不规范 | footer 在 </html> 后追加 script，重复 </html> | 新模板合法组织文档 |

CSS 同时覆盖 HTML table 与 LuCI div.table，以及 cbi-dropdown、dynlist、modal、接口徽章、防火墙 zonebadge。适配必须覆盖这两种表格和复杂控件，不能只美化截图里的状态表。

## 模板与菜单边界

header 使用 luci.sys/util/http/dispatcher，读取 system board，输出 data-page 和菜单容器。
footer 调用 L.require('menu-bootstrap')，菜单脚本通过 ui.menu.load/getChildren 动态生成。
保留 LuCI 菜单读取、翻译、权限和 URL；新主题用独立菜单模块，不覆盖共享脚本。
原模板携带 Apache-2.0 授权说明；复用前核对上游版权与适用许可证。

## 未验证与后续研究

- 状态页 CPU、温度、网口实际 DOM 与脚本来源。
- 登录、保存应用、错误对话框的真实生命周期。
- Lua CBI 和 JS 表单依赖、脏状态与刷新。
- mtwifi-cfg、eqos-mtk、turboacc-mtk 等插件的特殊结构。
- 各主题资源文件归属与包依赖。
- 真实性能与 Material 组件兼容性。

本次发现用于规划；不能据此宣称新主题已兼容全部页面。
