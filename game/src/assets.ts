// 고양이 스프라이트 (game/public/cats/Cat_0.png ~ Cat_11.png)
export const CAT_SPRITE_COUNT = 12;

export const catSprite = (type: number): string => {
  const t = ((type % CAT_SPRITE_COUNT) + CAT_SPRITE_COUNT) % CAT_SPRITE_COUNT;
  // 서브패스 및 iframe 임베드 환경에서도 자산이 올바르게 로드되도록 absolute URL로 해결합니다.
  return new URL(`cats/Cat_${t}.png`, window.location.href).href;
};
