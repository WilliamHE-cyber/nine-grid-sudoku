// 验证新增逻辑：数字完成态 + 行/列/宫完成闪烁（提取实际函数源码，同作用域执行）
const fs = require('fs');
const S = require('./sudoku-core.js');

const html = fs.readFileSync('index.html', 'utf8');
const js = html.match(/<script>\n([\s\S]*?)\n<\/script>/)[1];

function extractFn(name) {
  const start = js.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('未找到函数 ' + name);
  let i = js.indexOf('{', start);
  let depth = 0;
  for (; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}') { depth--; if (depth === 0) break; }
  }
  return js.slice(start, i + 1);
}

const src = {
  isNumberComplete: extractFn('isNumberComplete'),
  refreshPad: extractFn('refreshPad'),
  lineIndex: extractFn('lineIndex'),
  isLineComplete: extractFn('isLineComplete'),
  flashLine: extractFn('flashLine'),
  refreshCompletions: extractFn('refreshCompletions')
};

// 同一作用域声明所有函数，让它们互相可见；state/cellEls/padBtns/lineDone 经参数注入
function makeEnv(overrides = {}) {
  const decls = [src.isNumberComplete, src.refreshPad, src.lineIndex, src.isLineComplete, src.flashLine, src.refreshCompletions];
  const body = decls.join('\n') + '\nreturn { isNumberComplete, refreshPad, lineIndex, isLineComplete, flashLine, refreshCompletions };';
  return new Function('state', 'cellEls', 'padBtns', 'lineDone', body);
}

function mockEl() {
  const classes = new Set();
  return {
    classes,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, force) => { if (force) classes.add(c); else classes.delete(c); return force; },
      contains: (c) => classes.has(c)
    },
    offsetWidth: 0
  };
}

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  ✓ ' + label); } else { fail++; console.log('  ✗ ' + label); } }

const cellEls = Array.from({ length: 81 }, () => mockEl());
const padBtns = Array.from({ length: 9 }, () => mockEl());

console.log('=== 测试 1：完整解 → 数字/行列宫全完成 ===');
const solved = S.generateSolved();
let F = makeEnv()({ solution: solved, grid: solved.slice() }, cellEls, padBtns, { rows: [0], cols: [0], boxes: [0] });
let allNum = true;
for (let n = 1; n <= 9; n++) if (!F.isNumberComplete(n)) allNum = false;
ok(allNum, '9 个数字全部识别为完成');
let allLine = true;
for (let i = 0; i < 9; i++)
  for (const kind of ['row', 'col', 'box'])
    if (!F.isLineComplete(kind, i)) allLine = false;
ok(allLine, '27 条线全部识别为完成');

console.log('=== 测试 2：差一格 → 未完成，补上后完成 ===');
const grid2 = solved.slice();
grid2[8] = 0;
F = makeEnv()({ solution: solved, grid: grid2.slice() }, cellEls, padBtns, { rows: [0], cols: [0], boxes: [0] });
ok(F.isLineComplete('row', 0) === false, '第 0 行缺一格 → 未完成');
ok(F.isNumberComplete(solved[8]) === false, '被挖数字 ' + solved[8] + ' 未完成');
grid2[8] = solved[8];
F = makeEnv()({ solution: solved, grid: grid2.slice() }, cellEls, padBtns, { rows: [0], cols: [0], boxes: [0] });
ok(F.isLineComplete('row', 0) === true, '补上后第 0 行完成');
ok(F.isNumberComplete(solved[8]) === true, '补上后数字完成');

console.log('=== 测试 3：lineIndex 映射正确 ===');
F = makeEnv()({}, [], [], {});
function checkMapping(kind) {
  for (let idx = 0; idx < 9; idx++) {
    const arr = [];
    for (let k = 0; k < 9; k++) arr.push(F.lineIndex(kind, idx, k));
    const uniq = new Set(arr);
    if (uniq.size !== 9 || arr.some((x) => x < 0 || x > 80)) return false;
  }
  return true;
}
ok(checkMapping('row'), '行映射 9 索引不重不漏');
ok(checkMapping('col'), '列映射 9 索引不重不漏');
ok(checkMapping('box'), '宫映射 9 索引不重不漏');

console.log('=== 测试 4：refreshCompletions 仅新完成才闪烁 ===');
// 用记录版 flashLine 覆盖，验证首次 27 次、二次 0 次
const rcSrc = src.refreshCompletions;
const body4 = src.isLineComplete + '\n' + 'function flashLine(kind, idx) { flashLog.push(kind + ":" + idx); }\n' + rcSrc + '\nreturn { refreshCompletions };';
const RC = new Function('state', 'isLineComplete', 'lineDone', 'flashLog', body4);
let flashLog = [];
let rc = RC({ solution: solved, grid: solved.slice() }, null, { rows: new Array(9).fill(false), cols: new Array(9).fill(false), boxes: new Array(9).fill(false) }, flashLog);
// isLineComplete 需绑定正确 state：在 body4 里 isLineComplete 引用的是参数 state，但这里 state 传了，isLineComplete 参数传 null —— 需修正
// 直接构造：state 作为参数，isLineComplete 也用同一 state
const body4b = src.lineIndex + '\n' + src.isLineComplete + '\n' + 'function flashLine(kind, idx) { flashLog.push(kind + ":" + idx); }\n' + rcSrc + '\nreturn { refreshCompletions };';
const RC2 = new Function('state', 'lineDone', 'flashLog', body4b);
flashLog = [];
rc = RC2({ solution: solved, grid: solved.slice() }, { rows: new Array(9).fill(false), cols: new Array(9).fill(false), boxes: new Array(9).fill(false) }, flashLog);
rc.refreshCompletions();
const first = flashLog.length;
flashLog = [];
rc.refreshCompletions();
const second = flashLog.length;
ok(first === 27, '首次刷新闪烁 27 次（实际 ' + first + '）');
ok(second === 0, '第二次刷新不再闪烁（实际 ' + second + '）');

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail === 0 ? 0 : 1);
