// 탈출 길찾기 — 고양이가 통행 가능한 빈 칸(상·하·좌·우)을 따라 탈출구 칸에 닿을 수 있는지.
// passable = 컨테이너(shape) 중 벽이 아닌 통행 가능 칸. exits = 탈출구 칸.

export const cellKey = (col: number, row: number) => `${col},${row}`;

export interface Cell {
  col: number;
  row: number;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** 탈출구와 연결된 "통행 가능한 빈 칸" 집합. */
export function reachableEmpty(
  occupied: Set<string>,
  passable: Set<string>,
  exits: Cell[],
): Set<string> {
  const isEmpty = (c: number, r: number) => {
    const k = cellKey(c, r);
    return passable.has(k) && !occupied.has(k);
  };
  const reach = new Set<string>();
  const q: [number, number][] = [];
  for (const e of exits) {
    if (isEmpty(e.col, e.row)) {
      const k = cellKey(e.col, e.row);
      if (!reach.has(k)) {
        reach.add(k);
        q.push([e.col, e.row]);
      }
    }
  }
  for (let h = 0; h < q.length; h++) {
    const [c, r] = q[h];
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (isEmpty(nc, nr)) {
        const k = cellKey(nc, nr);
        if (!reach.has(k)) {
          reach.add(k);
          q.push([nc, nr]);
        }
      }
    }
  }
  return reach;
}

/** (col,row) 의 고양이가 탈출 가능한가. */
export function isEscapable(
  col: number,
  row: number,
  occupied: Set<string>,
  passable: Set<string>,
  exits: Cell[],
  reach?: Set<string>,
): boolean {
  for (const e of exits) if (e.col === col && e.row === row) return true;
  const r = reach ?? reachableEmpty(occupied, passable, exits);
  for (const [dc, dr] of DIRS) {
    if (r.has(cellKey(col + dc, row + dr))) return true;
  }
  return false;
}
