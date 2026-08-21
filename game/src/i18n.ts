import { store } from './storage';

export type Lang = 'ko' | 'en' | 'ja' | 'zh';

// 지원 언어 순환 순서 (토글·설정에서 다음 언어로 넘어갈 때 사용)
export const LANG_ORDER: Lang[] = ['ko', 'en', 'ja', 'zh'];

// 시작화면 언어 토글에 표시할 짧은 코드 (현재 언어)
export const LANG_CODE: Record<Lang, string> = { ko: 'KO', en: 'EN', ja: 'JA', zh: '繁' };

// 설정 화면 언어 버튼에 표시할 각 언어의 자국어 이름 (현재 언어)
export const LANG_NAME: Record<Lang, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '繁體中文',
};

/** 현재 언어의 다음 언어 (ko → en → ja → zh → ko). */
export function nextLang(l: Lang): Lang {
  return LANG_ORDER[(LANG_ORDER.indexOf(l) + 1) % LANG_ORDER.length];
}

// 다국어 사전. {placeholder} 는 tf() 로 값 치환.
const dict = {
  settingsAria: { ko: '설정', en: 'Settings', ja: '設定', zh: '設定' },
  prevStageAria: { ko: '이전 스테이지', en: 'Previous stage', ja: '前のステージ', zh: '上一關' },
  nextStageAria: { ko: '다음 스테이지', en: 'Next stage', ja: '次のステージ', zh: '下一關' },
  lockedLabel: { ko: '잠김', en: 'Locked', ja: 'ロック', zh: '鎖定' },
  playBtn: { ko: '플레이', en: 'Play', ja: 'プレイ', zh: '開始遊戲' },
  freeAdBtn: {
    ko: '광고 보고 {icon}{n} 받기',
    en: 'Watch ad for {icon}{n}',
    ja: '広告を見て{icon}{n}獲得',
    zh: '看廣告獲得{icon}{n}',
  },

  clearTitle: { ko: '클리어!', en: 'Clear!', ja: 'クリア！', zh: '過關！' },
  gameOverTitle: { ko: '게임 오버', en: 'Game Over', ja: 'ゲームオーバー', zh: '遊戲結束' },
  newBest: { ko: '최고 기록 갱신! ✨', en: 'New best! ✨', ja: '最高記録更新！ ✨', zh: '刷新最佳紀錄！ ✨' },
  timeLabel: { ko: '⏱ 시간', en: '⏱ Time', ja: '⏱ タイム', zh: '⏱ 時間' },
  coinLabel: { ko: '코인', en: 'Coins', ja: 'コイン', zh: '金幣' },
  gameOverMsg: {
    ko: '슬롯이 가득 찼거나 시간이 다 됐어요',
    en: 'Slots are full or time ran out',
    ja: 'スロットが満杯か時間切れです',
    zh: '格子已滿或時間到了',
  },
  stageSelectBtn: { ko: '스테이지 선택', en: 'Stage Select', ja: 'ステージ選択', zh: '選擇關卡' },
  nextBtn: { ko: '다음 ▶', en: 'Next ▶', ja: '次へ ▶', zh: '下一個 ▶' },
  retryBtn: { ko: '다시하기', en: 'Retry', ja: 'リトライ', zh: '重新挑戰' },
  adDoubleBtn: {
    ko: '광고 보고 코인 2배 받기',
    en: 'Watch ad to double coins',
    ja: '広告を見てコイン2倍',
    zh: '看廣告金幣加倍',
  },
  adDoubleClaimed: { ko: '✓ 코인 2배 받음', en: '✓ Coins doubled', ja: '✓ コイン2倍獲得', zh: '✓ 金幣已加倍' },

  settingsTitle: { ko: '설정', en: 'Settings', ja: '設定', zh: '設定' },
  bgmLabel: { ko: '🎵 배경음악', en: '🎵 BGM', ja: '🎵 BGM', zh: '🎵 BGM' },
  sfxLabel: { ko: '🔊 효과음', en: '🔊 SFX', ja: '🔊 SFX', zh: '🔊 SFX' },
  vibrateLabel: { ko: '📳 진동', en: '📳 Vibration', ja: '📳 バイブ', zh: '📳 震動' },
  languageLabel: { ko: '🌐 언어', en: '🌐 Language', ja: '🌐 言語', zh: '🌐 語言' },
  resetBtn: { ko: '데이터 초기화', en: 'Reset Data', ja: 'データ初期化', zh: '重置資料' },
  closeBtn: { ko: '닫기', en: 'Close', ja: '閉じる', zh: '關閉' },
  resetConfirm: {
    ko: '모든 진행 상황을 초기화할까요?',
    en: 'Reset all progress?',
    ja: 'すべての進行状況を初期化しますか？',
    zh: '要重置所有進度嗎？',
  },
  resetConfirmYes: { ko: '초기화', en: 'Reset', ja: '初期化', zh: '重置' },
  cancelBtn: { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' },

  backAria: { ko: '뒤로', en: 'Back', ja: '戻る', zh: '返回' },
  shuffleLabel: { ko: '셔플', en: 'Shuffle', ja: 'シャッフル', zh: '洗牌' },
  undoLabel: { ko: '되돌리기', en: 'Undo', ja: '元に戻す', zh: '復原' },
  slotPlusLabel: { ko: '슬롯+1', en: 'Slot+1', ja: 'スロット+1', zh: '格子+1' },
  skipBtn: { ko: '건너뛰기', en: 'Skip', ja: 'スキップ', zh: '跳過' },
  tutorialStep1: {
    ko: '반짝이는 고양이를 눌러 탈출구(▼)로 내보내세요',
    en: 'Tap a glowing cat to send it out the exit (▼)',
    ja: '光っている猫をタップして出口(▼)へ送り出そう',
    zh: '點擊發光的貓咪，把牠送出出口(▼)',
  },
  tutorialStep2: {
    ko: '같은 고양이 3마리를 슬롯에 모으면 사라져요!',
    en: 'Collect 3 matching cats in the slot to clear them!',
    ja: '同じ猫を3匹スロットに集めると消えるよ！',
    zh: '在格子裡集滿3隻相同的貓咪就會消除！',
  },

  adCaption: { ko: '보상형 광고 재생 중…', en: 'Playing rewarded ad…', ja: 'リワード広告を再生中…', zh: '正在播放獎勵廣告…' },
  adTimerWait: { ko: '{n}초 후 닫기 가능', en: 'Closable in {n}s', ja: '{n}秒後に閉じられます', zh: '{n}秒後可關閉' },
  adTimerReady: {
    ko: '보상을 받을 수 있어요!',
    en: 'You can claim your reward!',
    ja: '報酬を受け取れます！',
    zh: '可以領取獎勵了！',
  },
  adCloseAria: { ko: '닫기', en: 'Close', ja: '閉じる', zh: '關閉' },

  gameTitle: { ko: '캣 트리오', en: 'Cat Trio', ja: 'キャットトリオ', zh: '貓咪三重奏' },
  rankTitle: {
    ko: '🏆 캣 트리오 랭킹',
    en: '🏆 Cat Trio Rankings',
    ja: '🏆 キャットトリオ ランキング',
    zh: '🏆 貓咪三重奏 排行榜',
  },
  rankStage: { ko: '스테이지 {n}', en: 'Stage {n}', ja: 'ステージ {n}', zh: '關卡 {n}' },
  rankYourBest: { ko: '나의 최고 기록', en: 'Your Best Record', ja: '自己ベスト記録', zh: '你的最佳紀錄' },
  rankLoading: { ko: '랭킹 불러오는 중...', en: 'Loading rankings...', ja: 'ランキング読み込み中...', zh: '正在載入排行榜...' },
  rankNoRecord: { ko: '등록된 기록이 없습니다', en: 'No record submitted yet', ja: '登録された記録がありません', zh: '尚無提交的紀錄' },
  rankUpdateName: { ko: '닉네임 변경', en: 'Update', ja: '変更', zh: '更新' },
  rankPlaceholder: {
    ko: '닉네임 입력 (최대 15자)',
    en: 'Enter nickname (max 15 chars)',
    ja: 'ニックネーム入力 (最大15文字)',
    zh: '輸入暱稱 (最多15字)',
  },
  rankEmptyName: { ko: '닉네임을 입력해 주세요', en: 'Please enter a nickname', ja: 'ニックネームを入力してください', zh: '請輸入暱稱' },
  rankNameTooLong: {
    ko: '닉네임은 15자 이하여야 합니다',
    en: 'Nickname cannot exceed 15 characters',
    ja: 'ニックネームは15文字以内です',
    zh: '暱稱不能超過15個字',
  },
  rankSaving: { ko: '저장 중...', en: 'Saving...', ja: '保存中...', zh: '儲存中...' },
  rankMeBadge: { ko: '나', en: 'ME', ja: '私', zh: '我' },
  rankMyRank: { ko: '순위 #{n}', en: 'Rank #{n}', ja: '順位 #{n}', zh: '排名 #{n}' },
  rankFetchFailed: {
    ko: '랭킹을 불러오지 못했어요.',
    en: 'Failed to fetch rankings.',
    ja: 'ランキングを取得できませんでした。',
    zh: '無法取得排行榜。',
  },
  rankUpdateFailed: { ko: '변경에 실패했어요', en: 'Failed to update', ja: '変更に失敗しました', zh: '更新失敗' },

  vxShopAria: { ko: '코인 상점', en: 'Coin shop', ja: 'コインショップ', zh: '金幣商店' },
  vxShopTitle: { ko: '💎 코인 상점', en: '💎 Coin Shop', ja: '💎 コインショップ', zh: '💎 金幣商店' },
  vxShopLoading: { ko: '상품 불러오는 중...', en: 'Loading products...', ja: '商品読み込み中...', zh: '正在載入商品...' },
  vxShopEmpty: {
    ko: '지금은 구매할 수 있는 상품이 없어요',
    en: 'No products available right now',
    ja: '現在購入できる商品がありません',
    zh: '目前沒有可購買的商品',
  },
  vxBuyBtn: { ko: '구매', en: 'Buy', ja: '購入', zh: '購買' },
  vxThanks: { ko: '코인 {n}개를 받았어요! 🐾', en: 'Got {n} coins! 🐾', ja: 'コインを{n}枚獲得しました！ 🐾', zh: '獲得了{n}枚金幣！ 🐾' },
  vxPurchaseFailed: {
    ko: '구매를 완료하지 못했어요',
    en: 'Purchase did not complete',
    ja: '購入を完了できませんでした',
    zh: '購買未完成',
  },

  shopAria: { ko: '상점', en: 'Shop', ja: 'ショップ', zh: '商店' },
  shopTitle: { ko: '🛍️ 코스튬 상점', en: '🛍️ Costume Shop', ja: '🛍️ コスチュームショップ', zh: '🛍️ 服裝商店' },
  shopTypeTitle: { ko: '고양이 {n}', en: 'Cat {n}', ja: 'ねこ {n}', zh: '貓咪 {n}' },
  shopEquippedLabel: { ko: '장착중', en: 'Equipped', ja: '装着中', zh: '已裝備' },
  shopNotEnoughCoins: { ko: '코인이 부족해요', en: 'Not enough coins', ja: 'コインが足りません', zh: '金幣不足' },
  shopClothesLabel: { ko: '👕 의상', en: '👕 Outfits', ja: '👕 衣装', zh: '👕 服裝' },
  shopHatsLabel: { ko: '🎩 모자', en: '🎩 Hats', ja: '🎩 帽子', zh: '🎩 帽子' },
  costumeInfoAria: { ko: '코스튬 설명', en: 'Costume info', ja: 'コスチューム説明', zh: '服裝說明' },
  costumeInfoTitle: { ko: '코스튬 안내', en: 'About Costumes', ja: 'コスチュームについて', zh: '關於服裝' },
  costumeInfoDesc: {
    ko: '이 코스튬을 장착하면, 스테이지에 나오는 이 고양이가 코스튬을 입은 모습으로 등장해요! 🐾',
    en: 'Equip this costume and this cat will appear wearing it during stages! 🐾',
    ja: 'このコスチュームを装着すると、ステージに登場するこの猫がコスチュームを着て現れます！ 🐾',
    zh: '裝備這件服裝後，這隻貓咪在關卡中就會穿著它登場！ 🐾',
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
