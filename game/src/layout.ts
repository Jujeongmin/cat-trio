// 가상 캔버스 좌표계 — 실제 화면에는 CSS scale 로 맞춘다.
export const VW = 480;
export const VH = 760;

export const CELL = 72; // 고양이 표시 크기
export const CELL_BOX = 78; // 한 칸(타일) 크기

export const SLOT_CAT = 56; // 슬롯에 들어간 고양이 크기(기본, capacity=7 기준)
export const SLOT_BOX = 62; // 슬롯 칸 크기(기본)
export const SLOT_GAP = 6;
export const SLOT_Y = 664; // 슬롯 줄 중심 y
export const MAX_CAPACITY = 10; // 슬롯+1 아이템으로 늘어날 수 있는 최대 칸 수

// 슬롯+1 아이템으로 칸이 늘어나도 화면 폭을 넘지 않도록 칸 크기를 줄인다.
export function slotBoxSize(capacity: number): number {
  const maxTotal = VW - 24; // 좌우 여백 12px씩
  const idealTotal = capacity * SLOT_BOX + (capacity - 1) * SLOT_GAP;
  if (idealTotal <= maxTotal) return SLOT_BOX;
  return Math.floor((maxTotal - (capacity - 1) * SLOT_GAP) / capacity);
}
export function slotCatSize(capacity: number): number {
  return Math.round(slotBoxSize(capacity) * (SLOT_CAT / SLOT_BOX));
}

// 보드(격자) 상단
export const BOARD_TOP = 126;

// 화면에 들어가는 최대 행 수 (보드 하단이 슬롯 위까지)
export const MAX_ROWS = Math.floor((596 - BOARD_TOP) / CELL_BOX);

// (col,row) → 중심 좌표
export function gridX(col: number, cols: number): number {
  const startX = (VW - cols * CELL_BOX) / 2 + CELL_BOX / 2;
  return startX + col * CELL_BOX;
}
export function gridY(row: number): number {
  return BOARD_TOP + CELL_BOX / 2 + row * CELL_BOX;
}

// i번째 슬롯 칸의 중심 x (capacity 에 따라 칸 크기가 줄어들 수 있음)
export function slotCenterX(i: number, capacity: number): number {
  const box = slotBoxSize(capacity);
  const total = capacity * box + (capacity - 1) * SLOT_GAP;
  const startX = (VW - total) / 2;
  return startX + i * (box + SLOT_GAP) + box / 2;
}
