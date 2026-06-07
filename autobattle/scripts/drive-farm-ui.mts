// Farm UI regression checks that do not need a browser.
// Run: cd autobattle && npx tsx scripts/drive-farm-ui.mts
import assert from 'node:assert/strict';

class FakeLocalStorage {
  data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

class FakeInput {
  value = '';
  onchange: (() => void) | null = null;
}

class FakeElement {
  children: FakeElement[] = [];
  input: FakeInput | null = null;
  inner = '';

  constructor(public tag: string) {}

  setAttribute(): void {}

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  set innerHTML(html: string) {
    this.inner = html;
    if (html.includes('<input')) this.input = new FakeInput();
  }

  get innerHTML(): string {
    return this.inner;
  }

  querySelector(sel: string): FakeInput | null {
    if (sel === 'input') return this.input;
    return null;
  }
}

(globalThis as unknown as { document: { createElement: (tag: string) => FakeElement } }).document = {
  createElement: (tag: string) => new FakeElement(tag),
};
(globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();

const { textRow } = await import('../src/ui/components');
const { config } = await import('../src/core/config');

localStorage.setItem('hvab_farmState', JSON.stringify('COOLDOWN'));
localStorage.setItem('hvab_farmCooldownUntil', JSON.stringify(Date.now() + 12 * 3600_000));
config.set('arenaLevels', '');
const row = textRow('arenaLevels', '待刷列表');
const input = row.querySelector('input');

assert.ok(input, 'textRow should render an input');
input.value = 'gr,5,105';
input.onchange?.();
assert.equal(config.get('arenaLevels'), 'gr,5,105', 'textRow should persist string config values');
assert.equal(localStorage.getItem('hvab_farmState'), JSON.stringify('IDLE'), 'changing arenaLevels should wake farm FSM from cooldown');
assert.equal(localStorage.getItem('hvab_farmCooldownUntil'), JSON.stringify(0), 'changing arenaLevels should clear farm cooldown');

console.log('drive-farm-ui ok');
