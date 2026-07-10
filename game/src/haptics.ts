import { store } from './storage';

// 진동 설정이 켜져 있고 기기가 Vibration API 를 지원할 때만 진동.
// iOS Safari 등 미지원 환경에서도 조용히 무시된다(feature-detect).
function fire(pattern: number | number[]) {
  if (!store.settings.vibrate) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* 일부 브라우저는 사용자 제스처 밖에서 호출 시 예외를 던짐 — 무시 */
  }
}

export const haptics = {
  tap: () => fire(10), // 고양이 선택
  match: () => fire([15, 40, 15]), // 3매치 완성
  win: () => fire([20, 60, 20, 60, 30]), // 스테이지 클리어
  lose: () => fire(80), // 게임 오버
};
