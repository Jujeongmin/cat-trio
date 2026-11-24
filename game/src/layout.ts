// 가상 캔버스 좌표계 — 실제 화면에는 CSS scale 로 맞춘다.
//
// 두 가지 배치가 있다 (CrazyGames PC 창은 대부분 가로 821×462 ~ 1920×1080):
//  - 세로(portrait) 480×1000: 위 HUD → 미로판 → 방석 슬롯 → 아이템 덱
//  - 가로(landscape) 1000×620: 왼쪽 미로판 · 오른쪽 HUD/시간바/슬롯/아이템 2단
// 스테이지 생성·난이도에 쓰는 값(CELL_BOX, MAX_ROWS)은 배치와 무관하게 고정이다.
export type LayoutMode = 'portrait' | 'landscape';

export const CELL = 72; // 고양이 표시 크기
export const CELL_BOX = 78; // 한 칸(타일) 크기

export const SLOT_CAT = 56; // 슬롯에 들어간 고양이 크기(기본, capacity=7 기준)
export const SLOT_BOX = 62; // 슬롯 칸 크기(기본)
export const SLOT_GAP = 6;
export const MAX_CAPACITY = 10; // 슬롯+1 아이템으로 늘어날 수 있는 최대 칸 수

// 보드(격자) 기준 상단 (세로 배치 기준값 — MAX_ROWS 계산에도 쓰여 바꾸면 안 된다)
export const BOARD_TOP = 126;
// 화면에 들어가는 최대 행 수 — 배치와 무관하게 고정(스테이지 생성/난이도 불변).
export const MAX_ROWS = Math.floor((596 - BOARD_TOP) / CELL_BOX);

interface LayoutSpec {
  vw: number;
  vh: number;
  boardLeft: number; // 미로판 영역 왼쪽
  boardWidth: number; // 미로판 영역 폭 (열들은 이 안에서 가운데)
  boardCenterY: number; // 고양이가 쓰는 행 범위의 중심이 올 y
  boardMinTop: number; // 맨 윗 행 상단이 이보다 위로 못 간다
  slotLeft: number; // 슬롯 줄 영역 왼쪽
  slotWidth: number; // 슬롯 줄 영역 폭
  slotY: number; // 슬롯 줄 중심 y
}

const SPECS: Record<LayoutMode, LayoutSpec> = {
  portrait: {
    vw: 480,
    vh: 1000,
    boardLeft: 0,
    boardWidth: 480,
    boardCenterY: 388,
    boardMinTop: 96,
    slotLeft: 0,
    slotWidth: 480,
    slotY: 724,
  },
  landscape: {
    vw: 1000,
    vh: 620,
    boardLeft: 14,
    boardWidth: 510,
    boardCenterY: 318,
    boardMinTop: 34,
    slotLeft: 520,
    slotWidth: 480,
    slotY: 300,
  },
};

let mode: LayoutMode = 'portrait';
let L: LayoutSpec = SPECS.portrait;

/** 창 비율로 배치를 고른다. 5:4 보다 넓으면 가로 2단. */
export function pickLayout(w: number, h: number): LayoutMode {
  return w / Math.max(1, h) >= 1.25 ? 'landscape' : 'portrait';
}
export function setLayout(m: LayoutMode): void {
  mode = m;
  L = SPECS[m];
}
export const layoutMode = (): LayoutMode => mode;
export const VW = (): number => L.vw;
export const VH = (): number => L.vh;
export const SLOT_Y = (): number => L.slotY;

// 슬롯+1 아이템으로 칸이 늘어나도 영역 폭을 넘지 않도록 칸 크기를 줄인다.
export function slotBoxSize(capacity: number): number {
  const maxTotal = L.slotWidth - 24; // 좌우 여백 12px씩
  const idealTotal = capacity * SLOT_BOX + (capacity - 1) * SLOT_GAP;
  if (idealTotal <= maxTotal) return SLOT_BOX;
  return Math.floor((maxTotal - (capacity - 1) * SLOT_GAP) / capacity);
}
export function slotCatSize(capacity: number): number {
  return Math.round(slotBoxSize(capacity) * (SLOT_CAT / SLOT_BOX));
}

// 보드를 세로 중앙에 놓기 위한 오프셋 — 실제 고양이가 차지한 행 범위의 중심을 맞춘다.
let boardOffsetY = 0;
let lastSpan: [number, number] = [0, 0];
export function setBoardRowSpan(minRow: number, maxRow: number): void {
  lastSpan = [minRow, maxRow];
  const midRow = (minRow + maxRow) / 2;
  let offset = L.boardCenterY - BOARD_TOP - CELL_BOX / 2 - midRow * CELL_BOX;
  const topEdge = BOARD_TOP + offset + minRow * CELL_BOX;
  if (topEdge < L.boardMinTop) offset += L.boardMinTop - topEdge;
  boardOffsetY = offset;
}
/** 배치를 바꾼 뒤 같은 행 범위로 오프셋을 다시 잡는다. */
export function refreshBoardOffset(): void {
  setBoardRowSpan(lastSpan[0], lastSpan[1]);
}

// (col,row) → 중심 좌표
export function gridX(col: number, cols: number): number {
  const startX = L.boardLeft + (L.boardWidth - cols * CELL_BOX) / 2 + CELL_BOX / 2;
  return startX + col * CELL_BOX;
}
export function gridY(row: number): number {
  return BOARD_TOP + boardOffsetY + CELL_BOX / 2 + row * CELL_BOX;
}

// i번째 슬롯 칸의 중심 x (capacity 에 따라 칸 크기가 줄어들 수 있음)
export function slotCenterX(i: number, capacity: number): number {
  const box = slotBoxSize(capacity);
  const total = capacity * box + (capacity - 1) * SLOT_GAP;
  const startX = L.slotLeft + (L.slotWidth - total) / 2;
  return startX + i * (box + SLOT_GAP) + box / 2;
}
