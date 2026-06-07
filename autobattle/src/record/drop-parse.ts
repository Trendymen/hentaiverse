// 掉落 + EXP/Credit 解析(纯函数). 翻写 dodying dropMonitor hvAutoAttack.user.js:4139-4194.
// 喂 /json textlog 行(HTML 字符串, 未汉化英文). EXP/Credit 唯一真值源=textlog 'You gain N EXP/Credit'
// (注: /json 的 d.exp 是经验条像素宽+1234 哨兵, 非数值, 勿用 — hvc.js.bak L920).
// 掉落颜色: 从 HTML 字符串正则抠 color:rgb(...) (textlog[].t 是 innerHTML, 非 live DOM).

const QUALITIES = ['Crude', 'Fair', 'Average', 'Superior', 'Exquisite', 'Magnificent', 'Legendary', 'Peerless'];

export interface DropDelta { exp: number; credit: number; drops: Record<string, number>; }

/** 解析一批 textlog 行. dropQuality: 装备最低品质索引(0-7). 遇 'You are Victorious!' 停(对齐 dodying L4180). */
export function parseDrops(lines: string[], dropQuality: number): DropDelta {
  const out: DropDelta = { exp: 0, credit: 0, drops: {} };
  for (const line of lines) {
    if (/You are Victorious/i.test(line)) break;
    const eg = line.match(/You gain (\d+) (EXP|Credit)/i);
    if (eg) {
      if (/exp/i.test(eg[2])) out.exp += +eg[1];
      else out.credit += +eg[1];
      continue;
    }
    const sm = line.match(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)[^>]*>([^<]+)</i);
    if (!sm) continue;
    const r = sm[1], g = sm[2], b = sm[3], name = sm[4].trim();
    if (r === '255' && g === '0' && b === '0') {
      // 装备: 按品质门槛归 'Equipment of X'(X=末词类型)
      const q = QUALITIES.findIndex((x) => name.includes(x));
      if (q === -1 || q >= dropQuality) {
        const type = name.split(/\s+/).pop() || name;
        const key = `Equipment of ${type}`;
        out.drops[key] = (out.drops[key] || 0) + 1;
      }
    } else if (r === '186' && g === '5' && b === '180') {
      // 水晶: 'Nx Crystal of Y' 数量累加
      const cm = name.match(/(\d+)x (Crystal of \w+)/);
      if (cm) out.drops[cm[2]] = (out.drops[cm[2]] || 0) + +cm[1];
      else out.drops[name] = (out.drops[name] || 0) + 1;
    } else if (r === '168' && g === '144' && b === '0') {
      // 金色 = Credit 文本内数字
      const nm = name.match(/\d+/);
      if (nm) out.credit += +nm[0];
    } else {
      out.drops[name] = (out.drops[name] || 0) + 1; // 材料/卷轴按名
    }
  }
  return out;
}
