/*
 * headless-check.js — 无浏览器环境下实跑 index.html 的 UI 逻辑
 * 用最小 DOM 桩加载内联脚本，模拟"选格→填正确数"走通一整局直到判胜，
 * 捕捉 init/渲染/落子/判胜链路上的运行时错误（替代图形浏览器手测）。
 * 跑法：node headless-check.js
 */
const fs = require('fs');
const path = require('path');

// ---------- 最小 DOM 桩 ----------
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this._cls = new Set();
    this._text = '';
    this._handlers = {};
  }
  get className() { return [...this._cls].join(' '); }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get classList() {
    const s = this._cls;
    return {
      add: (...n) => n.forEach((x) => s.add(x)),
      remove: (...n) => n.forEach((x) => s.delete(x)),
      contains: (x) => s.has(x),
      toggle: (x, f) => {
        if (f === undefined) { s.has(x) ? s.delete(x) : s.add(x); }
        else { f ? s.add(x) : s.delete(x); }
      }
    };
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  get innerHTML() { return this._html || ''; }
  set innerHTML(v) { this._html = v; if (v === '') this.children = []; }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  addEventListener(ev, fn) { (this._handlers[ev] = this._handlers[ev] || []).push(fn); }
  click() { (this._handlers['click'] || []).forEach((fn) => fn({ preventDefault() {} })); }
  querySelectorAll(sel) {
    const res = [];
    const walk = (el) => {
      el.children.forEach((ch) => {
        let match = false;
        // 支持简单属性选择器 [key] / [key=value]
        const m = sel.match(/^\[([a-zA-Z-]+)(?:=("[^"]*"|'[^']*'|[\w-]+))?\]$/);
        if (m) {
          const key = m[1], val = m[2];
          if (val !== undefined) match = ch.dataset[key] === val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          else match = key in ch.dataset;
        } else {
          match = ch.tagName === sel.toUpperCase();
        }
        if (match) res.push(ch);
        walk(ch);
      });
    };
    walk(this);
    return res;
  }
}

const _ids = {};
const document = {
  documentElement: new El('html'),
  getElementById(id) { if (!_ids[id]) _ids[id] = new El('div'); return _ids[id]; },
  createElement(tag) { return new El(tag); },
  querySelectorAll(sel) { return this.documentElement.querySelectorAll(sel); },
  addEventListener() {}
};
document.documentElement.dataset.theme = 'light';

const _store = {};
const localStorage = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; }
};

const window = {};
window.SudokuCore = require('./sudoku-core.js');

// ---------- 提取 index.html 内联脚本并加载 ----------
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) { console.error('✗ 未找到内联脚本'); process.exit(1); }
const code = m[1];

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  -> ' + extra : '')); }
}

try {
  // 用 new Function 注入桩全局，执行内联脚本（其末尾会自动 init）
  const run = new Function('document', 'window', 'localStorage', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', code);
  run(document, window, localStorage, setInterval, clearInterval, setTimeout, clearTimeout);
  check('内联脚本加载并 init 无运行时错误', true);
} catch (e) {
  check('内联脚本加载并 init 无运行时错误', false, e.stack);
  console.log('\nPASS ' + pass + ' / FAIL ' + fail);
  process.exit(1);
}

// init 默认开一局 easy；从棋盘 DOM 读出给定数，反推解，再驱动填满判胜
const board = document.getElementById('board');
check('棋盘渲染出 81 格', board.children.length === 81, 'cells=' + board.children.length);

const puzzle = new Array(81).fill(0);
for (let i = 0; i < 81; i++) {
  const t = board.children[i].firstChild.textContent;
  puzzle[i] = t ? parseInt(t, 10) : 0;
}
const givenCount = puzzle.filter((v) => v !== 0).length;
check('easy 局给定数在合理区间', givenCount >= 36 && givenCount <= 44, 'givens=' + givenCount);

const solution = window.SudokuCore.solve(puzzle);
check('反推出的解存在', !!solution);

const pad = document.getElementById('pad');
check('数字键盘渲染 9 个按钮', pad.children.length === 9, 'btns=' + pad.children.length);

// 对每个空格：选格 -> 点对应数字按钮（填正确解）
let drove = 0;
try {
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] !== 0) continue; // 跳过给定
    board.children[i].click();           // selectCell(i)
    pad.children[solution[i] - 1].click(); // enterNumber(correct)
    drove++;
  }
  check('逐格填入正确解无报错', true, 'filled=' + drove);
} catch (e) {
  check('逐格填入正确解无报错', false, e.stack);
}

const modalTitle = document.getElementById('modalTitle').textContent;
check('填满后触发胜利弹窗', modalTitle.includes('完成') || modalTitle.includes('Completed'), 'title="' + modalTitle + '"');

// 撤销链路冒烟：新开一局后撤销
try {
  document.getElementById('btnNew').click();
  document.getElementById('btnUndo').click();
  check('新游戏 + 撤销无报错', true);
} catch (e) {
  check('新游戏 + 撤销无报错', false, e.stack);
}

console.log('\n== 结果 ==');
console.log('PASS ' + pass + ' / FAIL ' + fail);
process.exit(fail === 0 ? 0 : 1);
