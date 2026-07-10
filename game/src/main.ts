import './style.css';
import { Game } from './Game';
import { makeStage } from './stages';
import { store, persist, resetSave, recordClear } from './storage';
import { showStageSelect, showResult, showSettings } from './screens';
import { GameResult } from './types';
import { unlockAudio } from './audio';

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
  showResult(app, result, isNewBest, {
    onNext: () => startStage(result.stageId + 1),
    onRetry: () => startStage(result.stageId),
    onSelect: toSelect,
  });
}

function openSettings() {
  showSettings(app, () => {
    resetSave();
    toSelect();
  });
}

// 진입: 스테이지 선택 화면
toSelect();
