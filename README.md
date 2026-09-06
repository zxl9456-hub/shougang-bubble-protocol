# 首钢泡泡计划

一个基于 Three.js 的小型体素泡泡游戏。以北京首钢园的三高炉、冷却塔和“雪飞天”滑雪大跳台为原型，以霓虹灯光、钢架、铁锈管线和旧铁轨构成夜间工业遗址场景。地图是游戏化布局，并非实际园区复刻。

## 玩法

- 单人三关：炸开金色能量箱，拾取核心，击败全部巡逻机器人。角色有三条生命，受击后有短暂无敌。
- 本机双人：同一台电脑、同一块键盘，两名玩家各一条生命，最后存活者获胜。同时出局或时间耗尽则平局。此版本没有远程联网房间。
- 泡泡延迟 2.2 秒十字爆炸，受钢柱阻挡，摧毁每个方向上的第一个箱子，可连锁引爆其他泡泡。
- P1：WASD 移动，空格放泡泡。P2：方向键移动，Enter 放泡泡。Esc 暂停。
- 手机支持单人触控方向键和泡泡按钮。双人需要实体键盘。
- 地标核心解锁记录和可选关卡保存在本机浏览器。无账号、无游戏内购。

## 本地运行

使用 Node.js 22.13+ 和 pnpm。

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

静态成品位于 `dist/client`，可由静态 HTTP 服务托管。构建使用 Vinext / Vite、React 19、Three.js；界面使用已有 Shadcn / Base UI。

## 结构

- `components/game/engine.js`：独立游戏规则、关卡、碰撞、爆炸、道具、AI 与结算。
- `components/game/models.js`：原创程序化体素模型。静态建筑按材质合并网格，降低绘制开销。
- `components/game/scene.js`：Three.js 场景、正交相机、灯光、辉光、粒子、角色动画。
- `components/game/Game.tsx`：游戏循环、键盘、进度保存、暂停、WebMCP 功能检测。
- `components/game/Interface.tsx`：菜单、规则、HUD、结果和移动端控件。
- `components/game/audio.js`：Web Audio 合成音效与简短节拍，默认关闭。
- `tests/engine.test.mjs`：13 项规则测试，包含 300 个随机地图与机器人模拟。

Hyper3D MCP 在制作时无法连接 Blender；本机 Blender 后台启动也遇到 Metal 初始化崩溃，因此成品采用程序化 Three.js 体素几何，并没有使用 AI 生成模型或 Blender 导出素材。无外部模型下载和纹理请求。

## 验证

规则测试、TypeScript 检查和静态构建通过。已检查模型边界与三角面数量。遵循 Sites 工作流，没有执行未明确请求的浏览器视觉或交互测试。WebMCP 注册进行了功能检测；当前环境未提供可调用的 WebMCP 验证上下文，不能声称接口已通过实际浏览器调用验证。

## 地标参考

- [首钢集团：首钢园入选北京新发现主题线路](https://www.shougang.com.cn/m1/sgyw/20250616/12948.html)
- [石景山区政府：首钢园工业遗存保护和利用](https://www.bjsjs.gov.cn/ywdt/sjsdt/202502/t20250206_476120_sjs.shtml)
- [北京旅游：首钢园工业遗址主题游](https://mp.visitbeijing.com.cn/a1/4EK4IKx7tyg)
