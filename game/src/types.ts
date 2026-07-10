// 격자 위 고양이 한 마리 (겹치지 않음, 한 칸에 하나)
export interface CatPlacement {
  id: string;
  type: number; // 고양이 종류 (스프라이트 인덱스)
  col: number;
  row: number;
}

export interface Cell {
  col: number;
  row: number;
}

// 한 스테이지의 배치 데이터
export interface StageData {
  id: number;
  cols: number; // 바운딩 격자
  rows: number;
  types: number; // 등장하는 고양이 종류 수
  shape: Cell[]; // 컨테이너(유효) 칸 — 벽 칸 포함
  walls: Cell[]; // 통과 불가 벽 칸 (shape 안의 장애물)
  exits: Cell[]; // 탈출구 칸 (바닥 경계)
  cats: CatPlacement[];
  spawners: Spawner[]; // 고양이 스폰 파이프 (0~2개)
}

// 스폰 파이프 — (col,row) 칸이 비면 queue 의 다음 고양이가 나온다.
export interface Spawner {
  col: number;
  row: number;
  queue: number[]; // 나올 순서대로의 종류 목록 (미리 안 보임)
}

// 스테이지 종료 결과
export interface GameResult {
  stageId: number;
  win: boolean;
  stars: number; // 획득 별 (0~3)
  coins: number; // 획득 코인
  timeMs: number; // 소요 시간
}
