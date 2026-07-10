import { store } from './storage';

// 공유 AudioContext — 브라우저 자동재생 정책상 첫 사용자 제스처 이후에만 소리가 난다.
// haptics.ts 와 같은 패턴: 설정이 꺼져 있거나 미지원 환경이면 조용히 무시.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 첫 사용자 제스처에서 호출 — 오디오 컨텍스트를 깨우고, 설정이 켜져 있으면 BGM 시작. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (store.settings.bgm) bgm.start();
}

// ---- 효과음 (SFX) ---------------------------------------------------------
function tone(
  freq: number,
  start: number,
  dur: number,
  opts: { type?: OscillatorType; peak?: number; attack?: number } = {},
) {
  const c = getCtx();
  if (!c) return;
  const { type = 'sine', peak = 0.15, attack = 0.02 } = opts;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function playIfEnabled(fn: (c: AudioContext) => void) {
  if (!store.settings.sfx) return;
  const c = getCtx();
  if (!c) return;
  try {
    fn(c);
  } catch {
    /* 오디오 재생 실패는 조용히 무시 */
  }
}

export const sfx = {
  // 고양이 선택 — 짧고 통통 튀는 팝
  tap: () =>
    playIfEnabled((c) => {
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }),

  // 3매치 완성 — 반짝이는 3음 코드
  match: () =>
    playIfEnabled((c) => {
      const now = c.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, now + i * 0.06, 0.24, { type: 'triangle', peak: 0.11 }));
    }),

  // 스테이지 클리어 — 상승 아르페지오 팡파르
  win: () =>
    playIfEnabled((c) => {
      const now = c.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, now + i * 0.12, 0.42, { type: 'sine', peak: 0.13, attack: 0.03 }),
      );
    }),

  // 게임 오버 — 아래로 처지는 슬픈 진행
  lose: () =>
    playIfEnabled((c) => {
      const now = c.currentTime;
      [392.0, 349.23, 311.13, 261.63].forEach((f, i) =>
        tone(f, now + i * 0.17, 0.42, { type: 'triangle', peak: 0.09 }),
      );
    }),
};

// ---- 배경음악 (BGM) --------------------------------------------------------
// 외부 음원 파일 없이 Web Audio 로 잔잔한 루프를 절차 생성한다.
const SCALE = [261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63]; // C-E-G-A-C-A-G-E
const NOTE_DUR = 0.9;
const LOOP_DUR = SCALE.length * NOTE_DUR;

let bgmGain: GainNode | null = null;
let bgmPlaying = false;
let bgmTimer = 0;

function ensureBgmGain(c: AudioContext): GainNode {
  if (!bgmGain) {
    bgmGain = c.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(c.destination);
  }
  return bgmGain;
}

function scheduleBgmIteration() {
  const c = getCtx();
  if (!c || !bgmGain) return;
  const t0 = c.currentTime + 0.05;
  SCALE.forEach((freq, i) => {
    const start = t0 + i * NOTE_DUR;
    const osc = c.createOscillator();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.055, start + 0.18);
    gain.gain.linearRampToValueAtTime(0.03, start + NOTE_DUR * 0.6);
    gain.gain.linearRampToValueAtTime(0, start + NOTE_DUR);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain!);
    osc.start(start);
    osc.stop(start + NOTE_DUR + 0.05);
  });
  bgmTimer = window.setTimeout(scheduleBgmIteration, LOOP_DUR * 1000);
}

export const bgm = {
  start() {
    if (!store.settings.bgm) return;
    const c = getCtx();
    if (!c) return;
    const g = ensureBgmGain(c);
    if (bgmPlaying) return;
    bgmPlaying = true;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.linearRampToValueAtTime(1, c.currentTime + 1.2); // 서서히 페이드인
    scheduleBgmIteration();
  },
  stop() {
    bgmPlaying = false;
    clearTimeout(bgmTimer);
    if (ctx && bgmGain) {
      bgmGain.gain.cancelScheduledValues(ctx.currentTime);
      bgmGain.gain.setValueAtTime(bgmGain.gain.value, ctx.currentTime);
      bgmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); // 페이드아웃
    }
  },
  isPlaying: () => bgmPlaying,
};
