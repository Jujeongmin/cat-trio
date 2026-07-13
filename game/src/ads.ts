import { Verse8Ads } from '@verse8/ads';
import { t, tf } from './i18n';

// 보상형 광고 SDK 어댑터 (Verse8 공식 @verse8/ads 패키지)
//
// V8 플랫폼 iframe 안에서 postMessage로 부모 창과 통신하며 실제 보상형 광고를 재생합니다.
// 로컬 개발 환경(DEV)에서만 시뮬레이션(카운트다운)으로 폴백됩니다.
// 프로덕션에서는 SDK 오류 발생 시 광고 실패로 처리하고 시뮬레이션을 절대 보여주지 않습니다.
//
// 호출부(screens.ts)는 playRewardedAd() 하나만 알면 됩니다.
export type AdResult = 'rewarded' | 'skipped' | 'failed';

const AD_DURATION = 4;

let initialized = false;

function ensureInit() {
  if (!initialized) {
    Verse8Ads.init({
      debug: import.meta.env.DEV,
    });
    initialized = true;
  }
}

// ---- 시뮬레이션 (개발 환경 전용) ----

function loadAdSimulated(): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(true), 450));
}

function showAdSimulated(container: HTMLElement): Promise<AdResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ad-overlay';
    overlay.innerHTML = `
      <div class="ad-frame">
        <span class="ad-badge">AD</span>
        <div class="ad-stage">
          <div class="ad-spinner"></div>
          <p class="ad-caption">${t('adCaption')}</p>
        </div>
        <div class="ad-progress"><i></i></div>
        <div class="ad-foot">
          <span class="ad-timer">${tf('adTimerWait', { n: AD_DURATION })}</span>
          <button class="ad-close" disabled aria-label="${t('adCloseAria')}">✕</button>
        </div>
      </div>
    `;
    container.appendChild(overlay);

    const bar = overlay.querySelector('.ad-progress i') as HTMLElement;
    const timerText = overlay.querySelector('.ad-timer') as HTMLElement;
    const closeBtn = overlay.querySelector('.ad-close') as HTMLButtonElement;

    let elapsed = 0;
    const tickMs = 100;
    const tick = window.setInterval(() => {
      elapsed += tickMs / 1000;
      const ratio = Math.min(1, elapsed / AD_DURATION);
      bar.style.width = `${ratio * 100}%`;
      if (ratio >= 1) {
        clearInterval(tick);
        timerText.textContent = t('adTimerReady');
        closeBtn.disabled = false;
        closeBtn.classList.add('ready');
      } else {
        timerText.textContent = tf('adTimerWait', { n: Math.ceil(AD_DURATION - elapsed) });
      }
    }, tickMs);

    closeBtn.addEventListener('click', () => {
      clearInterval(tick);
      overlay.remove();
      resolve(elapsed >= AD_DURATION ? 'rewarded' : 'skipped');
    });
  });
}

// ---- 공용 함수 ----

/** 보상형 광고 재생. placementId 에 따라 적절한 보상형 광고를 요청합니다. */
export async function playRewardedAd(
  container: HTMLElement,
  placementId: string = 'default',
): Promise<AdResult> {
  ensureInit();

  try {
    const result = await Verse8Ads.showRewarded({ placementId });

    switch (result.status) {
      case 'rewarded':
        return 'rewarded';
      case 'dismissed':
        return 'skipped';
      case 'failed':
        if (result.error.code === 'unsupported_env') {
          // 프로덕션에서는 unsupported_env 를 그대로 failed 처리.
          // 개발 환경에서만 시뮬레이션으로 폴백
          if (import.meta.env.DEV) {
            const loaded = await loadAdSimulated();
            if (!loaded) return 'failed';
            return showAdSimulated(container);
          }
        }
        return 'failed';
      default:
        return 'failed';
    }
  } catch {
    // SDK 호출 자체 예외 (네트워크, 타임아웃 등)
    // 개발 환경: 시뮬레이션으로 폴백
    // 프로덕션: 실패 처리 — 가짜 광고를 절대 보여주지 않음
    if (import.meta.env.DEV) {
      const loaded = await loadAdSimulated();
      if (!loaded) return 'failed';
      return showAdSimulated(container);
    }
    return 'failed';
  }
}
