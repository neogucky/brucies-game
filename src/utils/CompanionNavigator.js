export default class CompanionNavigator {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.getTileSize = options.getTileSize;
    this.getGridCols = options.getGridCols;
    this.getGridRows = options.getGridRows;
    this.isBlocked = options.isBlocked;
    this.debugGraphics = options.debugGraphics || this.scene.add.graphics();
    this.debugGraphics.setDepth(6);
  }

  destroy() {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
  }

  getTileCenter(tile) {
    const tileSize = this.getTileSize();
    return {
      x: (tile.col + 0.5) * tileSize,
      y: tile.row * tileSize,
    };
  }

  planPath({ start, target, walkOnly = false }) {
    if (!start || !target) return [];
    if (start.col === target.col && start.row === target.row) {
      return [
        {
          from: { col: start.col, row: start.row },
          to: { col: target.col, row: target.row },
          type: "STANDING",
        },
      ];
    }
    const maxCol = this.getGridCols() - 1;
    const maxRow = this.getGridRows() - 1;
    const keyFor = (col, row) => `${col},${row}`;
    const isOpen = (col, row) => !this.isBlocked(col, row);
    const isSolid = (col, row) => this.isBlocked(col, row);
    const isStandable = (col, row) =>
      isOpen(col, row) && row + 1 <= maxRow && isSolid(col, row + 1);
    const hasWall = (col, row) =>
      (col - 1 >= 0 && isSolid(col - 1, row)) ||
      (col + 1 <= maxCol && isSolid(col + 1, row));
    const findFallLanding = (col, startRow) => {
      for (let row = startRow + 1; row <= maxRow; row += 1) {
        if (isSolid(col, row)) return null;
        if (row + 1 <= maxRow && isSolid(col, row + 1) && isOpen(col, row)) {
          return row;
        }
      }
      return null;
    };
    const isClearRect = (colA, rowA, colB, rowB) => {
      const minCol = Math.min(colA, colB);
      const maxColRect = Math.max(colA, colB);
      const minRow = Math.min(rowA, rowB);
      const maxRowRect = Math.max(rowA, rowB);
      for (let col = minCol; col <= maxColRect; col += 1) {
        for (let row = minRow; row <= maxRowRect; row += 1) {
          if (!isOpen(col, row)) return false;
        }
      }
      return true;
    };
    const getMoves = (node) => {
      const moves = [];
      const { col, row } = node;
      if (isStandable(col, row)) {
        const walkDirs = [-1, 1];
        for (let i = 0; i < walkDirs.length; i += 1) {
          const nextCol = col + walkDirs[i];
          if (nextCol < 0 || nextCol > maxCol) continue;
          if (isStandable(nextCol, row)) {
            moves.push({ col: nextCol, row, type: "WALKING" });
          } else if (isOpen(nextCol, row)) {
            const landingRow = findFallLanding(nextCol, row);
            if (landingRow !== null) {
              moves.push({ col: nextCol, row: landingRow, type: "FALLING" });
            }
          }
        }
        const dropRow = findFallLanding(col, row);
        if (dropRow !== null) {
          moves.push({ col, row: dropRow, type: "FALLING" });
        }
        if (!walkOnly) {
          for (let dx = -2; dx <= 2; dx += 1) {
            if (dx === 0) continue;
            for (let dy = -2; dy <= -1; dy += 1) {
              const nextCol = col + dx;
              const nextRow = row + dy;
              if (
                nextCol < 0 ||
                nextRow < 0 ||
                nextCol > maxCol ||
                nextRow > maxRow
              ) {
                continue;
              }
              if (!isStandable(nextCol, nextRow)) continue;
              if (!isClearRect(col, row + dy, nextCol, row)) continue;
              moves.push({ col: nextCol, row: nextRow, type: "JUMPING" });
            }
          }
        }
      }
      if (!walkOnly && hasWall(col, row)) {
        const climbSteps = [-1, 1];
        for (let i = 0; i < climbSteps.length; i += 1) {
          const nextRow = row + climbSteps[i];
          if (nextRow < 0 || nextRow > maxRow) continue;
          if (isOpen(col, nextRow)) {
            moves.push({ col, row: nextRow, type: "CLIMBING" });
          }
        }
      }
      if (!isStandable(col, row)) {
        const landingRow = findFallLanding(col, row);
        if (landingRow !== null && landingRow !== row) {
          moves.push({ col, row: landingRow, type: "FALLING" });
        }
      }
      return moves;
    };
    const startKey = keyFor(start.col, start.row);
    const targetKey = keyFor(target.col, target.row);
    const queue = [start];
    const visited = new Set([startKey]);
    const parent = new Map();
    const costs = new Map([[startKey, 0]]);
    while (queue.length) {
      const current = queue.shift();
      if (!current) break;
      const currentKey = keyFor(current.col, current.row);
      if (currentKey === targetKey) break;
      const moves = getMoves(current);
      for (let i = 0; i < moves.length; i += 1) {
        const next = moves[i];
        const nextKey = keyFor(next.col, next.row);
        const moveCost = next.type === "WALKING" ? 1 : 2;
        const nextCost = (costs.get(currentKey) ?? 0) + moveCost;
        if (!visited.has(nextKey)) {
          visited.add(nextKey);
          parent.set(nextKey, { from: currentKey, type: next.type });
          costs.set(nextKey, nextCost);
          queue.push({ col: next.col, row: next.row });
        } else if (nextCost < (costs.get(nextKey) ?? Infinity)) {
          parent.set(nextKey, { from: currentKey, type: next.type });
          costs.set(nextKey, nextCost);
        }
      }
    }
    if (!parent.has(targetKey)) {
      return this.buildFallbackPlan(start, target);
    }
    const steps = [];
    let cursor = targetKey;
    while (cursor && cursor !== startKey) {
      const [colStr, rowStr] = cursor.split(",");
      const meta = parent.get(cursor);
      if (!meta) break;
      const [fromColStr, fromRowStr] = meta.from.split(",");
      steps.push({
        from: { col: Number(fromColStr), row: Number(fromRowStr) },
        to: { col: Number(colStr), row: Number(rowStr) },
        type: meta.type,
      });
      cursor = meta.from;
    }
    return steps.reverse();
  }

  buildFallbackPlan(start, target) {
    const steps = [];
    let currentCol = start.col;
    let currentRow = start.row;
    while (currentCol !== target.col) {
      const nextCol = currentCol + (currentCol < target.col ? 1 : -1);
      if (this.isBlocked(nextCol, currentRow)) break;
      steps.push({
        from: { col: currentCol, row: currentRow },
        to: { col: nextCol, row: currentRow },
        type: "WALKING",
      });
      currentCol = nextCol;
    }
    while (currentRow !== target.row) {
      const nextRow = currentRow + (currentRow < target.row ? 1 : -1);
      if (this.isBlocked(currentCol, nextRow)) break;
      steps.push({
        from: { col: currentCol, row: currentRow },
        to: { col: currentCol, row: nextRow },
        type: "WALKING",
      });
      currentRow = nextRow;
    }
    return steps;
  }

  drawPlan(plan) {
    if (!this.debugGraphics) return;
    this.debugGraphics.clear();
    if (!plan || !plan.length) return;
    const colors = {
      WALKING: 0x3ad63a,
      FALLING: 0x3ad63a,
      CLIMBING: 0x3a7bd6,
      JUMPING: 0xd63a3a,
      STANDING: 0xcfcfcf,
    };
    for (let i = 0; i < plan.length; i += 1) {
      const step = plan[i];
      const from = this.getTileCenter(step.from);
      const to = this.getTileCenter(step.to);
      const color = colors[step.type] ?? 0xffffff;
      this.debugGraphics.lineStyle(2, color, 1);
      this.debugGraphics.beginPath();
      this.debugGraphics.moveTo(from.x, from.y);
      this.debugGraphics.lineTo(to.x, to.y);
      this.debugGraphics.strokePath();
    }
  }
}
