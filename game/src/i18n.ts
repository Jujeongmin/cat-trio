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
  resetConfirmYes: { ko: '초기화', en: 'Reset' },
  cancelBtn: { ko: '취소', en: 'Cancel' },

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

  gameTitle: { ko: '🐾 캣 트리오', en: '🐾 Cat Trio' },
  rankTitle: { ko: '🏆 캣 트리오 랭킹', en: '🏆 Cat Trio Rankings' },
  rankStage: { ko: '스테이지 {n}', en: 'Stage {n}' },
  rankYourBest: { ko: '나의 최고 기록', en: 'Your Best Record' },
  rankLoading: { ko: '랭킹 불러오는 중...', en: 'Loading rankings...' },
  rankNoRecord: { ko: '등록된 기록이 없습니다', en: 'No record submitted yet' },
  rankUpdateName: { ko: '닉네임 변경', en: 'Update' },
  rankPlaceholder: { ko: '닉네임 입력 (최대 15자)', en: 'Enter nickname (max 15 chars)' },
  rankEmptyName: { ko: '닉네임을 입력해 주세요', en: 'Please enter a nickname' },
  rankNameTooLong: { ko: '닉네임은 15자 이하여야 합니다', en: 'Nickname cannot exceed 15 characters' },
  rankSaving: { ko: '저장 중...', en: 'Saving...' },
  rankMeBadge: { ko: '나', en: 'ME' },
  rankMyRank: { ko: '순위 #{n}', en: 'Rank #{n}' },
  rankFetchFailed: { ko: '랭킹을 불러오지 못했어요.', en: 'Failed to fetch rankings.' },
  rankUpdateFailed: { ko: '변경에 실패했어요', en: 'Failed to update' },

  vxShopAria: { ko: '코인 상점', en: 'Coin shop' },
  vxShopTitle: { ko: '💎 코인 상점', en: '💎 Coin Shop' },
  vxShopLoading: { ko: '상품 불러오는 중...', en: 'Loading products...' },
  vxShopEmpty: { ko: '지금은 구매할 수 있는 상품이 없어요', en: 'No products available right now' },
  vxBuyBtn: { ko: '구매', en: 'Buy' },
  vxThanks: { ko: '코인 {n}개를 받았어요! 🐾', en: 'Got {n} coins! 🐾' },
  vxPurchaseFailed: { ko: '구매를 완료하지 못했어요', en: 'Purchase did not complete' },

  shopAria: { ko: '상점', en: 'Shop' },
  shopTitle: { ko: '🛍️ 코스튬 상점', en: '🛍️ Costume Shop' },
  shopTypeTitle: { ko: '고양이 {n}', en: 'Cat {n}' },
  shopEquippedLabel: { ko: '장착중', en: 'Equipped' },
  shopNotEnoughCoins: { ko: '코인이 부족해요', en: 'Not enough coins' },
  shopClothesLabel: { ko: '👕 의상', en: '👕 Outfits' },
  shopHatsLabel: { ko: '🎩 모자', en: '🎩 Hats' },
  costumeInfoAria: { ko: '코스튬 설명', en: 'Costume info' },
  costumeInfoTitle: { ko: '코스튬 안내', en: 'About Costumes' },
  costumeInfoDesc: {
    ko: '이 코스튬을 장착하면, 스테이지에 나오는 이 고양이가 코스튬을 입은 모습으로 등장해요! 🐾',
    en: 'Equip this costume and this cat will appear wearing it during stages! 🐾',
  },
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
