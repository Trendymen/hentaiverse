# autobattle M3 连刷 — 开战 / 精力 / GF 连刷 翻写研究(硬事实)

- 日期:2026-06-06
- 性质:reference 翻写研究(解除剩余任务文档 §3 / spec §10「开战 API 参数」阻塞)
- 来源:`reference/hvAutoAttack.user.js`(dodying 原版 v2.90.22.12,4353 行)+ 辅助 `hvAutoAttack_BRAIN.user.js`
- 方法:两个 Explore agent 并行扒取(竞技场/遭遇 + 精力/GF),行号对应该版本,HV 服务端/前端改版可能使选择器失效需实测核对
- 关联:设计 `specs/2026-06-04-autobattle-ui-rework-design.md`(§5 engine/ 目录、§7 连刷 tab、§10 开放细节);剩余任务 `plans/2026-06-05-autobattle-remaining-tasks.md` §3

---

## 0. 核心结论(一句话)

dodying 的连刷不是"点按钮",而是 **`$ajax` POST 开战 + `fetch` 局部刷新波次 + 跨 reload localStorage 续命**。开战只需 `?s=Battle&ss=<site>` + `initid` + `inittoken` 三件套;token 从各竞技场页 `img[onclick*=init_battle]` 实时扒、每日刷新。精力靠 `?recover=stamina` GET 恢复,1 点/小时自然回。所有硬事实已落实,M3 可拆 bite-sized 步骤。

---

## 1. 竞技场开战(Arena / Ring of Blood / GrindFest)

### 1.1 开战请求(三件套)

```js
// hvAutoAttack.user.js:2643
$ajax.open(`?s=Battle&ss=${href}`, `initid=${String(key)}&inittoken=${token}`);
```

| 要素 | 值 | 来源 |
|---|---|---|
| endpoint | 相对路径 `?s=Battle&ss=<site>` | :2643 |
| HTTP 方法 | POST（`application/x-www-form-urlencoded`） | :162-166 |
| body | `initid=<等级ID>&inittoken=<TOKEN>` | :2643 |
| 限流 | `$ajax` interval 300ms 硬下限 | :132 |

### 1.2 site 后缀按等级路由

```js
// hvAutoAttack.user.js:2626-2632
if (key === 'gr')      href = 'gr';        // GrindFest
else if (key >= 105)   href = 'rb';        // Ring of Blood
else if (key >= 19)    href = 'ar&page=2'; // 竞技场 19 级以上(第 2 页)
else                   href = 'ar';        // 竞技场 1~18
```

| 类型 | site | initid 取值 |
|---|---|---|
| 普通竞技场 1~18 | `?s=Battle&ss=ar` | 1,3,5,8,9,11,12,13,15,16,17,19 |
| 普通竞技场 ≥19 | `?s=Battle&ss=ar&page=2` | 20,21,23,24,26,27,28,29,32,33,34,35 |
| Ring of Blood | `?s=Battle&ss=rb` | 105~112 |
| GrindFest | `?s=Battle&ss=gr` | 字符串 `'gr'`,开战时统一映射 `key=1`（:2620） |

> 等级显示名↔internal id 映射见 :860-863。**注意 id 非连续**(跳号),不能简单 `1..N` 遍历。

### 1.3 token 提取与刷新(每日失效)

```js
// hvAutoAttack.user.js:2509-2523
arena.sites ??= ['?s=Battle&ss=gr','?s=Battle&ss=ar','?s=Battle&ss=ar&page=2','?s=Battle&ss=rb'];
// 逐站 fetch HTML, 从 img onclick 扒 token:
//   GF:    img[src*="startgrindfest.png"]  → init_battle(1, 'TOKEN')
//   竞技场: img[src*="startchallenge.png"]  → init_battle(<id>,<x>,'TOKEN')
arena.token.gr = gE('img[src*="startgrindfest.png"]', doc).getAttribute('onclick').match(/init_battle\(1, '(.*?)'\)/)[1];
gE('img[src*="startchallenge.png"]','all',doc).forEach(_ => {
  const m = _.getAttribute('onclick').match(/init_battle\((\d+),\d+,'(.*?)'\)/);
  arena.token[m[1]] = m[2];
});
```

- token 与 `initid` 绑定,错配开战失败。
- `arena.date` 记录刷新日,**日期变 → 重新 fetch 全部 token**（:2504-2535）。

### 1.4 开战后确认进入战斗

- URL 变 `?s=Battle&ss=ba|ar|rb|gr`;DOM 出现 `#battle_main` / `#textlog`。
- 与现有 autobattle 的 `inBattle()`（loop.ts 用 `#pane_vitals`）一致,可复用。

---

## 2. 遭遇战(Random Encounter)

### 2.1 开启请求

```js
// hvAutoAttack.user.js:2480
$ajax.openNoFetch('https://e-hentai.org/news.php?encounter'); // GET, window.open 跨站
```

- **跨站到 e-hentai.org**,需 `@connect e-hentai.org`(原版已声明)。遭遇链接从 `#eventpane>div>a` 的 href 扒(:2141-2188)。

### 2.2 冷却 / 状态

```js
// hvAutoAttack.user.js:2424-2469
// 基础冷却 30 分钟; 一天 ≥24 场 → 冷却延至次日 00:00
cd = (encountered.length >= 24) ? 次日 : (_1h/2 + last - now);
```

| 状态 | 判据 | 行为 |
|---|---|---|
| Ready | `cd<=0 && encountered<24` | UI 变红 → `onEncounter()` |
| Expired | `encountered>=24` | 当日上限,倒计时次日 |

- 存储 `encounter[] = [{href, time, encountered}]`(localStorage)。
- **遭遇优先级高于竞技场**:`checkBattleReady` 若有未进行遭遇,延迟竞技场(:2538-2558)。

---

## 3. 精力(Stamina)

### 3.1 读取

```js
// hvAutoAttack.user.js:2301-2310
setValue('stamina', gE('#stamina_readout .fc4.far>div', $doc(html)).textContent.match(/\d+/)[0] * 1);
setValue('staminaTime', Math.floor(now/1h)); // 小时粒度时间戳
```

- 选择器 `#stamina_readout .fc4.far>div`,正则取整数,绝对值 0~100。
- **自然恢复 1 点/小时**(HV 硬设定),脚本按时间差本地推算(:2397-2399),每日 00:00 重置。

### 3.2 阈值 / 恢复

| 配置 | 默认 | 说明 |
|---|---|---|
| `staminaLow` | 60(上限 85) | 低于即拦开战 |
| `staminaLowWithReNat` | 0 | 含当日自然恢复的阈值 |
| `restoreStamina` | 关(异世界强制关) | 是否自动喝药恢复 |

```js
// hvAutoAttack.user.js:2417-2422  恢复用 GET ?recover=stamina(非战斗页)
const recover = items[11402]?5 : items[11401]?(hathperk?20:10):0; // 11401 能量饮料 / 11402 咖啡因糖
if (recover && stamina <= 100-recover) $ajax.open(location.href, 'recover=stamina');
```

- 精力消耗公式(:2594-2610):`cost[level] *= (异世界?2:1) * (stamina>=60?0.03:0.02)`。
- 损失警告:监听日志 `You lose \d+ Stamina`(:3179),配 `staminaLose/Pause/Warn/Flee`。

---

## 4. GF 场间连刷 + 波间推进

### 4.1 波间(同一场内 Round N→N+1,无 reload)

```js
// hvAutoAttack.user.js:3025-3056
// 日志正则 /\(Round (\d+) \/ (\d+)\)/ → roundNow / roundAll
if (roundNow !== roundAll) onNewRound(); // 否则 Victory
async function onNewRound(){
  const doc = $doc(await $ajax.fetch(location.href));      // 仅 fetch HTML
  ['#battle_right','#battle_left'].forEach(s => gE('#battle_main').replaceChild(gE(s,doc), gE(s))); // 局部换 DOM
  unsafeWindow.battle = new unsafeWindow.Battle(); newRound(true); onBattle();
}
```

> autobattle 现状已有 GF 波次内续战(`brain.canContinue` + `executor.continueBattle`),与此对应。**本项 M3 已部分完成**。

### 4.2 怪死 / 胜利检测

```js
// hvAutoAttack.user.js:3005-3008 / 3061-3062
monsterDead = gE('img[src*="nbardead"]','all').length;   // 死怪标记图
if (roundNow === roundAll) SetExitBattleTimeout('Victory'); // 最后一波胜利
```

> `nbardead` 即剩余任务文档 §2.7 目标权重核对里"死怪垫底"的同款选择器,reader 已用。

### 4.3 场间(整场结束 → 开下一场,经 reload)

```js
// hvAutoAttack.user.js:2615-2643  GrindFest 计数循环
if (key === 'gr') {
  if (arena.gr <= 0) { arena.arrayDone.push('gr'); return; } // 次数耗尽,转其它
  arena.gr--; href='gr'; key=1; cost=staminaCost.gr;
}
if (!checkBattleReady(idleArena, {staminaCost:cost, checkEncounter:true})) return;
$ajax.open(`?s=Battle&ss=gr`, `initid=1&inittoken=${token}`);
```

衔接链:**胜利 → `SetExitBattleTimeout('Victory')` → `$ajax.open(lastHref)` 返回竞技场页(reload）→ `asyncOnIdle()` 重入 → `idleArena()` 检查 `arena.gr>0` → 重取 token 发起下一场**。次数 `arena.gr` 初值 = `idleArenaGrTime` 配置。

### 4.4 跨 reload 状态(localStorage)

```js
// hvAutoAttack.user.js:33  跨刷新持久化键
['option','arena','drop','stats','staminaLostLog','battleCode','disabled',
 'stamina','staminaTime','lastHref','battle','monsterDB','monsterMID','ability']
```

- `arena`(gr 计数 + token)、`stamina/staminaTime`、`lastHref`(战前 URL)、`battle`(战内,结束 `delValue` 清)。
- autobattle 现用 `Store`(GM/localStorage),已持久化 `cannonCd/cannonRound`,机制相同,**沿用 Store 即可**。

---

## 5. 无响应保护(M4 预研,顺带提取)

```js
// hvAutoAttack.user.js:2967-2982  开战后挂超时, 三档处理
battleUnresponsive = { Alert:{Method:setAlarm}, Reload:{Method:goto}, Alt:{Method:gotoAlt} };
// 推荐时延: Alert 15-30s / Reload 30-60s / Alt 60s+ (切 alt.hentaiverse 备用服)
b.onload = () => document.getElementById('eventEnd').click(); // 响应到达清所有 timer (:3078)
```

- `goto()` = `location.href = location`;`gotoAlt()` = 域名 `hentaiverse ↔ alt.hentaiverse` 互换。
- 现有 autobattle 已有"连续放不出→自动暂停"安全网(loop.ts STUCK_PAUSE),M4 可在此基础加超时切服。

---

## 6. 状态机编排(dodying 总控)

```
asyncOnIdle (:395)                         ← 非战斗页空闲入口
  ├─ updateEncounter (:2424)               ← 遭遇倒计时, cd<=0 → onEncounter (:2472)
  └─ startUpdateArena (:2483)
       ├─ updateArena (:2499)              ← 每日刷新 token
       └─ idleArena (:2560)                ← 主体: checkBattleReady → $ajax.open 开战
                                              GF 看 arena.gr 循环
战斗页 onBattle (:2648)
  ├─ roundNow<roundAll → onNewRound (:3033) ← fetch 局部刷新波次
  └─ roundNow===roundAll → Victory (:3062)  ← SetExitBattleTimeout → $ajax.open(lastHref)
```

关键状态变量:`arena.{token,array,arrayDone,gr,date}`、`battle.{roundType,roundNow,roundAll,turn}`。

---

## 7. 翻写注意点

### 7.1 HV 服务端硬约束(不可改)
1. **token 三件套**:`initid`+`inittoken` 必须配对,token 每日失效需重扒。
2. **endpoint 路径**:`?s=Battle&ss=ar|ar&page=2|rb|gr`、遭遇 `e-hentai.org/news.php?encounter`、恢复 `?recover=stamina`。
3. **精力**:1 点/小时自然回;消耗 `(异世界?2:1)*(stamina>=60?0.03:0.02)`;每日 00:00 重置。
4. **遭遇冷却**:30min 基础,日 24 场上限。
5. **限流** 300ms 下限。
6. **GF 次数**逐场 -1,中途不可补偿。

### 7.2 易失效选择器(需 GF/竞技场实测核对)
| 选择器 | 用途 | 风险 | 备选 |
|---|---|---|---|
| `#stamina_readout .fc4.far>div` | 精力数值 | 高(UI 美化易改) | 搜 class 含 stamina/energy |
| `img[src*="startgrindfest.png"]` | GF token | 中 | onclick 匹配 `init_battle(1,` |
| `img[src*="startchallenge.png"]` | 竞技场 token | 中 | 同上 |
| `img[src*="nbardead"]` | 死怪标记 | 中 | reader 已用,统一 |
| `#eventpane>div>a` | 遭遇链接 | 中 | — |

---

## 8. 与现有 autobattle 架构衔接

| dodying | autobattle 现状 | M3 动作 |
|---|---|---|
| `idleArena/onEncounter` | 无（`engine/` 未建） | **新建 `engine/starter.ts`** |
| `checkStamina/recover` | 无 | **新建 `engine/stamina.ts`** |
| `onNewRound` 波间 | ✅ 已有(`brain.canContinue`/`executor.continueBattle`) | 复用,无需重写 |
| `arena`/`stamina` localStorage | ✅ `Store`(GM/localStorage) | 沿用 Store 加键 |
| `inBattle` 判定 | ✅ loop.ts `#pane_vitals` | 复用 |
| 连刷 tab UI | 占位"待 M3 接入"(panel.ts:30) | **填充控件** |
| 配置键 | config.ts | 加连刷/精力键 |

---

## 9. M3 bite-sized 实施步骤铺垫(待细化为 TDD 计划)

1. **config 扩键**:`useEncounter` / `arenaLevels`(勾选列表)/ `useGrindFest` / `gfTimes` / `staminaLow` / `restoreStamina`。
2. **`engine/stamina.ts`**(纯函数优先):读 `#stamina_readout` + 本地小时推算 + 阈值判定 + `?recover=stamina` 动作;先写纯函数 + drive 脚本测样本。
3. **`engine/starter.ts`**:
   - token 扒取/刷新(每日)+ `idleArena` 等价开战(POST 三件套);
   - GF 计数循环(`gfTimes` → Store);
   - 遭遇 `onEncounter`(跨站,需 `@connect e-hentai.org`,确认 vite-plugin-monkey header 已含);
   - 战前 `checkBattleReady`(精力 + 遭遇优先级)。
4. **连刷 tab**:`panel.ts` 填 `farmPane()` — 遭遇开关 / 竞技场等级勾选(1~500/RB/GF)/ GF 开关+次数 / 精力阈值 / 战前恢复。
5. **实测核对**:GF 一场→下一场衔接、token 每日刷新、精力读数、遭遇冷却。

> 阻塞已全部解除(endpoint/参数/选择器/状态机均落实)。下一步可进入 `writing-plans` 把 §9 拆成 bite-sized TDD 步骤。
