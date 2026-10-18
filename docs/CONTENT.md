# 内容规范：关卡、图鉴与三套自动审计

> 改 `src/content/**`、`src/features/codex/**` 之前必读。这些规则都有自动化守护，不要靠"记得"。

## 一、关卡（44 关 = 主线 30 + 支线 A 6 + 支线 B 8）

数据在 `src/content/levels/{c1..c7,sideA,sideB}.ts`，契约是 `LevelDef`（`src/engine/types.ts`）。
每关包含：briefing / NPC 对话 intro·outro / palette / preset / goals / stars / hints（3 级）/
knowledge / 以及教学元数据 `formula`、`concept`、`codex`、`recap`。

### 硬约束

1. **不许免费绿灯**：数值目标（param / node-voltage / branch-current）在「preset + palette 出厂参数」
   下**必须为 false**——否则玩家不用算就过关，站点的教学主张就落空了。
   由 `levels.test.ts` 的审计用例守护；未修完的写在 `KNOWN_FREE_GREEN` 白名单里，**每条必须写明原因与 TODO**，
   且白名单带反向断言（修好后不移除会红）。
2. **必须可通关**：参考解法由 `src/content/solution.ts` 推导（`param` 目标取区间中值、
   `component-placed` 补件、`connected` 连线、地网合并），推导不出来的值写进 `LEVEL_SOLUTION_PARAMS`
   （例如需要闭合的开关 `{ SW1: { closed: true } }`）。静态关要求全部可判定目标转绿；
   **动态关（RC/波形）跑真实瞬态采样**，不得再用 `expect(true).toBe(true)` 搪塞。
3. **概念要有证据**：`concept` 里的每个标签都必须能在该关的目标或探针里找到对应（`src/content/concepts.ts`），
   防止"教 A 考 B"。
4. **每关要有 `formula`**（主导公式：expr 通式 + vars 说明 + note 一句话），关卡页公式卡直接消费它。

### 数值事实

- 内容里的每个算式都会被复算；历史上修过：分压"跌到 5.1V"实为 3.60V、迟滞 110mV 实为 157mV、
  基极电阻 43k 只强制 β=85 却称"全开"、晶振"18pF×2"与自身算例 26pF 自相矛盾。
- 改动关卡数值后必须跑 `npm test`，`levels.test.ts`（108 例）会立刻告诉你哪一关破了。

## 二、走线（编辑器与关卡地图）

- 自动布线：`route45`（纯几何 H-D-H / V-D-V）+ `route45Avoid`（与已有段共线/近平行时按 8px 整数倍分道），
  电路级串行布线在 `wireRoutes.ts`（后画的线避让先画的线与元件本体，带结果缓存）。
- **预览路径 = 落线路径 = 命中测试 = 电流粒子**，必须逐点相同；历史上它们各算各的，
  出现过"看得见点不中"和"画的时候一条、放下变另一条"。
- 审计 `wires-diag.test.ts`：对 44 关断言互相覆盖率 < 0.15、近距伴随 < 90px、同网重合段为 0，
  **并断言阈值本身没被放松**。当前实测：239 根导线峰值覆盖 0.031、峰值伴随 28.5px、重合 0 条。

## 三、编辑器防呆（改交互时别退化）

| 场景 | 行为 |
|---|---|
| 自连 / 重复端口对 / 已同网 / 电源正负极短路 | 拦截 + toast 说明原因，不落线 |
| 拖到空白处松手、pointercancel、Esc | 取消本次连线，不留悬空导线 |
| 删除导线（双击）与删除元件（Delete） | 可撤销（Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y），toast 提示 |
| 元件拖到重叠位置 / 拖出画布 | 自动错位 / 钳位回可用区 |
| 参数弹窗输入空、NaN、0 电阻、越界 | 钳位并提示，绝不写入 NaN |
| 未接线引脚 | 灰点 + 虚线环 + 底部计数胶囊 |

## 四、图鉴（42 条）

`src/features/codex/data/entries.ts`：每条 19 个字段，六段式（一句话 / 工作原理 / 关键参数 / 选型要点 /
常见坑 / 实物与封装）+ 布线案例 `wiring` + 计算方式 `calc` + 原理图 `schematic`。

- **数值必须自洽且可复算**：已修 ADC 满量程三套口径（统一 `V = 读数 × Vref / 2^N`）、
  饱和判据三套口径（统一 β_sat = Ic/Ib 取 10~20）、1N4148 的 VRRM=100V、保险丝 `In ≥ Iop ÷ 0.75`、
  电位器功率 0.5W 级、AO3400 的 Rds(on) 统一到 4.5V 档。
- **不确定的值标"约"并写清来源**，不要编造精确数字。
- 原理图 `MiniSchematic.tsx` 有 40 张：符号按取向参数（竖直 `v` / 阴极朝上 `flip`）绘制，
  改图后要检查走线真的接在引脚上。
- `usedIn` 指向不存在的关卡时用 `pending` 字段标「暂未进入关卡」，不要写假关卡号。
- 实验 `labs/`：色环、RC、LED 限流、运放、上下拉、迟滞比较器、**舵机（SG90）**；
  条目通过 `lab: LabKind` 挂载，实验里可以嵌入 `figures/` 的实物图解。

## 五、实物图解（`src/features/figures/`）

一个实物一张图，四件套：

| 文件 | 职责 |
|---|---|
| `scene.ts` | 只有尺寸与相机（唯一布局来源） |
| `model.ts` | 唯一物理真相（与关卡引擎同口径） |
| `geometry.ts` | 静态 SVG（垫子/本体/仪器/电缆） |
| `parts.ts` | 可动零件的路径生成器，**必须零依赖**（便于 `toString()` 内联进离线预览） |

- 站点组件、图鉴实验、离线预览（`node figures/build.mjs <name>`）共用同一份实现，**不要各写一套**。
- 交互自查用 `drive.mjs` 真实驱动（键盘/拖拽/超范围），不要只靠肉眼：
  历史 bug——命中测试没换算 viewBox 缩放导致拖不动、热区写死旧坐标、减动效下永远不烧灯。
- 可动件的路径在**世界坐标**里重算（等距投影下屏幕旋转≠世界旋转），不要用 `transform: rotate` 糊。
