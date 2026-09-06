# 首钢园 · 霓虹泡泡夜

一个基于 Three.js 的小型像素风泡泡游戏，以首钢三高炉、冷却塔和“雪飞天”大跳台为原型。蓝紫夜景、青色和洋红霓虹、工业钢架、暖色炉光与奶油色复古界面参考用户提供的两张图片；园区为游戏化布局，并非实际地理复刻。

## 玩法与操作

- 单人三关：炸开金色能量箱、拾取地标核心，击败全部巡逻机器人过关。角色有三条生命，受击后短暂无敌。
- 一机双人：同一台电脑、同一块键盘，两人各一条生命。最后存活者获胜，同时出局或时间耗尽则平局。当前版本为本机对战，没有远程联网房间。
- P1 / 单人：↑ ↓ ← → 移动，空格放泡泡。
- P2 / 双人：WASD 移动，Enter 放泡泡。Esc 暂停。
- 泡泡延迟 2.2 秒十字爆炸，受钢柱阻挡，摧毁每个方向上的第一个箱子，可连锁引爆其他泡泡。
- 手机支持单人触控方向键和泡泡按钮，双人需要实体键盘。
- 地标解锁和可选关卡保存在本机浏览器。音效默认关闭，可通过右上角开启。

## 模型与画面

本次使用已连接的 Blender 制作并导出四个 GLB 素材，所有素材随网站一起托管。Rodin 集成缺少 API Key，未调用 Rodin 或 Mixamo。

- 三高炉：圆形炉体、钢架上部、环形平台与栏杆、大型弧形管道、炉窗、梯架和暖色炉光。
- 冷却塔：双曲线塔身、外部环带与肋条、支撑脚。
- 大跳台：连续坡面、桁架支撑、栏杆与霓虹边灯。
- 角色：带倒角的像素探索者，包含头盔、护甲、氧气背包与独立四肢；Blender 节点动画导出为 Idle、Walk、PlaceBubble、Hit 四个片段，游戏中按事件播放。

静态模型按材质合并，保留轮廓细节并减少绘制次数。Three.js 使用透视大厅、俯视战场、阴影、辉光和地面反射。天空插画由内置图像生成工具制作，只有远景与天空，不含界面。

## 本地运行

使用 Node.js 22.13+ 和 pnpm。

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

静态成品位于 `dist/client`。构建使用 Vinext / Vite、React 19、Three.js；界面复用 Shadcn / Base UI。

## 结构

- `components/game/engine.js`：关卡、碰撞、爆炸、补给、AI 与结算。
- `components/game/input.js`：键位及单人/双人控制分配。
- `components/game/assets.js`：GLB 加载、材质合并、角色动画混合。
- `components/game/environment.js`：园区、管廊、铁路、霓虹、天空与地面反射。
- `components/game/models.js`：辅助几何、场地道具与材质。
- `components/game/scene.js`：相机、照明、粒子与游戏实体动画。
- `components/game/Game.tsx`：循环、键盘、进度、暂停与 WebMCP 功能检测。
- `components/game/Interface.tsx`：大厅、规则、HUD、结果和移动端控件。
- `components/game/audio.js`：Web Audio 合成音效和节拍。
- `public/models/`：四个 Blender 导出模型。
- `public/art/pixel-skyline.png`：生成的像素天空插画。
- `docs/skyline-prompt.txt`：该插画的完整生成提示词。
- `tests/`：规则、键位和模型/动画集成检查。

## 验证范围

20 项自动检查覆盖游戏规则、300 个随机地图、机器人模拟、方向键移动、双人操作分配、模型合并边界、角色身体层级、四个动画的独立播放和场景几何构建。另检查 TypeScript 和静态构建，并在 Blender 中检查高炉及角色的实际渲染。未执行浏览器视觉或交互测试；不能将构建、几何与动画检查等同于实际浏览器游玩验证。WebMCP 有功能检测，当前环境没有可调用的 WebMCP 验证上下文。

## 地标参考

- 用户提供的高炉与霓虹像素风参考图片。
- [首钢集团：首钢园入选北京新发现主题线路](https://www.shougang.com.cn/m1/sgyw/20250616/12948.html)
- [石景山区政府：首钢园工业遗存保护和利用](https://www.bjsjs.gov.cn/ywdt/sjsdt/202502/t20250206_476120_sjs.shtml)
- [北京旅游：首钢园工业遗址主题游](https://mp.visitbeijing.com.cn/a1/4EK4IKx7tyg)
