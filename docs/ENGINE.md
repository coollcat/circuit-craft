# 引擎：求解器口径与器件模型

> 改 `src/engine/**` 之前必读。契约冻结在 `src/engine/types.ts`，单位与端口命名不要各写一套。

## 单位与端口（全站唯一口径）

| 量 | 单位 | 说明 |
|---|---|---|
| 节点电压 | V | `GoalCheck.kind='node-voltage'` 用 |
| 支路电流 | **mA** | `kind='branch-current'` 的 min/max 是毫安（引擎内部用 A，展示时换算） |
| 频率 / 采样率 | Hz | `freq` / `fs` 互为别名 |
| 电阻 / 电容 | Ω / F | |
| 器件常数 | — | LED Vf=2V、二极管 0.7V、肖特基 0.3V、NPN Vbe=0.7V / Vce(sat)=0.2V / β=100 |

端口命名见 `solver.ts` 的 `PORT_NAMES`；参数默认值见 `DEFAULT_PARAMS`。

## 求解方法

`compileCircuit`（并查集把导线并成网络 → 选参考地 → 收集需要电流未知量的电压源型支路）
→ `solveCompiled`（MNA 稠密高斯消元 + 部分主元，牛顿式外迭代 ≤40 次）。

- **参考地**：优先任一 `gnd` 元件；无 gnd 时以 `vsrc/battery` 的 neg 为 0V；都没有则取第一个元件首端口。
- **接地检查**（C4）：没有通往 net 0 的直流路径的孤立子图会返回可读错误，而不是给"半个电源电压"的假解。
  DC 口径下电容开路、断开的开关开路，所以 RC 关不会误报；只有完全惰性的网络（未接的运放电源脚、
  只接电容的节点）才用 GMIN 锚定。
- **收敛**：`SolveResult.converged` / `residual` 由「电压增量 < 1e-7 ∧ 运放限幅不变 ∧ 器件模式不变」共同判定；
  `iterations` 保留供 UI 展示。旧代码 40 次耗尽也返回 `ok:true`，现在会带 `converged:false`。

## 器件模型（教学向分段线性）

**非线性器件必须用单调模型，且 stamp 与电流读回共用同一判据**——历史 bug 就是两处判据不一致
（stamp 用 `vd > vf*0.95`、读回用 `vd > vf`），导致"导通态"自洽地落在 `Vd < Vf` 上，二极管变成电源。

| 器件 | 模型 |
|---|---|
| 电阻 / 光敏 / 热敏 / 蜂鸣器 / 扬声器 | 纯阻；`numParam` 读参数（**先扫用户 params，全缺才回落默认值**，否则别名永远读不到） |
| 二极管 / 肖特基 / LED | `i = max(0, (Vd − Vf) / rOn)`，ON 态算出负电流才回落 OFF（带粘滞防抖） |
| 稳压管 | 正向同二极管；反向击穿区钳位 `vz + i·rz`，无死区 |
| NPN | 截止 / 放大区 `Ic = β·Ib` / 饱和区 `(Vce − Vce(sat)) / rOn`，互补性双向切换 |
| NMOS / PMOS | 理想开关（`Vgs` 与阈值比较） |
| 电容 / 电感 / 晶振 | DC：电容开路、电感 1mΩ；瞬态：梯形法伴随模型 |
| 运放 | 理想 VCVS（增益 1e5）+ 电源轨限幅；**未接 vcc/vee 时回落 +12/0，属已知教学简化** |
| 变压器 | 理想比模型，`Ip = −k·Is` 保证能量守恒 |
| 保险丝 / LED 应力 | 按**仿真时间**累加（旧实现按调用次数，烧毁时间取决于帧率） |

## 教学展示层（`src/engine/explain.ts`）

只读 `SolveResult`，不做仿真：

- `explainComponent(id, circuit, res)` → `{ name, formula, lines[], result }`：通式 + 代入数字 + 结论
- `explainGoal(goal, circuit, res)` → 一行「实测 vs 目标区间 + 偏大/偏小多少」
- `netVoltageTable(circuit, res)` → 全部网络电压（标签如 `R1.a`，地为 `GND`）
- `powerLedger(circuit, res)` → `{ rows, total }`，结算弹窗用它展示 ΣP≈0 的能量守恒

这些是关卡页验收台、结算账本、图解读数的共同来源；**改它们的输出格式要同步检查 `explain.test.ts`**。

## 测试

- `src/engine/solver.test.ts`：42 例解析用例（分压、串并联、ΣP 平衡、RC 在 t=τ/5τ、运放增益与限幅、
  稳压管、LED rOn、变压器能量、无参考地、并联理想源…），期望值都是手工算出来的。
- `src/engine/explain.test.ts`：教学推导与求解结果一致（含功率账本守恒、状态表排序、差值方向）。
- 独立验证者另做过：1501 点二极管扫描（无倒灌、单调）、400 例模糊测试（无非无源元件，max|ΣP|=1.4e-10W）。
