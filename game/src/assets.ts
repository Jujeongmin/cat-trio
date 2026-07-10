// 고양이 스프라이트 (game/public/cats/Cat_0.png ~ Cat_11.png)
export const CAT_SPRITE_COUNT = 12;

export const catSprite = (type: number): string =>
  `cats/Cat_${((type % CAT_SPRITE_COUNT) + CAT_SPRITE_COUNT) % CAT_SPRITE_COUNT}.png`;
