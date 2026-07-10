import { store, persist } from './storage';
import { GameResult } from './types';
import { bgm } from './audio';
import { playRewardedAd } from './ads';
import { t, tf, applyDocumentLang } from './i18n';

const FREE_AD_COINS = 30; // 스테이지 선택 화면의 "광고 보고 코인 받기" 보상

// 최고 해금 스테이지 이후로 미리 보여줄 잠금 타일 수
const LOOKAHEAD = 6;
// 개발 모드에서는 테스트 편의를 위해 스테이지를 전부 열어 보여준다
// (실제 store.highStage 는 건드리지 않음 — 화면 표시만 우회, 프로덕션 빌드엔 영향 없음)
const DEV_UNLOCK_ALL = 40;

function starRow(n: number): string {
  return [0, 1, 2]
    .map((i) => `<span class="mini-star ${i < n ? 'on' : 'off'}">★</span>`)
    .join('');
}

/** 스테이지 선택 화면 (명세 5-2) — 한 번에 한 스테이지씩 넘기는 카드 방식 */
export function showStageSelect(
  root: HTMLElement,
  onPlay: (stageId: number) => void,
  onSettings: () => void,
): void {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen select';

  const effectiveHigh = import.meta.env.DEV
    ? Math.max(store.highStage, DEV_UNLOCK_ALL)
    : store.highStage;
  const maxTile = effectiveHigh + LOOKAHEAD;
  const clampStage = (n: number) => Math.max(1, Math.min(maxTile, n));
  let cur = clampStage(store.currentStage || 1);

  screen.innerHTML = `
    <header class="select-top">
      <h1>🐾 Cat Trio</h1>
      <div class="select-info">
        <span class="coin"><i class="coin-ic"></i> ${store.coins}</span>
        <button class="lang-toggle-btn" aria-label="Language"></button>
        <button class="icon-btn settings-btn" aria-label="${t('settingsAria')}">⚙️</button>
      </div>
    </header>
    <button class="ad-free-btn"></button>
    <div class="stage-pager">
      <button class="pager-arrow pager-prev" aria-label="${t('prevStageAria')}">‹</button>
      <div class="pager-viewport">
        <div class="stage-card"></div>
      </div>
      <button class="pager-arrow pager-next" aria-label="${t('nextStageAria')}">›</button>
    </div>
  `;

  const coinLabel = screen.querySelector('.coin')!;
  const adBtn = screen.querySelector<HTMLButtonElement>('.ad-free-btn')!;
  const langBtn = screen.querySelector<HTMLButtonElement>('.lang-toggle-btn')!;
  const settingsBtn = screen.querySelector<HTMLButtonElement>('.settings-btn')!;
  const card = screen.querySelector<HTMLDivElement>('.stage-card')!;
  const prevBtn = screen.querySelector<HTMLButtonElement>('.pager-prev')!;
  const nextBtn = screen.querySelector<HTMLButtonElement>('.pager-next')!;

  function cardHTML(id: number): string {
    const locked = id > effectiveHigh;
    const stars = store.bestStars[id] ?? 0;
    if (locked) {
      return `
        <span class="stage-card-lock">🔒</span>
        <span class="stage-card-no locked">${id}</span>
        <span class="stage-card-sub">${t('lockedLabel')}</span>
        <button class="stage-play-btn" disabled>${t('playBtn')}</button>`;
    }
    return `
      <span class="stage-card-no">${id}</span>
      <span class="stage-card-stars">${starRow(stars)}</span>
      <button class="stage-play-btn primary" data-stage="${id}">${t('playBtn')}</button>`;
  }

  function render(dir: 0 | 1 | -1) {
    if (dir !== 0) {
      const outCls = dir === 1 ? 'slide-out-l' : 'slide-out-r';
      card.classList.add(outCls);
      window.setTimeout(() => {
        card.className = 'stage-card ' + (dir === 1 ? 'slide-in-r' : 'slide-in-l');
        card.innerHTML = cardHTML(cur);
        requestAnimationFrame(() => card.classList.remove('slide-in-r', 'slide-in-l'));
      }, 160);
    } else {
      card.innerHTML = cardHTML(cur);
    }
    prevBtn.disabled = cur <= 1;
    nextBtn.disabled = cur >= maxTile;
  }

  function go(delta: 1 | -1) {
    const next = clampStage(cur + delta);
    if (next === cur) return;
    cur = next;
    render(delta);
  }

  // 언어 전환 시 화면에 보이는 모든 텍스트를 즉시 다시 그린다
  function applyLang() {
    langBtn.textContent = store.settings.lang === 'ko' ? 'EN' : 'KO';
    settingsBtn.setAttribute('aria-label', t('settingsAria'));
    prevBtn.setAttribute('aria-label', t('prevStageAria'));
    nextBtn.setAttribute('aria-label', t('nextStageAria'));
    adBtn.innerHTML = `<span class="ad-free-ic">🎬</span> ${tf('freeAdBtn', {
      icon: '<i class="coin-ic"></i>',
      n: FREE_AD_COINS,
    })}`;
    render(0);
  }

  applyLang();

  // 좌우 스와이프로도 넘길 수 있게
  let dragStartX: number | null = null;
  const viewport = screen.querySelector<HTMLDivElement>('.pager-viewport')!;
  viewport.addEventListener('pointerdown', (e) => {
    dragStartX = e.clientX;
  });
  viewport.addEventListener('pointerup', (e) => {
    if (dragStartX === null) return;
    const dx = e.clientX - dragStartX;
    dragStartX = null;
    const THRESHOLD = 40;
    if (dx <= -THRESHOLD) go(1);
    else if (dx >= THRESHOLD) go(-1);
  });

  screen.addEventListener('click', (e) => {
    const tgt = e.target as HTMLElement;
    if (tgt.closest('.settings-btn')) {
      onSettings();
      return;
    }
    if (tgt.closest('.lang-toggle-btn')) {
      store.settings.lang = store.settings.lang === 'ko' ? 'en' : 'ko';
      persist();
      applyDocumentLang();
      applyLang();
      return;
    }
    if (tgt.closest('.ad-free-btn')) {
      if (adBtn.disabled) return;
      adBtn.disabled = true;
      void playRewardedAd(root).then((res) => {
        adBtn.disabled = false;
        if (res !== 'rewarded') return;
        store.coins += FREE_AD_COINS;
        persist();
        coinLabel.innerHTML = `<i class="coin-ic"></i> ${store.coins}`;
      });
      return;
    }
    if (tgt.closest('.pager-prev')) {
      go(-1);
      return;
    }
    if (tgt.closest('.pager-next')) {
      go(1);
      return;
    }
    const playBtn = tgt.closest('.stage-play-btn') as HTMLButtonElement | null;
    if (playBtn && !playBtn.disabled) onPlay(Number(playBtn.dataset.stage));
  });

  root.appendChild(screen);
}

interface ResultActions {
  onNext: () => void;
  onRetry: () => void;
  onSelect: () => void;
}

/** 결과 화면 (명세 6, 7, 8) */
export function showResult(
  root: HTMLElement,
  result: GameResult,
  isNewBest: boolean,
  actions: ResultActions,
): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const sec = (result.timeMs / 1000).toFixed(1);

  const earnedStars = [0, 1, 2]
    .map(
      (i) =>
        `<span class="big-star ${i < result.stars ? 'on' : 'off'}" style="animation-delay:${i * 0.15}s">★</span>`,
    )
    .join('');

  overlay.innerHTML = `
    <div class="panel">
      <h2>${result.win ? t('clearTitle') : t('gameOverTitle')}</h2>
      ${
        result.win
          ? `<div class="earned-stars">${earnedStars}</div>
             ${isNewBest ? `<div class="new-best">${t('newBest')}</div>` : ''}
             <div class="result-rows">
               <div><span>${t('timeLabel')}</span><b>${sec}s</b></div>
               <div><span><i class="coin-ic"></i> ${t('coinLabel')}</span><b class="coin-earned">+${result.coins}</b></div>
             </div>
             ${
               result.coins > 0
                 ? `<button class="ad-double-btn">
                      <span class="ad-free-ic">🎬</span> ${t('adDoubleBtn')}
                    </button>`
                 : ''
             }`
          : `<p>${t('gameOverMsg')}</p>`
      }
      <div class="btns">
        <button data-act="select">${t('stageSelectBtn')}</button>
        ${
          result.win
            ? `<button class="primary" data-act="next">${t('nextBtn')}</button>`
            : `<button class="primary" data-act="retry">${t('retryBtn')}</button>`
        }
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    const tgt = e.target as HTMLElement;

    const adBtn = tgt.closest('.ad-double-btn') as HTMLButtonElement | null;
    if (adBtn) {
      if (adBtn.disabled) return;
      adBtn.disabled = true;
      void playRewardedAd(root).then((res) => {
        if (res !== 'rewarded') {
          adBtn.disabled = false;
          return;
        }
        store.coins += result.coins; // 이번 스테이지 보상만큼 한 번 더 지급 = 2배
        persist();
        const coinEl = overlay.querySelector('.coin-earned')!;
        coinEl.textContent = `+${result.coins * 2}`;
        adBtn.textContent = t('adDoubleClaimed');
        adBtn.classList.add('claimed');
      });
      return;
    }

    const act = tgt.dataset.act;
    if (!act) return;
    overlay.remove();
    if (act === 'next') actions.onNext();
    else if (act === 'retry') actions.onRetry();
    else actions.onSelect();
  });

  root.appendChild(overlay);
}

/** 설정 모달 (명세 13) */
export function showSettings(root: HTMLElement, onReset: () => void, onClose: () => void): void {
  const s = store.settings;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const toggle = (key: 'bgm' | 'sfx' | 'vibrate', label: string) => `
    <div class="set-row">
      <span>${label}</span>
      <button class="switch ${s[key] ? 'on' : ''}" data-toggle="${key}">
        <i></i>
      </button>
    </div>`;

  overlay.innerHTML = `
    <div class="panel settings-panel">
      <h2>${t('settingsTitle')}</h2>
      ${toggle('bgm', t('bgmLabel'))}
      ${toggle('sfx', t('sfxLabel'))}
      ${toggle('vibrate', t('vibrateLabel'))}
      <div class="set-row">
        <span>${t('languageLabel')}</span>
        <button class="lang-btn" data-lang>${s.lang === 'ko' ? t('langKorean') : t('langEnglish')}</button>
      </div>
      <button class="danger" data-reset>${t('resetBtn')}</button>
      <div class="btns"><button class="primary" data-close>${t('closeBtn')}</button></div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    const tgt = e.target as HTMLElement;
    const toggleBtn = tgt.closest('[data-toggle]') as HTMLElement | null;
    if (toggleBtn) {
      const key = toggleBtn.dataset.toggle as 'bgm' | 'sfx' | 'vibrate';
      store.settings[key] = !store.settings[key];
      toggleBtn.classList.toggle('on', store.settings[key]);
      persist();
      if (key === 'bgm') (store.settings.bgm ? bgm.start() : bgm.stop());
      return;
    }
    if (tgt.closest('[data-lang]')) {
      store.settings.lang = store.settings.lang === 'ko' ? 'en' : 'ko';
      persist();
      applyDocumentLang();
      overlay.remove();
      showSettings(root, onReset, onClose); // 모달 전체를 새 언어로 다시 그림
      return;
    }
    if (tgt.closest('[data-reset]')) {
      if (confirm(t('resetConfirm'))) {
        onReset();
        overlay.remove();
      }
      return;
    }
    if (tgt.closest('[data-close]')) {
      overlay.remove();
      onClose();
    }
  });

  root.appendChild(overlay);
}
