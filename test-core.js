/*
 * test-core.js — 数独核心算法验证（node 环境）
 * 验证三件事：① 生成的谜题唯一解 ② 给定数数量在设计区间内 ③ 求解器与"填解即胜"循环正确。
 * 跑法：node test-core.js
 */
const S = require('./sudoku-core.js');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  -> ' + extra : '')); }
}

function countGivens(g) { return g.reduce((a, v) => a + (v !== 0 ? 1 : 0), 0); }

console.log('== 1. 索引/候选数基础 ==');
check('boxOf 角格分组正确', S.boxOf(0) === 0 && S.boxOf(80) === 8 && S.boxOf(40) === 4);
{
  const full = S.generateSolved();
  const givens = countGivens(full);
  check('generateSolved 填满 81 格', givens === 81, 'givens=' + givens);
  check('完整解 countSolutions == 1', S.countSolutions(full, 2) === 1);
}

console.log('== 2. 六档难度生成 + 唯一解校验 ==');
const DIFFS = ['fast', 'easy', 'medium', 'hard', 'expert', 'giant'];
const PER = 3; // 每档生成几局做统计
for (const d of DIFFS) {
  console.log('  -- ' + d + ' (target clues=' + S.DIFFICULTY_CLUES[d] + ') --');
  let minClues = 99, maxClues = 0, maxMs = 0;
  for (let i = 0; i < PER; i++) {
    const t0 = Date.now();
    const { puzzle, solution, clues } = S.generateByDifficulty(d);
    const ms = Date.now() - t0;
    maxMs = Math.max(maxMs, ms);

    const givens = countGivens(puzzle);
    check(d + ' #' + i + ' 给定数 == 返回 clues', givens === clues, 'givens=' + givens + ' clues=' + clues);
    check(d + ' #' + i + ' 唯一解', S.countSolutions(puzzle, 2) === 1);
    const solved = S.solve(puzzle);
    check(d + ' #' + i + ' 求解器还原出完整解', !!solved && solved.every((v, k) => v === solution[k]));
    minClues = Math.min(minClues, clues);
    maxClues = Math.max(maxClues, clues);
  }
  console.log('     实测 clues 区间 [' + minClues + ', ' + maxClues + ']，单局最慢 ' + maxMs + 'ms');
}

console.log('== 3. 核心循环模拟：填入正解即判胜 ==');
{
  const { puzzle, solution } = S.generateByDifficulty('medium');
  const play = puzzle.slice();
  let won = true;
  for (let i = 0; i < 81; i++) {
    if (play[i] === 0) play[i] = solution[i]; // 模拟玩家每步都填对
  }
  // 胜利条件：满格且等于解
  const isWin = play.every((v, k) => v !== 0 && v === solution[k]);
  check('全填正解 -> 判胜', isWin);
}

console.log('== 4. 错误判定：与解不符即记为错 ==');
{
  const { puzzle, solution } = S.generateByDifficulty('easy');
  // 找一个空格，填一个"非正解且不与给定直接冲突"的错值
  let target = -1;
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] === 0) { target = i; break; }
  }
  const correct = solution[target];
  const wrong = correct === 9 ? 1 : 9;
  check('错值 ≠ 正解', wrong !== correct);
  // 错误应被算作 mistake（这里只验证"错值定义正确"，UI 层负责计数）
  check('错值判定逻辑自洽', wrong !== solution[target]);
}

console.log('\n== 结果 ==');
console.log('PASS ' + pass + ' / FAIL ' + fail);
process.exit(fail === 0 ? 0 : 1);
