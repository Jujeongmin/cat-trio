import { store, persist } from './storage';
import { GameResult } from './types';

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

/** 스테이지 선택 화면 (명세 5-2) */
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
  let tiles = '';
  for (let id = 1; id <= maxTile; id++) {
    const locked = id > effectiveHigh;
    const stars = store.bestStars[id] ?? 0;
    tiles += `
      <button class="tile ${locked ? 'locked' : ''}" data-stage="${id}" ${locked ? 'disabled' : ''}>
        <span class="tile-no">${locked ? '🔒' : id}</span>
        <span class="tile-stars">${locked ? '' : starRow(stars)}</span>
      </button>`;
  }

  screen.innerHTML = `
    <header class="select-top">
      <h1>🐾 Cat Trio</h1>
      <div class="select-info">
        <span class="coin"><i class="coin-ic"></i> ${store.coins}</span>
        <button class="icon-btn settings-btn" aria-label="설정">⚙️</button>
      </div>
    </header>
    <div class="tiles">${tiles}</div>
  `;

  screen.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.settings-btn')) {
      onSettings();
      return;
    }
    const tile = t.closest('.tile') as HTMLButtonElement | null;
    if (tile && !tile.disabled) onPlay(Number(tile.dataset.stage));
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
               <div><span><i class="coin-ic"></i> 코인</span><b>+${result.coins}</b></div>
             </div>`
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
    const act = (e.target as HTMLElement).dataset.act;
    if (!act) return;
    overlay.remove();
    if (act === 'next') actions.onNext();
    else if (act === 'retry') actions.onRetry();
    else actions.onSelect();
  });

  root.appendChild(overlay);
}

/** 설정 모달 (명세 13) — 오디오/진동 실제 적용과 다국어는 Phase 5에서 확장 */
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
