import './style.css';
import { Game } from './Game';
import { makeStage } from './stages';
import { store, persist, resetSave, recordClear } from './storage';
import { showStageSelect, showResult, showSettings } from './screens';
import { GameResult } from './types';
import { unlockAudio } from './audio';
import { applyDocumentLang } from './i18n';
import { getGameServer, connectGameServer } from './server';
import { VXShop } from '@verse8/platform/vanilla';

const app = document.querySelector<HTMLDivElement>('#app')!;

// VX 상점 초기화 (계정/verse 는 임베드 URL 파라미터에서 자동 인식). 한 번만.
try {
  VXShop.init();
} catch (e) {
  console.warn('VXShop init failed', e);
}

// 브라우저 자동재생 정책 — 첫 사용자 제스처에서 오디오를 깨우고
// 설정이 켜져 있으면 BGM 을 시작한다.
document.addEventListener('pointerdown', unlockAudio, { once: true });

let current: Game | null = null;

function toSelect() {
  current?.destroy();
  current = null;
  showStageSelect(app, startStage, openSettings);
}

function startStage(id: number) {
  current?.destroy();
  store.currentStage = id;
  persist();
  // 스테이지 1 첫 플레이에서만 튜토리얼
  const tutorial = id === 1 && !store.tutorialDone;
  current = new Game(app, makeStage(id), handleEnd, toSelect, tutorial);
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = current;
}

function handleEnd(result: GameResult) {
  const isNewBest = result.win
    ? recordClear(result.stageId, result.stars, result.coins)
    : false;

  if (result.win) {
    const s = getGameServer();
    if (s.connected) {
      void s.remoteFunction('getMyBestRank').then(async (myRank) => {
        const nick = myRank.bestEntry?.nickname || `Kitten_${s.account.substring(2, 6)}`;
        await s.remoteFunction('submitStageRecord', [result.stageId, nick]);
      });
    }
  }

  showResult(app, result, isNewBest, {
    onNext: () => startStage(result.stageId + 1),
    onRetry: () => startStage(result.stageId),
    onSelect: toSelect,
  });
}

function openSettings() {
  showSettings(
    app,
    () => {
      resetSave();
      toSelect();
    },
    toSelect, // 닫을 때 스테이지 선택 화면을 새로 그려 언어 변경 등을 반영
  );
}

applyDocumentLang();
// 진입: 스테이지 선택 화면 (로컬 캐시로 먼저 끊김없이 시작)
toSelect();

// 게임 부팅 시 백그라운드에서 실시간 서버 연결을 시작합니다.
void connectGameServer().then(async (server) => {
  if (server.connected) {
    try {
      const cloudSave = await server.remoteFunction('loadGameData');
      if (cloudSave) {
        // 중요: 클라우드와 로컬 중 더 높은 진행도를 우선 병합합니다.
        // 단순 Object.assign 으로 덮어쓰면 장착한 코스튬이 날아가고
        // 고양이 종류가 초기화되는 버그가 발생합니다.
        const merged: any = {};
        // 숫자 값은 더 높은 쪽을 살립니다 (스테이지, 코인 등)
        for (const key of ['highStage', 'currentStage', 'coins']) {
          merged[key] = Math.max((store as any)[key] ?? 0, cloudSave[key] ?? 0);
        }
        // 객체/배열은 로컬 값이 있으면 로컬을 우선, 없으면 클라우드 사용
        for (const key of ['bestStars', 'settings']) {
          merged[key] = { ...(cloudSave[key] ?? {}), ...(store as any)[key] };
        }
        // 코스튬 관련 데이터: 로컬 값이 절대 우선 (클라우드가 오래된 빈 객체면 덮어쓰지 않음)
        for (const key of ['ownedCostumes', 'equippedClothes', 'equippedHats']) {
          const localVal = (store as any)[key];
          if (localVal && (Array.isArray(localVal) ? localVal.length > 0 : Object.keys(localVal).length > 0)) {
            merged[key] = localVal;
          } else {
            merged[key] = cloudSave[key] ?? localVal;
          }
        }
        // 기타 필드는 그대로 유지
        for (const key of ['tutorialDone']) {
          merged[key] = (store as any)[key] ?? cloudSave[key];
        }

        Object.assign(store, merged);
        localStorage.setItem('cat-trio-save-v1', JSON.stringify(store));
      }
    } catch (e) {
      console.warn('Failed to sync cloud save data on boot', e);
    }
  }
});
