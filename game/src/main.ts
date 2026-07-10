import './style.css';
import { Game } from './Game';
import { makeStage } from './stages';
import { store, persist, resetSave, recordClear } from './storage';
import { showStageSelect, showResult, showSettings } from './screens';
import { GameResult } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;

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
  current = new Game(app, makeStage(id), handleEnd, toSelect);
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
