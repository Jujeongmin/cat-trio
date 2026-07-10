// 저장 시스템 (localStorage) — 명세 11
// 현재/최고 스테이지, 코인, 스테이지별 최고 별, 설정, 튜토리얼 완료 여부

export interface Settings {
  bgm: boolean;
  sfx: boolean;
  vibrate: boolean;
  lang: 'ko' | 'en';
}

export interface SaveData {
  highStage: number; // 해금된 최고 스테이지
  currentStage: number; // 마지막으로 플레이한 스테이지
  coins: number;
  bestStars: Record<number, number>; // stageId -> 0..3
  settings: Settings;
  tutorialDone: boolean;
}

const KEY = 'cat-trio-save-v1';

const DEFAULT: SaveData = {
  highStage: 1,
  currentStage: 1,
  coins: 0,
  bestStars: {},
  settings: { bgm: true, sfx: true, vibrate: true, lang: 'ko' },
  tutorialDone: false,
};

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...structuredClone(DEFAULT),
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
      bestStars: { ...(parsed.bestStars ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

// 전역 저장 상태 (싱글턴)
export const store: SaveData = read();

export function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* 저장 실패는 조용히 무시 */
  }
}

export function resetSave(): void {
  const fresh = structuredClone(DEFAULT);
  Object.assign(store, fresh);
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** 스테이지 클리어 결과 반영: 해금·코인·최고 별 갱신. 최고 기록 갱신 여부 반환. */
export function recordClear(stageId: number, stars: number, coins: number): boolean {
  store.coins += coins;
  store.highStage = Math.max(store.highStage, stageId + 1);
  const prev = store.bestStars[stageId] ?? 0;
  const isNewBest = stars > prev;
  if (isNewBest) store.bestStars[stageId] = stars;
  persist();
  return isNewBest;
}
