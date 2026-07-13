import { t, tf } from './i18n';

// 보상형 광고 SDK 어댑터 (V8 플랫폼 postMessage 프로토콜)
//
// 게임은 Verse8 플랫폼의 iframe 안에서 실행됩니다.
// 광고는 postMessage 프로토콜을 통해 부모 창(V8 플랫폼)과 통신합니다:
//   1. LOAD_REWARDED_AD → 부모에게 광고 로드 요청
//   2. SHOW_REWARDED_AD → 부모에게 광고 재생 요청
//   3. REWARDED_AD_RESULT  → 부모가 결과를 응답 (rewarded | skipped | failed)
//
// 로컬 개발 환경(부모 창이 V8 플랫폼이 아닌 경우)에서는
// 시뮬레이션(카운트다운) 방식으로 자동 전환됩니다.
export type AdResult = 'rewarded' | 'skipped' | 'failed';

const AD_TIMEOUT = 5000; // 플랫폼 응답 대기 타임아웃 (ms)
const AD_DURATION = 4; // 시뮬레이션 광고 길이 (초)

/** postMessage 기반 V8 광고 SDK */
const v8AdSDK = {
  /** 광고 로드 요청. 반환: 로드 성공 여부 */
  load(): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'REWARDED_AD_RESULT' && e.data?.phase === 'loaded') {
          window.removeEventListener('message', handler);
          clearTimeout(timer);
          resolve(true);
        }
        if (e.data?.type === 'REWARDED_AD_RESULT' && e.data?.phase === 'load_failed') {
          window.removeEventListener('message', handler);
          clearTimeout(timer);
          resolve(false);
        }
      };
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(false); // 타임아웃 → 시뮬레이션으로 폴백
      }, AD_TIMEOUT);

      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'LOAD_REWARDED_AD' }, '*');
    });
  },

  /** 광고 재생 요청. 반환: 광고 결과 */
  show(): Promise<AdResult> {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'REWARDED_AD_RESULT') {
          const { result } = e.data;
          if (result === 'rewarded' || result === 'skipped' || result === 'failed') {
            window.removeEventListener('message', handler);
            clearTimeout(timer);
            resolve(result);
          }
        }
      };
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve('failed'); // 타임아웃 → 실패 처리
      }, 60000); // 광고 재생은 최대 60초 대기

      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'SHOW_REWARDED_AD' }, '*');
    });
  }
};

// ---- 시뮬레이션 (로컬 개발 환경 폴백) ----

function loadAdSimulated(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 450);
  });
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
      const outcome: AdResult = elapsed >= AD_DURATION ? 'rewarded' : 'skipped';
      overlay.remove();
      resolve(outcome);
    });
  });
}

// ---- 공용 함수 ----

/** V8 플랫폼에서 실행 중인지 감지 (부모 창이 agent8/Verse8 인지) */
function isV8Platform(): boolean {
  try {
    // iframe 내부에서 부모 접근 가능한지 확인
    return window.parent !== window && window.parent.postMessage !== undefined;
  } catch {
    return false;
  }
}

/** 보상형 광고 재생 전체 흐름. container 에 전체화면 오버레이로 렌더된다. */
export async function playRewardedAd(container: HTMLElement): Promise<AdResult> {
  if (isV8Platform()) {
    // V8 플랫폼 실제 광고 프로토콜
    const loaded = await v8AdSDK.load();
    if (!loaded) return 'failed';
    return v8AdSDK.show();
  }

  // 로컬 개발 환경: 시뮬레이션 폴백
  const loaded = await loadAdSimulated();
  if (!loaded) return 'failed';
  return showAdSimulated(container);
}
