// 고양이 스프라이트 (game/public/cats/Cat_0.png ~ Cat_11.png)
export const CAT_SPRITE_COUNT = 12;

export const catSprite = (type: number): string => {
  const t = ((type % CAT_SPRITE_COUNT) + CAT_SPRITE_COUNT) % CAT_SPRITE_COUNT;
  // 서브패스 및 iframe 임베드 환경에서도 자산이 올바르게 로드되도록 absolute URL로 해결합니다.
  return new URL(`cats/Cat_${t}.png`, window.location.href).href;
};

// 코스튬 스프라이트 (game/public/costumes/Cat_Costume_0.png ~ Cat_Costume_13.png)
// 고양이 없이 착용물만 그려진 투명 배경 시트 — 기본 고양이 스프라이트 위에
// 겹쳐 렌더링해 털색을 유지한 채 입힌다.
// 프레임 포맷은 고양이 시트와 동일한 3열×4행(32px).
// 0~5 = 의상(clothes), 6~13 = 모자(hat). 카테고리별로 슬롯이 달라 동시 착용 가능.
export const COSTUME_COUNT = 14;

export type CostumeCategory = 'clothes' | 'hat';

export const costumeCategory = (index: number): CostumeCategory =>
  index <= 5 ? 'clothes' : 'hat';

export const costumeSprite = (index: number): string => {
  const i = ((index % COSTUME_COUNT) + COSTUME_COUNT) % COSTUME_COUNT;
  return new URL(`costumes/Cat_Costume_${i}.png`, window.location.href).href;
};
