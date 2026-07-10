import { CatPlacement, StageData, Cell } from './types';
import { MAX_ROWS } from './layout';
import { cellKey, isEscapable } from './escape';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type ShapeKind = 'rect' | 'T' | 'U' | 'cross' | 'H' | 'diamond';

// 컨테이너 모양(유효 칸 집합)을 만든다.
function makeShape(kind: ShapeKind, cols: number, rows: number): Set<string> {
  const S = new Set<string>();
  const add = (c: number, r: number) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) S.add(cellKey(c, r));
  };
  if (kind === 'rect') {
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) add(c, r);
  } else if (kind === 'T') {
    const th = Math.min(2, rows - 1); // 윗 가로바 높이
    const stemW = Math.max(1, Math.floor(cols / 3));
    const s0 = Math.floor((cols - stemW) / 2);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (r < th) add(c, r);
        else if (c >= s0 && c < s0 + stemW) add(c, r);
      }
  } else if (kind === 'U') {
    const armW = Math.max(1, Math.floor(cols / 3));
    const bh = Math.min(2, rows); // 아래 가로바 높이
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (c < armW || c >= cols - armW || r >= rows - bh) add(c, r);
      }
  } else if (kind === 'cross') {
    const vw = Math.max(1, cols - 2 * Math.floor(cols / 3));
    const vs = Math.floor((cols - vw) / 2);
    const hh = Math.max(1, rows - 2 * Math.floor(rows / 3));
    const hs = Math.floor((rows - hh) / 2);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if ((c >= vs && c < vs + vw) || (r >= hs && r < hs + hh)) add(c, r);
      }
  } else if (kind === 'H') {
    // 양쪽 세로 기둥 + 가운데 가로 다리
    const armW = Math.max(1, Math.floor(cols / 3));
    const midR = Math.floor(rows / 2);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (c < armW || c >= cols - armW || r === midR || r === midR - 1) add(c, r);
      }
  } else {
    // diamond (마름모) — 가운데 행은 전체 폭, 위아래로 갈수록 좁아진다
    const cc = (cols - 1) / 2;
    const cr = (rows - 1) / 2;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (Math.abs(c - cc) + (Math.abs(r - cr) * cc) / cr <= cc + 0.5) add(c, r);
      }
  }
  return S;
}

function pickKind(rng: () => number, id: number): ShapeKind {
  if (id < 3) return 'rect';
  // 고득점 스테이지도 rect 를 섞어(꽉 찬 큰 판) 밀도/볼륨을 확보한다.
  const pool: ShapeKind[] =
    id >= 6 ? ['rect', 'rect', 'T', 'U', 'cross', 'H', 'diamond'] : ['rect', 'T', 'U'];
  return pool[Math.floor(rng() * pool.length)];
}

const toCells = (set: Set<string>): Cell[] =>
  Array.from(set, (k) => {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
  });

/**
 * 미로 탈출 배치 생성 (비직사각형 컨테이너 지원).
 * - shape: 컨테이너 모양(유효 칸). 바깥은 void 로 길이 막힌다.
 * - walls: 컨테이너 안의 통과 불가 장애물.
 * - 역방향 구성 + 먼 칸부터 채우기로 촘촘하고 항상 클리어 가능한 미로.
 */
export function makeStage(id: number): StageData {
  const rng = mulberry32(0x9e3779b9 ^ Math.imul(id, 2654435761));

  const cols = clamp(3 + Math.floor((id - 1) / 3), 3, 6);
  const rows = clamp(4 + Math.floor((id - 1) / 2), 4, MAX_ROWS);
  const kind = pickKind(rng, id);
  const shape = makeShape(kind, cols, rows);

  // 탈출구 후보 = 각 열의 "바닥 경계" 칸(아래에 유효 칸이 없는 칸).
  // 직사각형이면 맨 아래 행과 같고, 다이아몬드/H 같은 모양도 자연스럽게 성립한다.
  const exitCand: Cell[] = toCells(shape).filter(
    (c) => !shape.has(cellKey(c.col, c.row + 1)),
  );
  for (let i = exitCand.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [exitCand[i], exitCand[j]] = [exitCand[j], exitCand[i]];
  }
  const exitCount = id >= 4 && exitCand.length >= 2 ? 2 : 1;
  const exits: Cell[] = [exitCand[0]];
  if (exitCount === 2) {
    // 두 번째 탈출구는 좌우 대칭 위치를 우선(디자인된 느낌), 없으면 아무거나
    const mirror = exitCand.find(
      (c) => c.col === cols - 1 - exits[0].col && c.row === exits[0].row && c !== exits[0],
    );
    exits.push(mirror ?? exitCand[1]);
  }
  const exitKeys = new Set(exits.map((e) => cellKey(e.col, e.row)));

  // 벽(통과 불가) — 난이도 오를수록 증가. 탈출구 칸은 피하고,
  // 벽이 통행 영역을 탈출구에서 끊어버리면(고립) 취소한다.
  const shapeArr = toCells(shape);
  const wallCount = clamp(1 + Math.floor((id - 1) * 0.5), 0, Math.floor(shape.size * 0.22));
  const walls = new Set<string>();
  const stillConnected = () => {
    const seen = new Set<string>();
    const q: [number, number][] = [];
    for (const e of exits) {
      const k = cellKey(e.col, e.row);
      if (shape.has(k) && !walls.has(k)) {
        seen.add(k);
        q.push([e.col, e.row]);
      }
    }
    for (let h = 0; h < q.length; h++) {
      const [c, r] = q[h];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nk = cellKey(c + dc, r + dr);
        if (shape.has(nk) && !walls.has(nk) && !seen.has(nk)) {
          seen.add(nk);
          q.push([c + dc, r + dr]);
        }
      }
    }
    let passableTotal = 0;
    for (const k of shape) if (!walls.has(k)) passableTotal++;
    return seen.size === passableTotal;
  };
  // 벽은 좌우 대칭 쌍으로 놓아 "디자인된 패턴" 느낌을 만든다.
  // 확률적으로 세로 2칸 기둥으로 확장(참고 이미지의 브래킷/기둥 모양).
  const tryAddGroup = (cells: Cell[]): boolean => {
    const keys = cells.map((c) => cellKey(c.col, c.row));
    // 전부 유효해야 통째로 추가 (일부만 놓이면 대칭이 깨짐)
    for (const k of keys) {
      if (!shape.has(k) || walls.has(k) || exitKeys.has(k)) return false;
    }
    for (const k of keys) walls.add(k);
    if (!stillConnected()) {
      for (const k of keys) walls.delete(k);
      return false;
    }
    return true;
  };
  for (let t = 0; walls.size < wallCount && t < wallCount * 40; t++) {
    const c = Math.floor(rng() * Math.ceil(cols / 2)); // 왼쪽 절반에서 뽑고
    const r = Math.floor(rng() * rows);
    const mc = cols - 1 - c; // 오른쪽에 미러
    const group: Cell[] = [{ col: c, row: r }];
    if (mc !== c) group.push({ col: mc, row: r });
    if (rng() < 0.45 && r + 1 < rows) {
      // 세로 기둥으로 확장
      group.push({ col: c, row: r + 1 });
      if (mc !== c) group.push({ col: mc, row: r + 1 });
    }
    tryAddGroup(group);
  }

  // 통행 가능 칸 = shape - walls
  const passable = new Set<string>();
  for (const k of shape) if (!walls.has(k)) passable.add(k);

  // 탈출구로부터의 거리(통행 가능 칸 BFS) — 먼 칸부터 채운다.
  const dist = new Map<string, number>();
  {
    const q: [number, number][] = [];
    for (const e of exits) {
      const k = cellKey(e.col, e.row);
      if (passable.has(k)) {
        dist.set(k, 0);
        q.push([e.col, e.row]);
      }
    }
    for (let h = 0; h < q.length; h++) {
      const [c, r] = q[h];
      const d = dist.get(cellKey(c, r))!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nk = cellKey(c + dc, r + dr);
        if (passable.has(nk) && !dist.has(nk)) {
          dist.set(nk, d + 1);
          q.push([c + dc, r + dr]);
        }
      }
    }
  }

  const fillRatio = 0.78 + Math.min(0.16, (id - 1) * 0.012);
  const target = Math.round(passable.size * fillRatio);

  // 역방향 구성: 탈출 가능한 빈 칸에 먼 곳부터 배치.
  const occupied = new Set<string>();
  const placement: Cell[] = [];
  for (let i = 0; i < target; i++) {
    const cands: Cell[] = [];
    for (const k of passable) {
      if (occupied.has(k)) continue;
      const [c, r] = k.split(',').map(Number);
      occupied.add(k);
      const esc = isEscapable(c, r, occupied, passable, exits);
      occupied.delete(k);
      if (esc) cands.push({ col: c, row: r });
    }
    if (!cands.length) break;
    let maxD = -1;
    for (const cell of cands) maxD = Math.max(maxD, dist.get(cellKey(cell.col, cell.row)) ?? -1);
    const top = cands.filter((cell) => (dist.get(cellKey(cell.col, cell.row)) ?? -1) === maxD);
    const pick = top[Math.floor(rng() * top.length)];
    occupied.add(cellKey(pick.col, pick.row));
    placement.push(pick);
  }

  while (placement.length % 3 !== 0) placement.pop();

  const escapeOrder = placement.slice().reverse();

  // 스폰 파이프 위치 선정 (탈출 순서상의 인덱스 idx 포함).
  //  - 개수: 5+ = 1개, 9+ = 2개.  깊이(idx): 오를수록 미로 깊숙이.
  //  - 2개면 좌우 대칭 쌍 우선.
  // 파이프당 3마리로 고정 — 이래야 큐 안에서 같은 색이 최대 2개라 절대 자기들끼리
  // 매치되지 않고 반드시 보드 고양이와 조합해야 한다. (볼륨은 파이프 개수로 조절)
  const pipeGroups = 1;
  const pipePlace: { col: number; row: number; idx: number }[] = [];
  if (id >= 5 && escapeOrder.length >= 3) {
    // 개수: 5+ = 1, 9+ = 2, 16+ = 3.  깊이: 오를수록 미로 깊숙이.
    const pipeCount = clamp(id >= 16 ? 3 : id >= 9 ? 2 : 1, 1, Math.floor(escapeOrder.length / 3));
    const depth = clamp(Math.floor((id - 5) / 2), 0, escapeOrder.length - 1);
    const idxAt = (col: number, row: number) =>
      escapeOrder.findIndex((c) => c.col === col && c.row === row);

    // 2개면 좌우 대칭 쌍 우선
    let placed = false;
    if (pipeCount === 2) {
      for (let i = depth; i < escapeOrder.length; i++) {
        const a = escapeOrder[i];
        const mc = cols - 1 - a.col;
        if (mc === a.col) continue;
        const j = idxAt(mc, a.row);
        if (j !== -1) {
          pipePlace.push({ col: a.col, row: a.row, idx: i });
          pipePlace.push({ col: mc, row: a.row, idx: j });
          placed = true;
          break;
        }
      }
    }
    // 아니면 탈출 순서상 고르게 퍼뜨려 배치 (깊은 곳 위주)
    if (!placed) {
      const used = new Set<number>();
      for (let p = 0; p < pipeCount; p++) {
        const frac = pipeCount === 1 ? 0 : p / (pipeCount - 1); // 0..1
        let idx = clamp(
          depth + Math.round(frac * (escapeOrder.length - 1 - depth)),
          0,
          escapeOrder.length - 1,
        );
        while (idx < escapeOrder.length && used.has(idx)) idx++;
        if (idx >= escapeOrder.length) {
          idx = escapeOrder.length - 1;
          while (idx >= 0 && used.has(idx)) idx--;
        }
        if (idx < 0) break;
        used.add(idx);
        const c = escapeOrder[idx];
        pipePlace.push({ col: c.col, row: c.row, idx });
      }
    }
  }

  // 보드 탈출 순서 + 파이프 배출 순서를 하나의 "유효한 제거 순서"로 합친다.
  // (파이프 고양이는 자기 출구 칸의 보드 고양이가 빠진 직후 나오므로 그 위치에 끼워넣음)
  // 이 합친 순서를 3개씩 묶어 같은 색을 배정 → 파이프 고양이가 이웃 보드 고양이와 짝을
  // 이루게 되어 "파이프끼리만 맞는" 문제가 사라지고, 순서 자체가 재생 가능해 클리어 보장.
  type Slot = { kind: 'board'; cell: Cell } | { kind: 'pipe'; pipe: number };
  const desiredTypes = clamp(3 + Math.floor((id - 1) / 2), 3, 12);

  const assign = (pp: { col: number; row: number; idx: number }[]) => {
    const byIdx = new Map<number, number>();
    pp.forEach((p, pi) => byIdx.set(p.idx, pi));
    const seq: Slot[] = [];
    escapeOrder.forEach((cell, i) => {
      seq.push({ kind: 'board', cell });
      const pi = byIdx.get(i);
      if (pi !== undefined) for (let k = 0; k < pipeGroups * 3; k++) seq.push({ kind: 'pipe', pipe: pi });
    });
    const types = Math.max(1, Math.min(desiredTypes, seq.length / 3));
    const typeOfCell = new Map<string, number>();
    const pipeQueues: number[][] = pp.map(() => []);
    seq.forEach((entry, p) => {
      const t = Math.floor(p / 3) % types;
      if (entry.kind === 'board') typeOfCell.set(cellKey(entry.cell.col, entry.cell.row), t);
      else pipeQueues[entry.pipe].push(t);
    });
    return { types, typeOfCell, pipeQueues };
  };

  // 파이프 큐 안에 같은 색이 3개 이상 있으면 그 셋은 파이프끼리 자동 매치됨 → 나쁨.
  // 그런 파이프는 출구 칸(idx)을 한 칸씩 밀어(어느 위치든 클리어 보장 유지) 정렬을 어긋내
  // 이웃 보드 고양이와만 짝이 맞도록 만든다.
  const hasAutoMatch = (q: number[]) => {
    const m = new Map<number, number>();
    for (const t of q) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.values()].some((n) => n >= 3);
  };
  let assigned = assign(pipePlace);
  for (let fix = 0; fix < 12; fix++) {
    const bad = assigned.pipeQueues.findIndex(hasAutoMatch);
    if (bad === -1) break;
    const orig = pipePlace[bad].idx;
    let moved = false;
    for (let d = 1; d <= escapeOrder.length && !moved; d++) {
      for (const ni of [orig + d, orig - d]) {
        if (ni < 0 || ni >= escapeOrder.length) continue;
        if (pipePlace.some((p, i) => i !== bad && p.idx === ni)) continue;
        const c = escapeOrder[ni];
        const trial = pipePlace.slice();
        trial[bad] = { col: c.col, row: c.row, idx: ni };
        const a = assign(trial);
        if (!hasAutoMatch(a.pipeQueues[bad])) {
          pipePlace[bad] = trial[bad];
          assigned = a;
          moved = true;
          break;
        }
      }
    }
    if (!moved) break;
  }
  const { types, typeOfCell, pipeQueues } = assigned;

  const cats: CatPlacement[] = placement.map((cell) => ({
    id: `c${cell.col}_${cell.row}`,
    type: typeOfCell.get(cellKey(cell.col, cell.row))!,
    col: cell.col,
    row: cell.row,
  }));

  const spawners: StageData['spawners'] = pipePlace.map((p, pi) => ({
    col: p.col,
    row: p.row,
    queue: pipeQueues[pi],
  }));

  return {
    id,
    cols,
    rows,
    types,
    shape: shapeArr,
    walls: toCells(walls),
    exits,
    cats,
    spawners,
  };
}
