import { store, persist } from './storage';
import { GameResult } from './types';
import { bgm } from './audio';
import { playRewardedAd } from './ads';

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
        <button class="icon-btn settings-btn" aria-label="설정">⚙️</button>
      </div>
    </header>
    <button class="ad-free-btn">
      <span class="ad-free-ic">🎬</span>
      광고 보고 <i class="coin-ic"></i> ${FREE_AD_COINS} 받기
    </button>
    <div class="stage-pager">
      <button class="pager-arrow pager-prev" aria-label="이전 스테이지">‹</button>
      <div class="pager-viewport">
        <div class="stage-card"></div>
      </div>
      <button class="pager-arrow pager-next" aria-label="다음 스테이지">›</button>
    </div>
  `;

  const coinLabel = screen.querySelector('.coin')!;
  const adBtn = screen.querySelector<HTMLButtonElement>('.ad-free-btn')!;
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
        <span class="stage-card-sub">잠김</span>
        <button class="stage-play-btn" disabled>플레이</button>`;
    }
    return `
      <span class="stage-card-no">${id}</span>
      <span class="stage-card-stars">${starRow(stars)}</span>
      <button class="stage-play-btn primary" data-stage="${id}">플레이</button>`;
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

  render(0);

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
    const t = e.target as HTMLElement;
    if (t.closest('.settings-btn')) {
      onSettings();
      return;
    }
    if (t.closest('.ad-free-btn')) {
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
    if (t.closest('.pager-prev')) {
      go(-1);
      return;
    }
    if (t.closest('.pager-next')) {
      go(1);
      return;
    }
    const playBtn = t.closest('.stage-play-btn') as HTMLButtonElement | null;
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
      <h2>${result.win ? '클리어!' : '게임 오버'}</h2>
      ${
        result.win
          ? `<div class="earned-stars">${earnedStars}</div>
             ${isNewBest ? '<div class="new-best">최고 기록 갱신! ✨</div>' : ''}
             <div class="result-rows">
               <div><span>⏱ 시간</span><b>${sec}s</b></div>
               <div><span><i class="coin-ic"></i> 코인</span><b class="coin-earned">+${result.coins}</b></div>
             </div>
             ${
               result.coins > 0
                 ? `<button class="ad-double-btn">
                      <span class="ad-free-ic">🎬</span> 광고 보고 코인 2배 받기
                    </button>`
                 : ''
             }`
          : `<p>슬롯이 가득 찼거나 시간이 다 됐어요</p>`
      }
      <div class="btns">
        <button data-act="select">스테이지 선택</button>
        ${
          result.win
            ? `<button class="primary" data-act="next">다음 ▶</button>`
            : `<button class="primary" data-act="retry">다시하기</button>`
        }
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;

    const adBtn = t.closest('.ad-double-btn') as HTMLButtonElement | null;
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
        adBtn.textContent = '✓ 코인 2배 받음';
        adBtn.classList.add('claimed');
      });
      return;
    }

    const act = t.dataset.act;
    if (!act) return;
    overlay.remove();
    if (act === 'next') actions.onNext();
    else if (act === 'retry') actions.onRetry();
    else actions.onSelect();
  });

  root.appendChild(overlay);
}

/** 설정 모달 (명세 13) */
export function showSettings(root: HTMLElement, onReset: () => void): void {
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
      <h2>설정</h2>
      ${toggle('bgm', '🎵 배경음악')}
      ${toggle('sfx', '🔊 효과음')}
      ${toggle('vibrate', '📳 진동')}
      <div class="set-row">
        <span>🌐 언어</span>
        <button class="lang-btn" data-lang>${s.lang === 'ko' ? '한국어' : 'English'}</button>
      </div>
      <button class="danger" data-reset>데이터 초기화</button>
      <div class="btns"><button class="primary" data-close>닫기</button></div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const tg = t.closest('[data-toggle]') as HTMLElement | null;
    if (tg) {
      const key = tg.dataset.toggle as 'bgm' | 'sfx' | 'vibrate';
      store.settings[key] = !store.settings[key];
      tg.classList.toggle('on', store.settings[key]);
      persist();
      if (key === 'bgm') (store.settings.bgm ? bgm.start() : bgm.stop());
      return;
    }
    if (t.closest('[data-lang]')) {
      store.settings.lang = store.settings.lang === 'ko' ? 'en' : 'ko';
      (t as HTMLElement).textContent = store.settings.lang === 'ko' ? '한국어' : 'English';
      persist();
      return;
    }
    if (t.closest('[data-reset]')) {
      if (confirm('모든 진행 상황을 초기화할까요?')) {
        onReset();
        overlay.remove();
      }
      return;
    }
    if (t.closest('[data-close]')) overlay.remove();
  });

  root.appendChild(overlay);
}
