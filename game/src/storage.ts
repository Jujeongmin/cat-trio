// 저장 시스템 (localStorage) — 명세 11
// 현재/최고 스테이지, 코인, 스테이지별 최고 별, 설정, 튜토리얼 완료 여부

import { costumeCategory } from './assets';

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
  ownedCostumes: number[]; // 구매한 코스튬 인덱스 목록 (0~13)
  equippedClothes: Record<number, number>; // 고양이 타입(0~11) -> 의상(0~5)
  equippedHats: Record<number, number>; // 고양이 타입(0~11) -> 모자(6~13)
}

const KEY = 'cat-trio-save-v1';

const DEFAULT: SaveData = {
  highStage: 1,
  currentStage: 1,
  coins: 0,
  bestStars: {},
  settings: { bgm: true, sfx: true, vibrate: true, lang: 'en' }, // 기본 언어: 영어
  tutorialDone: false,
  ownedCostumes: [],
  equippedClothes: {},
  equippedHats: {},
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
      ownedCostumes: [...(parsed.ownedCostumes ?? [])],
      equippedClothes: { ...(parsed.equippedClothes ?? {}) },
      equippedHats: { ...(parsed.equippedHats ?? {}) },
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

/** 코스튬 구매. 코인 부족·이미 보유 시 false. */
export function buyCostume(index: number, price: number): boolean {
  if (store.ownedCostumes.includes(index)) return false;
  if (store.coins < price) return false;
  store.coins -= price;
  store.ownedCostumes.push(index);
  persist();
  return true;
}

/** 카테고리(의상/모자)에 맞는 장착 레코드를 반환. */
function slotFor(costumeIndex: number): Record<number, number> {
  return costumeCategory(costumeIndex) === 'clothes' ? store.equippedClothes : store.equippedHats;
}

/** 코스튬 장착 — 의상/모자는 별도 슬롯이라 동시 착용 가능. 같은 아이템은
 *  한 번에 한 타입에만 입힐 수 있어, 다른 타입에 이미 장착돼 있었다면
 *  그쪽에서는 자동으로 해제된다. */
export function equipCostume(catType: number, costumeIndex: number): void {
  const slot = slotFor(costumeIndex);
  for (const t of Object.keys(slot)) {
    if (slot[+t] === costumeIndex) delete slot[+t];
  }
  slot[catType] = costumeIndex;
  persist();
}

/** 해당 카테고리 착용물 해제 — 기본 모습으로 되돌림. */
export function unequipCostume(catType: number, category: 'clothes' | 'hat'): void {
  const slot = category === 'clothes' ? store.equippedClothes : store.equippedHats;
  delete slot[catType];
  persist();
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
