// 고양이 스프라이트 (game/public/cats/Cat_0.png ~ Cat_11.png)
export const CAT_SPRITE_COUNT = 12;

export const catSprite = (type: number): string => {
  const t = ((type % CAT_SPRITE_COUNT) + CAT_SPRITE_COUNT) % CAT_SPRITE_COUNT;
  // 서브패스 및 iframe 임베드 환경에서도 자산이 올바르게 로드되도록 absolute URL로 해결합니다.
  return new URL(`cats/Cat_${t}.png`, window.location.href).href;
};

// 코스튬 스프라이트 (game/public/costumes/Cat_Costume_0.png ~ Cat_Costume_14.png)
// 기존 고양이 스프라이트와 동일한 3열×4행(32px) 포맷의 완전한 대체 스킨.
export const COSTUME_COUNT = 15;

export const costumeSprite = (index: number): string => {
  const i = ((index % COSTUME_COUNT) + COSTUME_COUNT) % COSTUME_COUNT;
  return new URL(`costumes/Cat_Costume_${i}.png`, window.location.href).href;
};
