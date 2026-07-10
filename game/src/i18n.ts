import { store } from './storage';

// 다국어 사전. {placeholder} 는 tf() 로 값 치환.
const dict = {
  settingsAria: { ko: '설정', en: 'Settings' },
  prevStageAria: { ko: '이전 스테이지', en: 'Previous stage' },
  nextStageAria: { ko: '다음 스테이지', en: 'Next stage' },
  lockedLabel: { ko: '잠김', en: 'Locked' },
  playBtn: { ko: '플레이', en: 'Play' },
  freeAdBtn: { ko: '광고 보고 {icon}{n} 받기', en: 'Watch ad for {icon}{n}' },

  clearTitle: { ko: '클리어!', en: 'Clear!' },
  gameOverTitle: { ko: '게임 오버', en: 'Game Over' },
  newBest: { ko: '최고 기록 갱신! ✨', en: 'New best! ✨' },
  timeLabel: { ko: '⏱ 시간', en: '⏱ Time' },
  coinLabel: { ko: '코인', en: 'Coins' },
  gameOverMsg: { ko: '슬롯이 가득 찼거나 시간이 다 됐어요', en: 'Slots are full or time ran out' },
  stageSelectBtn: { ko: '스테이지 선택', en: 'Stage Select' },
  nextBtn: { ko: '다음 ▶', en: 'Next ▶' },
  retryBtn: { ko: '다시하기', en: 'Retry' },
  adDoubleBtn: { ko: '광고 보고 코인 2배 받기', en: 'Watch ad to double coins' },
  adDoubleClaimed: { ko: '✓ 코인 2배 받음', en: '✓ Coins doubled' },

  settingsTitle: { ko: '설정', en: 'Settings' },
  bgmLabel: { ko: '🎵 배경음악', en: '🎵 Music' },
  sfxLabel: { ko: '🔊 효과음', en: '🔊 Sound' },
  vibrateLabel: { ko: '📳 진동', en: '📳 Vibration' },
  languageLabel: { ko: '🌐 언어', en: '🌐 Language' },
  langKorean: { ko: '한국어', en: '한국어' },
  langEnglish: { ko: 'English', en: 'English' },
  resetBtn: { ko: '데이터 초기화', en: 'Reset Data' },
  closeBtn: { ko: '닫기', en: 'Close' },
  resetConfirm: { ko: '모든 진행 상황을 초기화할까요?', en: 'Reset all progress?' },

  backAria: { ko: '뒤로', en: 'Back' },
  shuffleLabel: { ko: '셔플', en: 'Shuffle' },
  undoLabel: { ko: '되돌리기', en: 'Undo' },
  slotPlusLabel: { ko: '슬롯+1', en: 'Slot+1' },
  skipBtn: { ko: '건너뛰기', en: 'Skip' },
  tutorialStep1: {
    ko: '반짝이는 고양이를 눌러 탈출구(▼)로 내보내세요',
    en: 'Tap a glowing cat to send it out the exit (▼)',
  },
  tutorialStep2: {
    ko: '같은 고양이 3마리를 슬롯에 모으면 사라져요!',
    en: 'Collect 3 matching cats in the slot to clear them!',
  },

  adCaption: { ko: '보상형 광고 재생 중…', en: 'Playing rewarded ad…' },
  adTimerWait: { ko: '{n}초 후 닫기 가능', en: 'Closable in {n}s' },
  adTimerReady: { ko: '보상을 받을 수 있어요!', en: 'You can claim your reward!' },
  adCloseAria: { ko: '닫기', en: 'Close' },
} as const;

type Key = keyof typeof dict;

export function t(key: Key): string {
  return dict[key][store.settings.lang];
}

export function tf(key: Key, params: Record<string, string | number>): string {
  let s: string = dict[key][store.settings.lang];
  for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** 언어 전환 시 <html lang> 도 맞춰준다 (접근성). */
export function applyDocumentLang() {
  document.documentElement.lang = store.settings.lang;
}
