import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: '[HV] 自动战斗 · 盾战大脑', // 仅中文, 不做多语言
        namespace: 'https://github.com/local/hv-autobattle',
        version: '0.1.1',
        description: 'HV 单手盾战现代化半自动辅助(独立重写,忠实翻写 dodying 引擎)',
        author: 'local',
        match: ['*://hentaiverse.org/*', '*://alt.hentaiverse.org/*', '*://e-hentai.org/*'],
        // 装备详情页(如 /equip/241735058/40e667a2ce)是独立展示页, 无战斗 DOM, 脚本不应注入/运行 → @exclude 彻底不加载(比运行时跳过更干净)
        exclude: ['*://hentaiverse.org/equip/*', '*://alt.hentaiverse.org/equip/*'],
        connect: ['hentaiverse.org', 'e-hentai.org'],
        grant: [
          'GM_getValue',
          'GM_setValue',
          'GM_deleteValue',
          'GM_notification',
          'GM_xmlhttpRequest',
          'unsafeWindow',
        ],
        'run-at': 'document-start',
      },
      build: {
        fileName: 'hv-autobattle.user.js',
      },
    }),
  ],
  build: {
    // 不压缩、不丑化: 保留变量名与结构, 充分可调试 (vite-plugin-monkey 默认即 false, 显式声明加保险)
    minify: false,
  },
});
