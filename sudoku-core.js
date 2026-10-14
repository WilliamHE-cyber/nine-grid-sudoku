/*
 * sudoku-core.js
 * 数独核心算法：生成完整解、回溯求解、唯一解校验、按难度生成谜题。
 * 同一份逻辑既在浏览器挂到 window.SudokuCore，也在 node 下 module.exports，
 * 供界面与测试共用，避免"界面一份、测试一份"导致逻辑漂移。
 *
 * 设计 notes（给接手实现的同学）：
 *  - 唯一解是 sudoku.com 的命门：任何一个谜题必须有且仅有一个解，否则"靠猜"破坏公平。
 *  - 难度用"给定数(clues)数量"驱动：clues 越少 → 需要推导步数越多 → 越难。
 *    这是有 rationale 的，不是 magic number：9×9 唯一解的理论最小 clues = 17。
 *  - 各档 target 为设计意图值；受唯一解约束，实测 clues 可能略高于 target（见 test-core 输出）。
 */
(function (global) {
  'use strict';

  const SIZE = 9;
  const CELLS = 81;

  function emptyGrid() {
    return new Array(CELLS).fill(0);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  const rowOf = (i) => Math.floor(i / 9);
  const colOf = (i) => i % 9;
  const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

  // 返回某空格的合法候选数（1..9），已排除行/列/宫冲突。
  function candidates(grid, idx) {
    if (grid[idx] !== 0) return [];
    const used = new Array(10).fill(false);
    const r = rowOf(idx), c = colOf(idx);
    for (let k = 0; k < 9; k++) {
      used[grid[r * 9 + k]] = true;
      used[grid[k * 9 + c]] = true;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        used[grid[(br + dr) * 9 + (bc + dc)]] = true;
      }
    }
    const res = [];
    for (let n = 1; n <= 9; n++) if (!used[n]) res.push(n);
    return res;
  }

  // 随机化回溯填充一个完整合法解。
  function generateSolved() {
    const grid = emptyGrid();
    function fill() {
      let idx = -1;
      for (let i = 0; i < CELLS; i++) {
        if (grid[i] === 0) { idx = i; break; }
      }
      if (idx === -1) return true; // 已全部填满
      const cands = shuffle(candidates(grid, idx));
      for (const n of cands) {
        grid[idx] = n;
        if (fill()) return true;
        grid[idx] = 0;
      }
      return false;
    }
    fill();
    return grid;
  }

  // 统计解的数量，遇到 limit 即提前返回（用于唯一性判定，limit=2）。
  // 采用 MRV（最少剩余值）选格，避免盲目递归，低 clues 状态也能快速判定。
  function countSolutions(grid, limit) {
    const g = grid.slice();
    let count = 0;
    function solve() {
      let best = -1, bestCands = null;
      for (let i = 0; i < CELLS; i++) {
        if (g[i] !== 0) continue;
        const c = candidates(g, i);
        if (c.length === 0) return; // 死路
        if (best === -1 || c.length < bestCands.length) {
          best = i;
          bestCands = c;
          if (c.length === 1) break; // 已是最少，无需再找
        }
      }
      if (best === -1) { count++; return; }
      for (const n of bestCands) {
        g[best] = n;
        solve();
        g[best] = 0;
        if (count >= limit) return;
      }
    }
    solve();
    return count;
  }

  // 返回第一个解（用于提示/校验）；无解返回 null。
  function solve(grid) {
    const g = grid.slice();
    function rec() {
      let best = -1, bestCands = null;
      for (let i = 0; i < CELLS; i++) {
        if (g[i] !== 0) continue;
        const c = candidates(g, i);
        if (c.length === 0) return false;
        if (best === -1 || c.length < bestCands.length) {
          best = i;
          bestCands = c;
          if (c.length === 1) break;
        }
      }
      if (best === -1) return true;
      for (const n of bestCands) {
        g[best] = n;
        if (rec()) return true;
        g[best] = 0;
      }
      return false;
    }
    return rec() ? g : null;
  }

  // 给定数 -> 难度映射。clues 越少越难。下限 17 是 9×9 唯一解理论最小。
  const DIFFICULTY_CLUES = {
    fast: 45,
    easy: 40,
    medium: 34,
    hard: 30,
    expert: 26,
    giant: 23
  };

  // 在保持唯一解的前提下尽量挖空到 targetClues。
  // rationale：逐格随机尝试挖空，挖后若解不再唯一则回填（保留为 given）。
  // 受唯一解约束，最终 clues 可能略高于 target——这是正确性的代价，不是 bug。
  function generatePuzzle(targetClues) {
    const solution = generateSolved();
    const puzzle = solution.slice();
    const order = shuffle([...Array(CELLS).keys()]);
    let clues = CELLS;
    for (const idx of order) {
      if (clues <= targetClues) break;
      const backup = puzzle[idx];
      if (backup === 0) continue;
      puzzle[idx] = 0;
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[idx] = backup; // 非唯一，回填
      } else {
        clues--;
      }
    }
    return { puzzle, solution, clues };
  }

  function generateByDifficulty(diff) {
    const target = DIFFICULTY_CLUES[diff] || 34;
    return generatePuzzle(target);
  }

  const api = {
    SIZE, CELLS,
    rowOf, colOf, boxOf,
    emptyGrid, candidates,
    generateSolved, countSolutions, solve,
    generatePuzzle, generateByDifficulty,
    DIFFICULTY_CLUES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.SudokuCore = api;
  }
})(typeof window !== 'undefined' ? window : this);
