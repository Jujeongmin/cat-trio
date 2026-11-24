// 고양이 · 코스튬 스프라이트 (CrazyGames 판, 2026-11 새 그림)
//
// 형식: 96×96 프레임 3장을 가로로 붙인 띠(288×96). 프레임 = [기본, 눈 감기, 활짝 웃음].
// 고양이 몸은 프레임 안 (16,24)~(80,88) 의 64×64 에 앉아 있고, 위쪽 24px·양옆 16px 은
// 모자 챙·끝이 넘칠 자리다. 그래서 화면에서는 레이어를 칸(.cat)보다 150% 크게,
// 왼쪽 -25%·위 -37.5% 에 그린다 — 고양이 몸은 칸에 정확히 맞고 모자만 칸 밖으로 나간다.
//
// 원본 그림: PixelLab(64px 앉은 고양이) → scripts/art/*.py 로 털색 12종·표정·코스튬을 굽는다.
// 파일명 _v3: 같은 경로에 내용만 바꾸면 CDN 이 옛 파일을 계속 준다(Context.md 규칙).
export const CAT_SPRITE_COUNT = 12;
export const COSTUME_COUNT = 14;

/** 띠 안의 프레임 번호 */
export const FRAME = { idle: 0, blink: 1, happy: 2 } as const;
export type FrameName = keyof typeof FRAME;
export const FRAME_COUNT = 3;

/** 프레임 번호 → background-position (3열 1행) */
export const framePos = (frame: number): string => `${frame * 50}% 0%`;

/** 레이어를 칸 기준으로 놓는 값. 고양이 64px 이 칸(100%)에 맞도록 96px 캔버스를 150% 로 키운다. */
export const LAYER_BOX = { left: '-25%', top: '-37.5%', width: '150%', height: '150%' } as const;
export const LAYER_BG_SIZE = `${FRAME_COUNT * 100}% 100%`;

const wrapType = (type: number) => ((type % CAT_SPRITE_COUNT) + CAT_SPRITE_COUNT) % CAT_SPRITE_COUNT;
const url = (p: string) => new URL(p, window.location.href).href;

export const catSprite = (type: number): string => url(`cats/cat_${wrapType(type)}_v3.png`);

// 코스튬: 0~5 = 의상(clothes), 6~13 = 모자(hat). 카테고리별 슬롯이라 동시 착용 가능.
export type CostumeCategory = 'clothes' | 'hat';
export const costumeCategory = (index: number): CostumeCategory => (index <= 5 ? 'clothes' : 'hat');

/** 의상 — 털색과 상관없는 투명 레이어(고양이 위에 겹친다). */
export const clothesSprite = (index: number): string => url(`costumes/costume_${index}_v3.png`);

/**
 * 모자 — 모자는 귀를 가리거나 귀가 챙 밖으로 삐져나와서 투명 레이어로는 안 된다.
 * 털색마다 "모자 쓴 고양이" 전체를 구워 두었고, 모자를 쓰면 고양이 레이어 자체를 이걸로 바꾼다.
 */
export const hatCatSprite = (hat: number, type: number): string =>
  url(`hats/hat_${hat}_cat_${wrapType(type)}_v3.png`);

/** 타입 + 장착 상태 → 아래에서 위로 쌓을 레이어 URL 목록 (고양이(모자 포함) → 의상). */
export function lookLayers(type: number, clothes: number | undefined, hat: number | undefined): string[] {
  const urls = [hat !== undefined ? hatCatSprite(hat, type) : catSprite(type)];
  if (clothes !== undefined) urls.push(clothesSprite(clothes));
  return urls;
}
