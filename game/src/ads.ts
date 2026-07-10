// 보상형 광고 SDK 어댑터 (명세 10).
//
// 실제 Verse8/Agent8 광고 SDK가 연동되면 loadAd()/showAd() 내부 구현만
// 교체하면 된다 — 호출부(screens.ts)는 playRewardedAd() 하나만 알면 됨.
// 지금은 SDK가 실제로 있는 것처럼 동작하는 스텁: 로드 지연 → 전체화면
// 재생 UI → 끝까지 보면 rewarded, 로드 실패 시 failed.
export type AdResult = 'rewarded' | 'skipped' | 'failed';

// 프로토타입 단계 — 실제 광고 없이 즉시 보상을 준다. 나중에 광고 SDK를
// 붙일 때 이 값을 false 로 바꾸면 아래 로드→재생 카운트다운 흐름이 그대로 살아난다.
const PROTOTYPE_INSTANT = true;

const AD_DURATION = 4; // 초 — 스킵 가능해지기까지

// 실제 SDK 예: await sdk.ads.load('rewarded')
function loadAd(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 450); // 네트워크 왕복을 흉내낸 지연
  });
}

// 실제 SDK 예: const result = await sdk.ads.show()
function showAd(container: HTMLElement): Promise<AdResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ad-overlay';
    overlay.innerHTML = `
      <div class="ad-frame">
        <span class="ad-badge">AD</span>
        <div class="ad-stage">
          <div class="ad-spinner"></div>
          <p class="ad-caption">보상형 광고 재생 중…</p>
        </div>
        <div class="ad-progress"><i></i></div>
        <div class="ad-foot">
          <span class="ad-timer">${AD_DURATION}초 후 닫기 가능</span>
          <button class="ad-close" disabled aria-label="닫기">✕</button>
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
        timerText.textContent = '보상을 받을 수 있어요!';
        closeBtn.disabled = false;
        closeBtn.classList.add('ready');
      } else {
        timerText.textContent = `${Math.ceil(AD_DURATION - elapsed)}초 후 닫기 가능`;
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

/** 보상형 광고 재생 전체 흐름. container 에 전체화면 오버레이로 렌더된다. */
export async function playRewardedAd(container: HTMLElement): Promise<AdResult> {
  if (PROTOTYPE_INSTANT) return 'rewarded';
  const loaded = await loadAd();
  if (!loaded) return 'failed';
  return showAd(container);
}
