import { store, persist, buyCostume, equipCostume, unequipCostume } from './storage';
import { GameResult } from './types';
import { bgm } from './audio';
import { claimRewardedAd } from './ads';
import { t, tf, applyDocumentLang } from './i18n';
import { connectGameServer } from './server';
import {
  catSprite,
  costumeSprite,
  costumeCategory,
  CostumeCategory,
  CAT_SPRITE_COUNT,
  COSTUME_COUNT,
} from './assets';

const SHOP_PRICE = 1000; // 코스튬 1개당 가격 (전부 동일)

const FREE_AD_COINS = 300; // 스테이지 선택 화면의 "광고 보고 코인 받기" 보상

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

/** 게임 톤에 맞는 자체 확인 모달. 네이티브 confirm() 이 런치 환경(iframe/웹뷰)에서
 *  안 뜨는 문제 대응. 확인 시 onConfirm 호출, 취소/배경 클릭 시 그냥 닫힌다. */
function showConfirm(
  root: HTMLElement,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay confirm-overlay';
  overlay.innerHTML = `
    <div class="panel confirm-panel">
      <p class="confirm-msg">${message}</p>
      <div class="btns">
        <button data-cancel>${t('cancelBtn')}</button>
        <button class="confirm-danger" data-ok>${confirmLabel}</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    const tgt = e.target as HTMLElement;
    if (tgt.closest('[data-ok]')) {
      overlay.remove();
      onConfirm();
    } else if (tgt.closest('[data-cancel]') || tgt === overlay) {
      overlay.remove();
    }
  });
  root.appendChild(overlay);
}

/** 코스튬 정보 팝업 — 해당 고양이가 그 코스튬을 입은 모습(미리보기)과 안내 문구. */
function showCostumeInfo(root: HTMLElement, type: number, idx: number): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay confirm-overlay';
  const preview = [catSprite(type), costumeSprite(idx)]
    .map((u) => `<i class="cat-layer" style="background-image:url(${u})"></i>`)
    .join('');
  overlay.innerHTML = `
    <div class="panel costume-info-panel">
      <h2>${t('costumeInfoTitle')}</h2>
      <div class="costume-info-preview">${preview}</div>
      <p class="confirm-msg">${t('costumeInfoDesc')}</p>
      <div class="btns"><button class="primary" data-close>${t('closeBtn')}</button></div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    const tgt = e.target as HTMLElement;
    if (tgt.closest('[data-close]') || tgt === overlay) overlay.remove();
  });
  root.appendChild(overlay);
}

/** 잠깐 떴다 사라지는 토스트 메시지. 네이티브 alert() 대체 (런치 환경에서 확실히 표시). */
function showToast(root: HTMLElement, message: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 300);
  }, 1600);
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
    <header class="select-top" style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 12px; width: 100%;">
      <h1 style="margin: 0; font-size: 32px; font-weight: 900; text-align: center; letter-spacing: -0.02em;">${t('gameTitle')}</h1>
      <div class="select-info" style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%;">
        <span class="coin"><i class="coin-ic"></i> ${store.coins}</span>
        <button class="lang-toggle-btn" aria-label="Language"></button>
        <button class="icon-btn shop-btn" style="font-size: 18px;" aria-label="${t('shopAria')}">🛍️</button>
        <button class="icon-btn rank-btn" style="font-size: 18px;" aria-label="Leaderboard">🏆</button>
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

  const titleEl = screen.querySelector<HTMLHeadingElement>('.select-top h1')!;
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
    titleEl.textContent = t('gameTitle');
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
    if (tgt.closest('.rank-btn')) {
      showRanking(root, () => {
        showStageSelect(root, onPlay, onSettings);
      });
      return;
    }
    if (tgt.closest('.shop-btn')) {
      showShop(root, () => {
        showStageSelect(root, onPlay, onSettings);
      });
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
      // 광고 재생 + 서버 검증 후 검증된 금액만 지급
      void claimRewardedAd(root, 'free-coins', FREE_AD_COINS).then((amount) => {
        adBtn.disabled = false;
        if (amount <= 0) return;
        store.coins += amount;
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
      // 변동 보상(스테이지 코인 2배): 서버는 검증만, 금액은 result.coins 사용
      void claimRewardedAd(root, 'double-stage-coins', result.coins).then((amount) => {
        if (amount <= 0) {
          adBtn.disabled = false;
          return;
        }
        store.coins += amount; // 이번 스테이지 보상만큼 한 번 더 지급 = 2배
        persist();
        const coinEl = overlay.querySelector('.coin-earned')!;
        coinEl.textContent = `+${result.coins + amount}`;
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
      // 네이티브 confirm() 은 런치(iframe/웹뷰)에서 안 뜨는 경우가 있어 자체 모달 사용
      showConfirm(root, t('resetConfirm'), t('resetConfirmYes'), () => {
        overlay.remove();
        onReset();
      });
      return;
    }
    if (tgt.closest('[data-close]')) {
      overlay.remove();
      onClose();
    }
  });

  root.appendChild(overlay);
}

/** 랭킹 모달 */
export function showRanking(root: HTMLElement, onClose: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  // 로딩 화면 먼저 그리기
  overlay.innerHTML = `
    <div class="panel settings-panel">
      <h2>${t('rankTitle')}</h2>
      <div style="padding: 30px 0; text-align: center; font-weight: bold;">
        <span class="ad-spinner" style="display: inline-block; margin-bottom: 10px;"></span>
        <div>${t('rankLoading')}</div>
      </div>
      <div class="btns" style="margin-top: 10px;">
        <button class="primary" data-close>${t('closeBtn')}</button>
      </div>
    </div>
  `;

  root.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    const tgt = e.target as HTMLElement;
    if (tgt.closest('[data-close]')) {
      overlay.remove();
      onClose();
    }
  });

  // 비동기 데이터 통신 수행
  void connectGameServer().then(async (server) => {
    try {
      if (!server.connected) {
        throw new Error('Server connection failed');
      }

      // 안전한 타임아웃 래퍼 정의 (최대 4초 대기 후 Reject)
      const callWithTimeout = async (fn: string, args: any[] = []): Promise<any> => {
        return Promise.race([
          server.remoteFunction(fn, args),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 4000))
        ]);
      };

      // 1. 처음엔 임시 기록 불러오기
      let [top, my] = await Promise.all([
        callWithTimeout('getTopRankings'),
        callWithTimeout('getMyBestRank'),
      ]);

      // 2. 자동 싱크 (로컬 완료 기록이 서버 기록보다 높은 경우)
      const localMaxCompleted = store.highStage - 1;
      const serverBest = my.bestEntry ? my.bestEntry.bestStage : 0;
      
      if (localMaxCompleted > serverBest && localMaxCompleted >= 1) {
        // 자동 제출 (이름은 지갑주소 앞6자리 또는 기본이름으로)
        const defNick = my.bestEntry?.nickname || `Kitten_${server.account.substring(2, 6)}`;
        await callWithTimeout('submitStageRecord', [localMaxCompleted, defNick]);
        
        // 다시 데이터 리로딩
        [top, my] = await Promise.all([
          callWithTimeout('getTopRankings'),
          callWithTimeout('getMyBestRank'),
        ]);
      }

      // 3. 메인 콘텐츠 렌더링
      const renderContent = () => {
        const topList = top as any[];
        const myRankInfo = my as { bestEntry: any; rank: number };
        const myNickname = myRankInfo.bestEntry?.nickname || `Kitten_${server.account.substring(2, 6)}`;

        const topRowsHtml = topList.length === 0
          ? `<div style="text-align:center; padding: 20px; color:#6b4f2a; font-weight:bold; font-size:14px;">${t('rankNoRecord')}</div>`
          : topList.map((entry, idx) => {
              const isMe = entry.account === server.account;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              const rowBg = isMe ? 'background: #ffedd5; border: 2px solid #ff9f68;' : 'background: rgba(107,79,42,0.06);';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 6px; border-radius: 10px; ${rowBg} font-size: 14px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 800; min-width: 28px; text-align: left;">${medal}</span>
                    <span style="font-weight: 700; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${entry.nickname}</span>
                    ${isMe ? `<span style="font-size: 10px; background: #ff9f68; color: white; padding: 1px 4px; border-radius: 4px; font-weight: bold;">${t('rankMeBadge')}</span>` : ''}
                  </div>
                  <span style="font-weight: 800; color: #c9722e;">${tf('rankStage', { n: entry.bestStage })}</span>
                </div>
              `;
            }).join('');

        const myBestHtml = myRankInfo.bestEntry
          ? `<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 12px; background: #fff1f2; border: 1.5px solid #fda4af; font-size: 14px; font-weight: bold; margin-bottom: 12px; text-align: left;">
               <div style="display: flex; align-items: center; gap: 6px;">
                 <span style="color:#e11d48; font-weight:900;">★ ${tf('rankMyRank', { n: myRankInfo.rank })}</span>
                 <span style="color:#4a3b32; opacity:0.8;">${myRankInfo.bestEntry.nickname}</span>
               </div>
               <span style="color:#e11d48;">${tf('rankStage', { n: myRankInfo.bestEntry.bestStage })}</span>
             </div>`
          : `<div style="text-align: center; font-size:12px; opacity:0.6; font-weight:bold; margin-bottom: 12px;">${t('rankNoRecord')}</div>`;

        const pnl = overlay.querySelector('.panel')!;
        pnl.innerHTML = `
          <h2 style="margin-bottom:12px; font-size: 24px;">${t('rankTitle')}</h2>
          
          <!-- 랭킹 리스트 (Top 20) -->
          <div class="rank-list" style="max-height: 180px; overflow-y: auto; margin-bottom: 12px; padding-right: 4px; text-align: left;">
            ${topRowsHtml}
          </div>

          <!-- 나의 랭킹 정보 -->
          <div style="text-align: left; margin-top: 10px;">
            <div style="font-size: 11px; font-weight: 800; color:#6b4f2a; text-transform: uppercase; margin-bottom: 4px;">${t('rankYourBest')}</div>
            ${myBestHtml}
          </div>

          <!-- 닉네임 입력폼 -->
          <div style="display: flex; gap: 6px; margin-bottom: 16px; align-items: center;">
            <input type="text" id="rank-nick-input" class="nick-input" value="${myNickname}" placeholder="${t('rankPlaceholder')}" maxlength="15" style="flex: 1; padding: 10px; border-radius: 12px; border: 2px solid rgba(107,79,42,0.2); font-size:13px; font-weight:700; color:var(--ink); background:#fff;" />
            <button id="rank-update-btn" style="padding: 10px 14px; background:var(--accent); color:#fff; border:none; border-radius:12px; font-weight:800; font-size:13px; cursor:pointer; height: 100%; transition: transform 0.1s ease;">${t('rankUpdateName')}</button>
          </div>

          <div id="rank-error" style="color: #e11d48; font-size: 11px; font-weight: bold; margin-top: -12px; margin-bottom: 12px; text-align: left; display: none;"></div>

          <div class="btns">
            <button class="primary" data-close>${t('closeBtn')}</button>
          </div>
        `;

        // 닉네임 변경 버튼 클릭 리스너 바인딩
        const updateBtn = pnl.querySelector('#rank-update-btn') as HTMLButtonElement;
        const nickInput = pnl.querySelector('#rank-nick-input') as HTMLInputElement;
        const errDiv = pnl.querySelector('#rank-error') as HTMLDivElement;

        updateBtn.addEventListener('click', async () => {
          const val = nickInput.value.trim();
          if (!val) {
            errDiv.textContent = t('rankEmptyName');
            errDiv.style.display = 'block';
            return;
          }
          if (val.length > 15) {
            errDiv.textContent = t('rankNameTooLong');
            errDiv.style.display = 'block';
            return;
          }
          errDiv.style.display = 'none';
          updateBtn.disabled = true;
          updateBtn.textContent = t('rankSaving');
          
          try {
            // 현재 해금된 최고 스테이지 기록으로 닉네임과 점수를 등록/수정합니다.
            const submitStage = Math.max(localMaxCompleted, serverBest, 1);
            await callWithTimeout('submitStageRecord', [submitStage, val]);
            
            // 데이터 재호출 및 뷰 업데이트
            [top, my] = await Promise.all([
              callWithTimeout('getTopRankings'),
              callWithTimeout('getMyBestRank'),
            ]);
            
            renderContent();
          } catch (err: any) {
            errDiv.textContent = err.message || t('rankUpdateFailed');
            errDiv.style.display = 'block';
            updateBtn.disabled = false;
            updateBtn.textContent = t('rankUpdateName');
          }
        });
      };

      renderContent();
    } catch (error) {
      console.error('Failed to render ranking screen', error);
      const pnl = overlay.querySelector('.panel')!;
      pnl.innerHTML = `
        <h2>${t('rankTitle')}</h2>
        <div style="padding: 20px 0; text-align: center; color: #e11d48; font-weight: bold;">
          ${t('rankFetchFailed')}
        </div>
        <div class="btns">
          <button class="primary" data-close>${t('closeBtn')}</button>
        </div>
      `;
    }
  });
}

/** 코스튬 상점 — 타입(고양이 종류) 중심: 12개 타입 스와치 → 선택한 타입에 입힐
 *  착용물 갤러리(구매/장착/해제). 의상(0~5)/모자(6~13)는 별도 슬롯이라 동시 착용
 *  가능하고, 같은 아이템은 한 번에 한 타입에만 장착 가능. */
export function showShop(root: HTMLElement, onClose: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="panel shop-panel"></div>`;
  root.appendChild(overlay);
  const panel = overlay.querySelector<HTMLDivElement>('.shop-panel')!;

  let currentType: number | null = null;

  // 스프라이트 URL 목록(뒤→앞)을 겹쳐 쌓는 레이어 마크업으로.
  // 다중 배경 대신 .cat-layer 자식 요소로 겹쳐 어떤 런타임에서도 안전하게 보인다.
  function spriteLayers(urls: string[]): string {
    return urls
      .map((u) => `<i class="cat-layer" style="background-image:url(${u})"></i>`)
      .join('');
  }

  // 타입이 현재 장착 중인 모습 (고양이 → 의상 → 모자 순으로 겹침)
  function equippedLayers(type: number): string {
    const urls = [catSprite(type)];
    const clothes = store.equippedClothes[type];
    const hat = store.equippedHats[type];
    if (clothes !== undefined) urls.push(costumeSprite(clothes));
    if (hat !== undefined) urls.push(costumeSprite(hat));
    return spriteLayers(urls);
  }

  function renderTypes() {
    currentType = null;
    const tiles = Array.from({ length: CAT_SPRITE_COUNT }, (_, type) => {
      return `
        <button class="shop-type-tile" data-type="${type}">
          <i class="shop-sprite">${equippedLayers(type)}</i>
        </button>`;
    }).join('');

    panel.innerHTML = `
      <h2>${t('shopTitle')}</h2>
      <div class="shop-coin"><i class="coin-ic"></i> ${store.coins}</div>
      <div class="shop-grid shop-types">${tiles}</div>
      <div class="btns"><button class="primary" data-close>${t('closeBtn')}</button></div>
    `;
  }

  function renderGallery(type: number) {
    currentType = type;

    // 카테고리 한 섹션(라벨 + 해제 타일 + 아이템 타일들) 마크업
    function section(category: CostumeCategory, label: string): string {
      const slot = category === 'clothes' ? store.equippedClothes : store.equippedHats;
      const equippedIdx = slot[type];
      const indices = Array.from({ length: COSTUME_COUNT }, (_, i) => i).filter(
        (i) => costumeCategory(i) === category,
      );

      const noneTile = `
        <button class="shop-costume-tile ${equippedIdx === undefined ? 'equipped' : ''}" data-action="default" data-cat="${category}">
          <i class="shop-sprite">${spriteLayers([catSprite(type)])}</i>
          ${equippedIdx === undefined ? `<span class="shop-badge shop-badge-on">${t('shopEquippedLabel')}</span>` : ''}
        </button>`;

      const itemTiles = indices
        .map((idx) => {
          const owned = store.ownedCostumes.includes(idx);
          const isEquippedHere = equippedIdx === idx;
          const badge = isEquippedHere
            ? `<span class="shop-badge shop-badge-on">${t('shopEquippedLabel')}</span>`
            : !owned
              ? `<span class="shop-badge shop-badge-price"><i class="coin-ic"></i>${SHOP_PRICE}</span>`
              : '';
          return `
            <button class="shop-costume-tile ${isEquippedHere ? 'equipped' : ''} ${!owned ? 'locked' : ''}" data-action="costume" data-idx="${idx}">
              <i class="shop-sprite">${spriteLayers([catSprite(type), costumeSprite(idx)])}</i>
              <span class="shop-info-btn" data-info="${idx}" role="button" aria-label="${t('costumeInfoAria')}">ⓘ</span>
              ${!owned ? '<span class="shop-lock">🔒</span>' : ''}
              ${badge}
            </button>`;
        })
        .join('');

      return `
        <div class="shop-section-label">${label}</div>
        <div class="shop-grid shop-costumes">${noneTile}${itemTiles}</div>`;
    }

    panel.innerHTML = `
      <div class="shop-gallery-head">
        <button class="icon-btn shop-back-btn" aria-label="${t('backAria')}">‹</button>
        <h2>${tf('shopTypeTitle', { n: type + 1 })}</h2>
      </div>
      <div class="shop-coin"><i class="coin-ic"></i> ${store.coins}</div>
      ${section('clothes', t('shopClothesLabel'))}
      ${section('hat', t('shopHatsLabel'))}
      <div class="btns"><button class="primary" data-close>${t('closeBtn')}</button></div>
    `;
  }

  overlay.addEventListener('click', (e) => {
    const tgt = e.target as HTMLElement;
    if (tgt.closest('[data-close]')) {
      overlay.remove();
      onClose();
      return;
    }
    if (tgt.closest('.shop-back-btn')) {
      renderTypes();
      return;
    }
    const typeTile = tgt.closest('.shop-type-tile') as HTMLElement | null;
    if (typeTile) {
      renderGallery(Number(typeTile.dataset.type));
      return;
    }
    // ⓘ 버튼은 타일보다 먼저 처리 — 구매/장착으로 넘어가지 않게 한다.
    const infoBtn = tgt.closest('.shop-info-btn') as HTMLElement | null;
    if (infoBtn && currentType !== null) {
      showCostumeInfo(root, currentType, Number(infoBtn.dataset.info));
      return;
    }
    const costumeTile = tgt.closest('.shop-costume-tile') as HTMLElement | null;
    if (costumeTile && currentType !== null) {
      const type = currentType;
      if (costumeTile.dataset.action === 'default') {
        unequipCostume(type, costumeTile.dataset.cat as CostumeCategory);
        renderGallery(type);
        return;
      }
      const idx = Number(costumeTile.dataset.idx);
      const owned = store.ownedCostumes.includes(idx);
      const slot = costumeCategory(idx) === 'clothes' ? store.equippedClothes : store.equippedHats;
      if (slot[type] === idx) {
        unequipCostume(type, costumeCategory(idx));
        renderGallery(type);
        return;
      }
      if (!owned) {
        if (store.coins < SHOP_PRICE) {
          showToast(root, t('shopNotEnoughCoins'));
          return;
        }
        buyCostume(idx, SHOP_PRICE);
        equipCostume(type, idx);
        renderGallery(type);
        return;
      }
      equipCostume(type, idx);
      renderGallery(type);
    }
  });

  renderTypes();
}
