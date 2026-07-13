import './style.css';
import { Game } from './Game';
import { makeStage } from './stages';
import { store, persist, resetSave, recordClear } from './storage';
import { showStageSelect, showResult, showSettings } from './screens';
import { GameResult } from './types';
import { unlockAudio } from './audio';
import { applyDocumentLang } from './i18n';
import { getGameServer, connectGameServer } from './server';

const app = document.querySelector<HTMLDivElement>('#app')!;

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
// 게임 부팅 시 백그라운드에서 실시간 서버 연결을 시작합니다.
void connectGameServer().then(async (server) => {
  if (server.connected) {
    try {
      // 서버에서 해당 지갑 계정의 전용 클라우드 저장 데이터를 로드합니다.
      const cloudSave = await server.remoteFunction('loadGameData');
      if (cloudSave) {
        // 클라우드 저장 데이터를 로컬 스토어에 덮어써서 동기화합니다.
        Object.assign(store, cloudSave);
        // 동기화된 상태를 로컬 저장소(localStorage)에도 즉시 동기화 보관합니다.
        localStorage.setItem('cat-trio-save-v1', JSON.stringify(store));
        // 동기화 완료 후 최신 진행 상황(해금 스테이지, 코인 등)을 화면에 즉각 갱신 반영합니다.
        toSelect();
      }
    } catch (e) {
      console.warn('Failed to sync cloud save data on boot', e);
    }
  }
});
// 진입: 스테이지 선택 화면 (로컬 캐시로 먼저 끊김없이 시작)
toSelect();
