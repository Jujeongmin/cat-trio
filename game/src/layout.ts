// 가상 캔버스 좌표계 — 실제 화면에는 CSS scale 로 맞춘다.
// VH 를 세로 폰 비율(약 0.48)에 맞춰 길게 잡아 위아래 레터박스를 없앤다.
// 보드 영역(BOARD_TOP·MAX_ROWS)은 그대로라 스테이지 생성/난이도는 불변이고,
// 늘어난 아래 공간은 하단 컨트롤 덱(아이템 패널)이 채운다.
export const VW = 480;
export const VH = 1000;

export const CELL = 72; // 고양이 표시 크기
export const CELL_BOX = 78; // 한 칸(타일) 크기

export const SLOT_CAT = 56; // 슬롯에 들어간 고양이 크기(기본, capacity=7 기준)
export const SLOT_BOX = 62; // 슬롯 칸 크기(기본)
export const SLOT_GAP = 6;
// 슬롯 줄 중심 y — 6행짜리 큰 스테이지의 탈출구(~656)와 겹치지 않게 아래로 내렸다.
export const SLOT_Y = 724;
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

// 보드(격자) 기준 상단
export const BOARD_TOP = 126;

// 화면에 들어가는 최대 행 수 (보드 하단이 슬롯 위까지) — VH 와 무관하게 고정,
// 스테이지 생성/난이도에 영향 주지 않도록 상수식 유지.
export const MAX_ROWS = Math.floor((596 - BOARD_TOP) / CELL_BOX);

// 보드를 타임바와 슬롯 트레이 사이 세로 중앙에 놓기 위한 오프셋.
// 스테이지 모양/채움에 따라 고양이가 일부 행에만 몰릴 수 있으므로, 격자 행 수가
// 아니라 "실제 고양이가 차지한 행 범위(minRow~maxRow)"의 중심을 화면 중앙에 맞춘다.
// gridY 에만 반영되므로 격자 좌표/난이도는 그대로다.
const BOARD_CENTER_Y = 388; // (타임바 하단 ~86 + 내려간 슬롯 상단 ~693) / 2
const BOARD_MIN_TOP = 96; // 타임바 바로 아래 — 여기보다 위로는 올라가지 않게
let boardOffsetY = 0;
export function setBoardRowSpan(minRow: number, maxRow: number): void {
  const midRow = (minRow + maxRow) / 2;
  // gridY(midRow) 가 BOARD_CENTER_Y 가 되도록 오프셋을 잡는다.
  let offset = BOARD_CENTER_Y - BOARD_TOP - CELL_BOX / 2 - midRow * CELL_BOX;
  // 맨 윗 행의 상단이 BOARD_MIN_TOP 보다 위로 올라가지 않도록 clamp.
  const topEdge = BOARD_TOP + offset + minRow * CELL_BOX;
  if (topEdge < BOARD_MIN_TOP) offset += BOARD_MIN_TOP - topEdge;
  boardOffsetY = offset;
}

// (col,row) → 중심 좌표
export function gridX(col: number, cols: number): number {
  const startX = (VW - cols * CELL_BOX) / 2 + CELL_BOX / 2;
  return startX + col * CELL_BOX;
}
export function gridY(row: number): number {
  return BOARD_TOP + boardOffsetY + CELL_BOX / 2 + row * CELL_BOX;
}

// i번째 슬롯 칸의 중심 x (capacity 에 따라 칸 크기가 줄어들 수 있음)
export function slotCenterX(i: number, capacity: number): number {
  const box = slotBoxSize(capacity);
  const total = capacity * box + (capacity - 1) * SLOT_GAP;
  const startX = (VW - total) / 2;
  return startX + i * (box + SLOT_GAP) + box / 2;
}
