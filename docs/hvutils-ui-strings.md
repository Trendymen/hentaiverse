# hvUtils.js UI 文本提取清单(实施底稿)

> 由 Explore agent 全文提取(2026-06-04)。这是阶段二翻译的工作底稿。
> 配套设计见 `docs/superpowers/specs/2026-06-04-hvutils-i18n-design.md`。
> **A 类 = 游戏专有名词(需术语表考证)**;**B 类 = 通用功能文案(直接译)**。
> ⚠️ 标注"逻辑标识符"角色的字符串(过滤规则 / 菜单 key / 匹配正则)**保留英文,不翻译**。

---

## 【A 类:HentaiVerse 游戏专有名词】

### A-1 游戏页面 / 场所名(行 3209–3234 菜单定义 + 设置项)
Character / Equipment / Abilities / Training / Item Inventory / Equip Inventory / Settings / Equipment Shop / Item Shop / The Shrine / The Market / Monster Lab / MoogleMail / Weapon Lottery / Armor Lottery / The Arena / The Tower / Ring of Blood / GrindFest / Item World / Repair / Upgrade / Enchant / Salvage / Reforge / Soulfuse / Bazaar / Battle / Forge
> ⚠️ 这些同时是菜单跳转 key(`s` / `ss` 字段)与 `topMenuLinks` 数组值——**显示名可译,作为 key 的留英文**。

### A-2 装备品质(行 1188 / 5723;缩写见 10325/10326/10541)
Peerless / Legendary / Magnificent / Exquisite / Superior / Fine / Average / Fair / Crude / Flimsy ；缩写 Leg / Mag / Exq / Sup
> ⚠️ 大量用于过滤规则匹配——匹配处留英文。

### A-3 装备前缀(行 1190–1193)
- 元素:Ethereal / Fiery / Arctic / Shocking / Tempestuous / Hallowed / Demonic
- 施法:Radiant / Charged / Mystic / Frugal
- 物理:Savage / Agile / Reinforced / Shielding / Mithril
- 宝石:Ruby / Cobalt / Amber / Jade / Zircon / Onyx

### A-4 装备后缀(行 1200–1208)
Slaughter / Balance / Swiftness / the Barrier / the Nimble / the Battlecaster / the Vampire / the Illithid / the Banshee ；
神话后缀:Destruction / Elementalist / Surtr / Niflheim / Mjolnir / Freyr / Heimdall / Fenrir / Heaven-sent / Demon-fiend / Focus / Protection / Warding / Dampening / Deflection / Stoneskin / Negation / the Fleet / the Earth-walker / the Curse-weaver 等

### A-5 装备类型(行 1180–1197)
- 单手:Rapier / Club / Shortsword / Axe / Wakizashi / Dagger / Sword Chucks
- 双手:Longsword / Katana / Mace / Estoc / Scythe / Great Mace 等
- 法杖:Oak Staff / Willow Staff / Katalox Staff / Redwood Staff / Ebony Staff
- 盾:Buckler / Kite Shield / Force Shield / Tower Shield
- 布甲:Phase/Cotton/Gossamer/Silk 系列(Cap/Robe/Gloves/Pants/Shoes)
- 护甲槽位:Cap / Robe / Gloves / Pants / Shoes / Helmet / Breastplate / Cuirass / Armor / Gauntlets / Greaves / Leggings / Sabatons / Boots
- 状态:Tradeable / Untradeable / Soulbound

### A-6 装备词条(行 1237–1268)
Attack Damage / Attack Accuracy / Attack Crit Chance / Attack Speed / Magic Damage / Magic Accuracy / Magic Crit Chance / Casting Speed / Spell Crit Damage / Mana Conservation / Physical Mitigation / Magical Mitigation / Block Chance / Parry Chance / Evade Chance / Resist Chance / Burden / Interference / Fire·Cold·Elec·Wind·Holy·Dark EDB / Fire·Cold·Elec·Wind·Holy·Dark MIT / Crushing / Slashing / Piercing / Proficiency / Counter-Resist / Strength / Dexterity / Endurance / Agility / Intelligence / Wisdom / Divine / Forbidden / Elemental / Supportive / Deprecating

### A-7 Binding 绑定道具(行 2144,共 38 项)
Binding of Slaughter / Balance / Isaac / Destruction / Focus / Friendship / Protection / Warding / the Fleet / the Barrier / the Nimble / Negation / the Elementalist / the Heaven-sent / the Demon-fiend / the Curse-weaver / the Earth-walker / Surtr / Niflheim / Mjolnir / Freyr / Heimdall / Fenrir / Dampening / Stoneskin / Deflection / the Fire-eater / the Frost-born / the Thunder-child / the Wind-waker / the Thrice-blessed / the Spirit-ward / the Ox / the Raccoon / the Cheetah / the Turtle / the Fox / the Owl

### A-8 消耗品 / 物品(行 2135–2149)
- 恢复:Health/Mana/Spirit Draught·Potion·Elixir / Last Elixir / Energy Drink / Caffeinated Candy
- 注灵:Infusion of Flames / Frost / Lightning / Storms / Divinity / Darkness
- 卷轴:Scroll of Swiftness / Protection / the Avatar / Absorption / Shadows / Life / the Gods
- 材料/碎片:Voidseeker Shard / Aether Shard / Featherweight Shard / Amnesia Shard / Crystallized Phazon / Shade Fragment / Repurposed Actuator / Defense Matrix Modulator

### A-9 晶体(行 2149 / 7304–7317)
Crystal of Vigor(STR) / Finesse(DEX) / Swiftness(AGI) / Fortitude(END) / Cunning(INT) / Knowledge(WIS) / Flames(FIRE) / Frost(COLD) / Lightning(ELEC) / Tempest(WIND) / Devotion(HOLY) / Corruption(DARK)

### A-10 货币 / 代币
credits / Credits(行 2095/6000…) / Hath(8841) / Chaos Token(7446/7738)

### A-11 怪物属性 + Chaos 升级词条(行 7304–7331)
主属性 STR/DEX/AGI/END/INT/WIS;元素抗性 FIRE/COLD/ELEC/WIND/HOLY/DARK
Chaos 词条(text + desc 效果说明):Scavenging / Fortitude / Brutality / Accuracy / Precision / Overpower / Interception / Dissipation / Evasion / Defense / Warding / Swiftness(各带 "Increases monster … by X%" 描述)

### A-12 怪物 Power Level 里程碑描述(行 7947–7961,长句)
14 条 PL 里程碑效果文本(PL 25/200/250/251/400/499/750/751/1000/1005/1250/1499/1750/2250),如 "Unlocks naming and becomes active in battles once named" 等。

### A-13 Chaos Token 升级费用 UI(行 7721–7727)
Chaos Tokens / (Unlock slots) / (Upgrade monsters) / Total Usage / Requires / Stock

### A-14 操作 / 机制术语
stamina restorative(3337) / cancel the current training(5093) / Equip Slots(6470/3737) / Soulbound·Lv.(4594) / Random Encounter(1188 设置头) / RE(906 按钮简写) / salvage(10868) / remove all potencies and reset its level to zero(10229)

### A-15 / A-16 祭坛与圣器(行 6319–6320)
Trophy 品质:Peerless/Legendary/Magnificent/Exquisite/Superior/Average ；
奖励:Energy Drink / 2 Hath / 1 Hath / Flower Vase / Bubble-Gum / Chaos Token / Last Elixir / 3x Last Elixir / 各属性 1000x·3000x·5000x Crystal / "Your strength has increased by one" 等

### A-17 天赋技能预设(行 4697–4703,均专有名词)
HP/MP/SP Tank / Better Health·Mana·Spirit Pots / Stronger Spirit / Better Haste / Shadow Veil / Heartseeker / Regen / Cure / Spark / Protection / Flame Spike Shield / Conflagration / Sorcery / Elementalism / Archmage / Ripened Soul / Dark Imperil / Soul Fire / Holy Imperil / Better·Faster Imperil / Arcane Focus / Corruption / Disintegrate / Ragnarok / Smite / Banish / Paradise / 1H Damage / 2H Parry / DW Crit 等

### A-18 Hath Perk(行 253/254/9460/9465)
Coupon Clipper / Dark Descent

### A-19 Infusion 附魔效果名(行 2587–2592)
Infused Flames / Frost / Lightning / Storm / Divinity / Darkness

---

## 【B 类:通用功能性 UI 文案】

### B-1 设置面板标题与区块头
- 517 / 3309:`HV Utils Settings`
- 区块头:205 Random Encounter / 211 Top Navigation Bar / 218 Bottom Bar / 225 Equipment / 234 Equipment Shop / 243 Monster Lab / 247 The Shrine / 251 MoogleMail / 256 Battle

### B-2 设置项 label / text(行 206–262)
覆盖全部配置项的 label 与多行 text 说明,例:
- 206 `Use Random Encounter Notification.`
- 209 `Play a beep sound when Random Encounter is ready.\nThe order of values is [volume], [frequency], [duration].\nSet it to 0 to disable.`
- 213 `Set quick links in the top.\nIf [topMenuIntegration] above is disabled, set the number of items in the list to 8 or less.`
- 214 `Confirm whether to use a stamina restorative item.`
- 221 `Shows the training in progress and automatically start the next training up to the set level.`
- 227 `Sort and categorize the equipment list.`
- 238 `Confirm when selling or salvaging equipment.`
- 239 `Show valuable equipment together at the top of the list, and prevent them from being selected by the "Select All" button.`
- 253 `For players who have "Coupon Clipper" hath perk. ...`
- 254 `For players who have "Dark Descent" hath perk. ...`
- 258 `Set the number of enchantments for weapon: 15 minutes per item`
- 259 `Set the number of enchantments for armors: 1 hour per item`
- 261 `Show the amount of items in the inventory, and warn if each number is less than the specified value. ...`
- (其余 206–262 全部 label/text 同此处理)

### B-3 设置项补充说明(行 264–280,`$config.text`)
- 265–271 equipHoverFunctions:`[C] Open equipment link in a pop-up` / `[V] Open equipment link in a new tab` / `[L] Show link code` / `[K] Show link code in bbcode format` / `[DOUBLE CLICK] Open equipment link`
- 272–275 equipTouchFunctions:`[DOUBLE TAP] Open equipment link` / `[LONG PRESS] Open equipment link`
- 276–280 repairThreshold:三段阈值说明 + `The recommended value for GrindFest is 55.`

### B-4 设置下拉选项(⚠️ 部分是排序 key,慎译)
- 219 showCredits:disable / always
- 220 showEquipSlots:disable / on battle pages only / always
- 238 equipmentShopConfirm:disable / confirm less-profitable actions / always
- 245 monsterLabDefaultSort:index / name / class / power level / wins / kills / new gifts / total gifts / morale / hunger ⚠️(排序键,确认是否参与逻辑)
- 257 equipEnchantPosition:left / right
- 10541 Salvage Calculator:PXP Quality / Leg (348~) / Mag (335~348) / Exq (313~335) / Sup (~313)
- 5081 Training:Plan Training...

### B-5 按钮文本(约 150+,代表性)
Save / Close / Revert / Default / BEEP TEST / Bid / Ask / Edit All Items / Collapse / Expand / USE RESTORATIVE / EXP Simulator / New / Change Name / Delete / Equip Code / Equip Pop-ups / Proficiency Simulator / Ability Simulator / Set / Cancel Planning / sort: category / sort: name / sort: eid / Select All / Edit Code / Save Current Settings / Show All Equipment / Show Only Filtered / Select: / Sell / Salvage / Edit Filter / Item Prices / Offering Results / The Shrine Log / Offer / All / Set as Bid / Set as Ask / Edit Prices / Gift Summary / Monster Lab Log / Update Wins/Kills / Monster Upgrader / Power Level Calculator / Update / Run / Updating... / Add Monster / SEND / Edit List / ATTACH from TEXT / Available Formats / CALC / ATTACH / RESET / Clear / send / Multi-Send / Reset Database / Export to JSON / Import from JSON / Reply / Return / Search / Close List / Manage Database / Search Mail / Details / Calculate / Invalid input / Low Forge level / Not enough materials / Upgrade ALL / Buy Catalysts / Salvage Calculator(完整行号见原始提取)

### B-6 confirm 弹窗(约 25 条)
2737 / 2807 / 3337 / 5093 / 5773 / 5794 / 5825 / 5837 / 5903 / 5946 / 7741 / 9014 / 9522 / 9527 / 9532 / 9753 / 9862 / 9866 / 10066 / 10229 / 10680 / 10736 / 10868 —— 多为 `Are you sure that you wish to …?` 句式,含 `${...}` 变量与 `\n`。

### B-7 alert 弹窗(约 30 条)
1094 / 1807 / 2089 / 2095 / 2100 / 2120 / 2244 / 5765 / 5790 / 6377 / 7738 / 8195 / 8245 / 8249 / 8253 / 8833 / 8837 / 8841 / 8967 / 9008 / 9746 / 9857 / 10226 / 10444 / 10705 / 10732 —— 错误/提示句,如 `The purchase request list is empty.` / `You do not have enough credits.` / `An error has occurred.`

### B-8 popup 浮层
852 连接上限提示 / 1031 RE key 失败 / 8229·8789·9821·9896 `Processing other requests...` / 8949 `The file has been saved.` / 5499 `No equipment selected.`

### B-9 动态状态文本(textContent,约 40 条)
Expired/Ready[count](981) / Checking...(1000) / Loading...(多处) / No Enchantments(2683) / No restorative available(3332) / [WARNING]…(3616) / Equip Slots:…(3737) / Waiting...(3785) / Training completed!(3816/3819) / Failed to load(3861) / Salvage ${v}(6078/6124) / failed(7054) / Updating...(7515/7527) / PL ${pl}(8093) 等

### B-10 表格列头(innerHTML)
4832 Level/Ability Points/Ability Boost/Abilities / 9121 Inbox/From/To/Page/Attachment/CoD/Sent/Read / 9127 No New Mail / 9432 From/To/Sent/Subject/Read / 10513–10517 PXP/Upgrade/Returns/Materials/Unit Price / 10647–10652 Forge EXP/Gear EXP/Potency Tier/Total Cost/Materials/Req./Stock/Price / 7947 Power Level/Effects

### B-11 MoogleMail 操作日志(行 2365–2460 / 9826–9936)
`========== Sending ==========` / `#${i}: Checking Mailbox` / Removing attachments / Attaching / Attached / Setting CoD / Preparing·Attaching·Sending in Persistent / `!!! Error: …` / Completed / `[Item Shop Request]` / Receiving / Buying / `[Reforge Request]` / Reforging / Unlocked / Reforged 等

### B-12 placeholder(输入框)
1101/5710 Tahoma, Arial / 1102/5711 `10` / 5237 `$price` / 5238 `$note` / 8585 `heal dra, man pot, elix` / 8588·8610·… count/price/cod / 8684 `Equipment name or eid` / 8851 多行示例 / 9710–9714 User/Subject/Text/Attachment/CoD (min-max) / 10545 `Copy the full text of the equipment pop-up and paste it here.`

### B-13 inline 预置内容
8386 Available Formats 示例:`100 x Health Potion @ 10 ...`

### B-14 校验错误标题
680 `<h3>Validation Error</h3>`

### B-15 其他零散
3384 `Stamina: ${stamina}` / 6000 `Credits: ${networth}` / 4832 `max` / 4925 `${ab.level}/${ab.max}` / 8949 文件已保存 / 3495 `Set ${i}` / 10507–10509 Salvage 品质显示 / 10644 `(MAX)`
