# HV 简体术语对照表(hvUtils 汉化用)

> 阶段一产出。来源:`eq`=equip_chinese_2.js 字典 / `fd`=fandom 中文 wiki / `eh`=ehwiki 中文版 / `cc`=社区通用/译者定。
> 风格:功能意译,equip_chinese 优先(用户决策)。
> ⚠️ 标「保留英文」的是 hvUtils 内的逻辑标识符(过滤规则 / 匹配键),阶段二**不翻译**,中文仅作参考。

## A-1 游戏页面 / 场所名(菜单 text 显示 → 译;s/ss 跳转 key → 留英文)

| 英文 | 简体中文 | 来源 | 备注 |
|---|---|---|---|
| Character | 角色 | eh | |
| Equipment | 装备 | eq/eh | |
| Abilities | 能力 | eh | |
| Training | 训练 | eh | |
| Item Inventory | 道具仓库 | cc | |
| Equip Inventory | 装备仓库 | eq | |
| Settings | 设置 | cc | |
| Equipment Shop | 装备店 | eq | |
| Item Shop | 道具店 | eq | |
| The Shrine | 祭坛 | eh | equip_chinese 作「神殿」,取 ehwiki「祭坛」 |
| The Market | 市场 | cc | |
| Monster Lab | 怪物实验室 | eq | |
| MoogleMail | 莫古邮件 | cc | 【任务2 fandom 确认】 |
| Weapon Lottery | 武器抽奖 | eh | |
| Armor Lottery | 防具抽奖 | eh | |
| The Arena | 竞技场 | eh | |
| The Tower | 高塔 | eh | |
| Ring of Blood | 浴血擂台 | eh/eq | |
| GrindFest | 压榨界 | eh | |
| Item World | 道具界 | eh | |
| Repair | 维修 | eq | |
| Upgrade | 升级 | eh | |
| Enchant | 附魔 | eq/eh | |
| Salvage | 分解 | cc | ehwiki 作「报废」,hvUtils 语境为分解成材料,取「分解」【任务3 确认】 |
| Reforge | 重铸 | eh | ehwiki 误植「重鑫」,正字「重铸」 |
| Soulfuse | 灵魂同步 | eh | |
| Bazaar | 集市 | cc | 【任务2 fandom 确认】 |
| Battle | 战斗 | eh | |
| Forge | 锻造 | eq | |

## A-2 装备品质 ⚠️ 保留英文(equipNameCode/protectFilters/lotteryFilters 匹配键)

| 英文 | 参考中文 | 来源 | 备注 |
|---|---|---|---|
| Peerless | 无双 | eq | ☯无双☯(eq 正则) |
| Legendary | 传奇 | eq | |
| Magnificent | 史诗 | cc | 代码统一作「史诗」 |
| Exquisite | 精致 | fd | |
| Superior | 优良 | cc | |
| Fine / Average / Fair / Crude / Flimsy | 精良/普通/尚可/粗糙/劣质 | cc | 低频,留英文 |

> Salvage 计算器缩写 Leg/Mag/Exq/Sup 同为计算匹配,保留英文。

## A-3 装备前缀 ⚠️ 保留英文(过滤规则匹配键)

参考译法见 fandom `Equipment_Prefixes`(任务2 抓取补充)。元素:Ethereal=空灵(fd)、Fiery=火焰、Arctic=冰冷、Shocking=电击、Tempestuous=风暴、Hallowed=神圣、Demonic=恶魔;施法:Radiant/Charged/Mystic/Frugal;物理:Savage/Agile/Reinforced/Shielding/Mithril;宝石:Ruby/Cobalt/Amber/Jade/Zircon/Onyx。**hvUtils 内一律留英文。**

## A-4 装备后缀 ⚠️ 保留英文(过滤规则匹配键)

参考译法见 fandom `Equipment_Suffixes`。Slaughter=杀戮(fd)、Battlecaster=战法师(fd) 等。**hvUtils 内一律留英文。**

## A-5 装备类型(分类标题显示→译;过滤匹配→留英文)

| 英文 | 简体中文 | 来源 |
|---|---|---|
| One-handed Weapon | 单手武器 | eq |
| Two-handed Weapon | 双手武器 | eq |
| Staff | 法杖 | eq |
| Shield | 盾牌 | eq |
| Cloth Armor | 布甲 | eq |
| Light Armor | 轻甲 | eq |
| Heavy Armor | 重甲 | eq |

> 具体类型名(Rapier/Dagger/Buckler…)在 hvUtils 多为排序/过滤匹配键,留英文;equip_chinese 有译法(匕首/西洋剑等)仅供分类标题显示时参考。

## A-6 装备词条 / 潜能(equip_chinese 全覆盖,显示处用)

| 英文 | 简体中文 | 英文 | 简体中文 |
|---|---|---|---|
| Attack Damage | 物理伤害 | Magic Damage | 魔法伤害 |
| Attack Accuracy | 物理命中 | Magic Accuracy | 魔法命中 |
| Attack Crit Chance | 物理暴击率 | Magic Crit Chance | 魔法暴击率 |
| Attack Crit Damage | 物理暴击伤害 | Attack Speed | 攻击速度 |
| Casting Speed | 施法速度 | Mana Conservation | 魔力消耗减免 |
| Physical Mitigation | 物理减伤 | Magical Mitigation | 魔法减伤 |
| Block Chance | 格挡率 | Parry Chance | 招架率 |
| Evade Chance | 回避率 | Resist Chance | 抵抗率 |
| Burden | 负重 | Interference | 干涉 |
| Crushing | 敲击 | Slashing | 斩击 |
| Piercing | 刺击 | Proficiency | 熟练度加成 |
| Counter-Resist | 反抵抗 | Counter-Parry | 反招架 |
| Strength | 力量 | Dexterity | 灵巧 |
| Agility | 敏捷 | Endurance | 体质 |
| Intelligence | 智力 | Wisdom | 智慧 |
| Fire | 火焰 | Cold | 冰霜 |
| Elec | 闪电 | Wind | 狂风 |
| Holy | 神圣 | Dark | 黑暗 |
| Divine | 神圣 | Forbidden | 黑暗 |
| Supportive | 增益 | Deprecating | 减益 |
| Elemental | 元素 | | |

潜能名:Capacitor=魔力加成 / Juggernaut=生命加成 / Butcher=武器伤害加成 / Fatality=攻击暴击伤害 / Archmage=魔法伤害加成 / Annihilator=魔法暴击伤害 / Economizer=魔力消耗减免 / Penetrator=反魔法抵抗 / Spellweaver=高速咏唱 / Overpower=反招架 / Swift Strike=迅捷打击 / Hollowforged=虚空升华(均 eq)

## A-7 绑定道具(equip_chinese 全覆盖,功能意译)

| 英文 | 简体中文 | 英文 | 简体中文 |
|---|---|---|---|
| Binding of Slaughter | 粘合剂 基础物理伤害 | Binding of Destruction | 粘合剂 基础魔法伤害 |
| Binding of Balance | 粘合剂 物理命中率 | Binding of Focus | 粘合剂 魔法命中率 |
| Binding of Isaac | 粘合剂 物理暴击率 | Binding of Friendship | 粘合剂 魔法暴击率 |
| Binding of Protection | 粘合剂 物理减伤 | Binding of Warding | 粘合剂 魔法减伤 |
| Binding of the Fleet | 粘合剂 回避率 | Binding of the Barrier | 粘合剂 格挡率 |
| Binding of the Nimble | 粘合剂 招架率 | Binding of Negation | 粘合剂 抵抗率 |
| Binding of the Ox | 粘合剂 力量 | Binding of the Raccoon | 粘合剂 灵巧 |
| Binding of the Cheetah | 粘合剂 敏捷 | Binding of the Turtle | 粘合剂 体质 |
| Binding of the Fox | 粘合剂 智力 | Binding of the Owl | 粘合剂 智慧 |
| Binding of the Elementalist | 粘合剂 元素魔法熟练度 | Binding of the Heaven-sent | 粘合剂 神圣魔法熟练度 |
| Binding of the Demon-fiend | 粘合剂 黑暗魔法熟练度 | Binding of the Curse-weaver | 粘合剂 减益魔法熟练度 |
| Binding of the Earth-walker | 粘合剂 增益魔法熟练度 | Binding of Surtr | 粘合剂 火属性咒语伤害 |
| Binding of Niflheim | 粘合剂 冰属性咒语伤害 | Binding of Mjolnir | 粘合剂 雷属性咒语伤害 |
| Binding of Freyr | 粘合剂 风属性咒语伤害 | Binding of Heimdall | 粘合剂 圣属性咒语伤害 |
| Binding of Fenrir | 粘合剂 暗属性咒语伤害 | Binding of Dampening | 粘合剂 敲击减伤 |
| Binding of Stoneskin | 粘合剂 斩击减伤 | Binding of Deflection | 粘合剂 刺击减伤 |
| Binding of the Fire-eater | 粘合剂 火属性减伤 | Binding of the Frost-born | 粘合剂 冰属性减伤 |
| Binding of the Thunder-child | 粘合剂 雷属性减伤 | Binding of the Wind-waker | 粘合剂 风属性减伤 |
| Binding of the Thrice-blessed | 粘合剂 圣属性减伤 | Binding of the Spirit-ward | 粘合剂 暗属性减伤 |

## A-8 消耗品 / 物品(equip_chinese 覆盖)

| 英文 | 简体中文 | 英文 | 简体中文 |
|---|---|---|---|
| Health Potion | 体力药水 | Health Draught | 体力长效药 |
| Health Elixir | 终极体力药 | Mana Potion | 法力药水 |
| Mana Draught | 法力长效药 | Mana Elixir | 终极法力药 |
| Spirit Potion | 灵力药水 | Spirit Draught | 灵力长效药 |
| Spirit Elixir | 终极灵力药 | Last Elixir | 终极秘药 |
| Energy Drink | 能量饮料 | Caffeinated Candy | 咖啡因糖果 |
| Monster Chow | 怪物饲料 | Monster Edibles | 怪物食品 |
| Monster Cuisine | 怪物料理 | Golden Lottery Ticket | 黄金彩票券 |
| Infusion of Flames | 火焰魔药 | Infusion of Frost | 冰冷魔药 |
| Infusion of Lightning | 闪电魔药 | Infusion of Storms | 风暴魔药 |
| Infusion of Divinity | 神圣魔药 | Infusion of Darkness | 黑暗魔药 |
| Scroll of Swiftness | 加速卷轴 | Scroll of Protection | 保护卷轴 |
| Scroll of the Avatar | 化身卷轴 | Scroll of Absorption | 吸收卷轴 |
| Scroll of Shadows | 幻影卷轴 | Scroll of Life | 生命卷轴 |
| Scroll of the Gods | 神之卷轴 | Flower Vase | 花瓶 |
| Bubble-Gum | 泡泡糖 | Soul Stone | 灵魂石 |
| Voidseeker Shard | 虚空碎片 | Aether Shard | 以太碎片 |
| Featherweight Shard | 羽毛碎片 | Amnesia Shard | 重铸碎片 |
| Crystallized Phazon | 相位碎片(布) | Shade Fragment | 暗影碎片(轻) |
| Repurposed Actuator | 动力碎片(重) | Defense Matrix Modulator | 力场碎片(盾) |

## A-9 晶体(equip_chinese 覆盖)

| 英文 | 简体中文 | 英文 | 简体中文 |
|---|---|---|---|
| Crystal of Vigor | 力量水晶 | Crystal of Finesse | 灵巧水晶 |
| Crystal of Swiftness | 敏捷水晶 | Crystal of Fortitude | 体质水晶 |
| Crystal of Cunning | 智力水晶 | Crystal of Knowledge | 智慧水晶 |
| Crystal of Flames | 火焰水晶 | Crystal of Frost | 冰冻水晶 |
| Crystal of Lightning | 闪电水晶 | Crystal of Tempest | 疾风水晶 |
| Crystal of Devotion | 神圣水晶 | Crystal of Corruption | 暗黑水晶 |

## A-10 货币 / 代币

| 英文 | 简体中文 | 来源 | 备注 |
|---|---|---|---|
| Credits / credits | 绅士币 | eq | |
| Hath | Hath | cc | 游戏内通用,保留 |
| Chaos Token | 混沌代币 | cc | |

## A-11 怪物 Chaos 升级词条(hvUtils 显示 → 译;名 + desc 效果)【任务2 fandom 补名】

| 英文 | 简体中文(名) | desc 效果译 |
|---|---|---|
| Scavenging | 拾荒 | 礼物系数 +2.5% |
| Fortitude | 坚韧 | 怪物生命 +5% |
| Brutality | 残暴 | 怪物伤害 +2.5% |
| Accuracy | 精准 | 怪物命中 +5% |
| Precision | 洞察 | 目标有效闪避/格挡 -1% |
| Overpower | 压制 | 目标有效招架/抵抗 -1% |
| Interception | 拦截 | 怪物招架 +0.5% |
| Dissipation | 消解 | 怪物抵抗 +0.5% |
| Evasion | 闪避 | 怪物闪避 +0.5% |
| Defense | 防御 | 怪物物理减伤 +1% |
| Warding | 守护 | 怪物魔法减伤 +1% |
| Swiftness | 迅捷 | 怪物攻击速度 +2.5% |

> 名称为暂定(cc),任务2 用 fandom `Monster_Lab` 词条核对。

## A-12 怪物 Power Level 里程碑描述(hvUtils 硬编码 HTML → 直接译,阶段二任务9 处理)

句子直译,见 `docs/hvutils-ui-strings.md` A-12;阶段二翻译时逐句处理,例:`Unlocks naming and becomes active in battles once named` → 「解锁命名,命名后在战斗中生效」。

## A-17 天赋技能预设 ⚠️ 多为匹配键,默认保留英文【任务2 fandom Abilities 参考】

hvUtils 能力预设(HP Tank / Better Haste / Archmage…)若为配置匹配键则留英文;若为显示标签,参考 fandom `Abilities`。保守留英文。

## A-18 Hath Perk(按钮显示 → 译;邮件主题匹配 → 留英文)

| 英文 | 简体中文 | 来源 | 备注 |
|---|---|---|---|
| Coupon Clipper | 优惠券剪贴者 | cc | 【任务2 fandom 确认】;MoogleMail 主题匹配处留英文 |
| Dark Descent | 黑暗降临 | cc | 同上 |

## A-19 Infused 附魔效果(equip_chinese 覆盖)

| 英文 | 简体中文 | 英文 | 简体中文 |
|---|---|---|---|
| Infused Flames | 火焰附魔 | Infused Frost | 冰霜附魔 |
| Infused Lightning | 雷电附魔 | Infused Storms | 风暴附魔 |
| Infused Divinity | 神圣附魔 | Infused Darkness | 黑暗附魔 |

---

## 来源核对结论(fandom 任务2 / ehwiki 任务3)

- fandom `Acronyms` 提供前后缀/品质缩写参考(Ethereal=空灵、Battlecaster=战法师、Exquisite=精致、Slaughter=杀戮);前后缀在 hvUtils 留英文,仅参考。
- fandom `Monster_Lab` 词条**无 Chaos 词条标准中文译名表**(仅机制描述)→ A-11 Chaos 词条名采用意译(cc),desc 直译。
- 常识/译者定(待用户审核):Bazaar=集市、MoogleMail=莫古邮件、Magnificent=史诗、Coupon Clipper=优惠券剪贴者、Dark Descent=黑暗降临。
- ehwiki 已提供主要场所/机制译法(竞技场/浴血擂台/压榨界/道具界/附魔/重铸/灵魂同步等),已并入对应条目。
- 待用户拍板:Salvage = 分解(推荐) / 报废(ehwiki)。
