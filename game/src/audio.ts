import { store } from './storage';

// 공유 AudioContext — 브라우저 자동재생 정책상 첫 사용자 제스처 이후에만 소리가 난다.
// 실제 오디오 파일(mp3)을 Web Audio 버퍼로 디코드해 재생하고, 파일이 아직
// 로드되지 않았거나 로드에 실패하면 기존 합성음으로 조용히 폴백한다.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// 서브패스·iframe 임베드 환경에서도 올바르게 로드되도록 absolute URL 로 해결.
const soundUrl = (p: string) => new URL(p, window.location.href).href;

// ---- 오디오 파일 로딩 (버퍼) ----------------------------------------------
const SFX_FILES = {
  tap: 'sfx/Click.mp3',
  match: 'sfx/Match.mp3',
  win: 'sfx/Win.mp3',
  lose: 'sfx/Lose.mp3',
} as const;
type SfxName = keyof typeof SFX_FILES;

const sfxBuffers: Partial<Record<SfxName, AudioBuffer>> = {};
let bgmBuffer: AudioBuffer | null = null;
let assetsRequested = false;

async function decodeAudio(url: string): Promise<AudioBuffer | null> {
  const c = getCtx();
  if (!c) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await c.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null; // 로드/디코드 실패 → 합성음 폴백에 맡김
  }
}

// 첫 제스처 이후 한 번만 호출 — 모든 사운드 파일을 백그라운드로 디코드.
function loadAssets() {
  if (assetsRequested) return;
  assetsRequested = true;
  (Object.keys(SFX_FILES) as SfxName[]).forEach((k) => {
    void decodeAudio(soundUrl(SFX_FILES[k])).then((b) => {
      if (b) sfxBuffers[k] = b;
    });
  });
  void decodeAudio(soundUrl('bgm/BGM.mp3')).then((b) => {
    const c = getCtx();
    if (b) {
      bgmBuffer = b;
      // BGM 이 켜진 상태로 파일 로드를 기다리고 있었으면 지금 파일 루프 시작.
      // (합성음 폴백이 돌고 있었다면 그걸 끄고 파일로 전환)
      if (bgmPlaying && !bgmSource && c) {
        clearTimeout(bgmTimer);
        startBgmFile(c);
      }
    } else {
      // 파일 로드 실패 → 이제야 합성음 폴백으로 BGM 시작.
      bgmLoadFailed = true;
      if (bgmPlaying && !bgmSource) scheduleBgmIteration();
    }
  });
}

// 런타임 음소거 (인게임 🔊 버튼용). 설정 볼륨과 별개로 세션 중 껐다 켜는 스위치.
let muted = false;
export function isMuted() {
  return muted;
}
/** 음소거 토글 — BGM 은 즉시 멈추거나 다시 시작, SFX 는 재생 시점에 반영. 새 상태 반환. */
export function toggleMute(): boolean {
  muted = !muted;
  if (muted) bgm.stop();
  else if (store.settings.bgmVol > 0) bgm.start();
  return muted;
}

/** 첫 사용자 제스처에서 호출 — 오디오 컨텍스트를 깨우고, 사운드를 로드하고,
 *  BGM 볼륨이 0보다 크면 BGM 시작. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  loadAssets();
  if (!muted && store.settings.bgmVol > 0) bgm.start();
}

// ---- 효과음 (SFX) ---------------------------------------------------------
// 합성음 폴백 — 파일 버퍼가 준비되기 전/실패 시 사용.
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

const synthFallback: Record<SfxName, (c: AudioContext) => void> = {
  // 고양이 선택 — 짧고 통통 튀는 팝
  tap: (c) => {
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
  },
  // 3매치 완성 — 반짝이는 3음 코드
  match: (c) => {
    const now = c.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) =>
      tone(f, now + i * 0.06, 0.24, { type: 'triangle', peak: 0.11 }),
    );
  },
  // 스테이지 클리어 — 상승 아르페지오 팡파르
  win: (c) => {
    const now = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, now + i * 0.12, 0.42, { type: 'sine', peak: 0.13, attack: 0.03 }),
    );
  },
  // 게임 오버 — 아래로 처지는 슬픈 진행
  lose: (c) => {
    const now = c.currentTime;
    [392.0, 349.23, 311.13, 261.63].forEach((f, i) =>
      tone(f, now + i * 0.17, 0.42, { type: 'triangle', peak: 0.09 }),
    );
  },
};

function playSfx(name: SfxName) {
  const vol = store.settings.sfxVol;
  if (muted || vol <= 0) return;
  const c = getCtx();
  if (!c) return;
  try {
    const buf = sfxBuffers[name];
    if (buf) {
      // 버퍼 소스는 매번 새로 만들어 연타·겹침 재생이 자연스럽게 된다.
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.value = vol; // 설정 효과음 볼륨 반영
      src.connect(gain);
      gain.connect(c.destination);
      src.start();
    } else {
      synthFallback[name](c); // 아직 로드 전이거나 로드 실패 → 합성음
    }
  } catch {
    /* 재생 실패는 조용히 무시 */
  }
}

export const sfx = {
  tap: () => playSfx('tap'),
  match: () => playSfx('match'),
  win: () => playSfx('win'),
  lose: () => playSfx('lose'),
};

// ---- 배경음악 (BGM) --------------------------------------------------------
// 파일(bgm/BGM.mp3)이 로드되면 그걸 루프 재생하고, 아직/실패면 절차 생성 폴백.
const SCALE = [261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63]; // C-E-G-A-C-A-G-E
const NOTE_DUR = 0.9;
const LOOP_DUR = SCALE.length * NOTE_DUR;

let bgmGain: GainNode | null = null;
let bgmPlaying = false;
let bgmSource: AudioBufferSourceNode | null = null; // 파일 루프 모드
let bgmTimer = 0; // 절차 생성(폴백) 모드 스케줄러
let bgmLoadFailed = false; // 파일 로드 실패 시에만 합성음 폴백 사용

function ensureBgmGain(c: AudioContext): GainNode {
  if (!bgmGain) {
    bgmGain = c.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(c.destination);
  }
  return bgmGain;
}

// 파일 루프 재생 시작
function startBgmFile(c: AudioContext) {
  if (!bgmBuffer) return;
  const g = ensureBgmGain(c);
  bgmSource = c.createBufferSource();
  bgmSource.buffer = bgmBuffer;
  bgmSource.loop = true;
  bgmSource.connect(g);
  bgmSource.start();
}

// 절차 생성 폴백 — 잔잔한 아르페지오 루프
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
    if (muted || store.settings.bgmVol <= 0) return;
    const c = getCtx();
    if (!c) return;
    const g = ensureBgmGain(c);
    if (bgmPlaying) return;
    bgmPlaying = true;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.linearRampToValueAtTime(store.settings.bgmVol, c.currentTime + 1.2); // 설정 볼륨으로 페이드인
    if (bgmBuffer) startBgmFile(c);
    else if (bgmLoadFailed) scheduleBgmIteration(); // 파일 로드 실패 확정 시에만 폴백
    // 아직 로딩 중이면 여기선 아무것도 안 함 — 로드 콜백이 파일/폴백을 시작한다.
  },
  /** 설정 슬라이더용 — 재생 중이면 즉시 볼륨 반영, 0 이면 정지 / 0→양수면 시작. */
  setVolume(v: number) {
    if (v <= 0) {
      bgm.stop();
      return;
    }
    if (!bgmPlaying) {
      bgm.start();
      return;
    }
    const c = getCtx();
    if (c && bgmGain) {
      bgmGain.gain.cancelScheduledValues(c.currentTime);
      bgmGain.gain.setValueAtTime(bgmGain.gain.value, c.currentTime);
      bgmGain.gain.linearRampToValueAtTime(v, c.currentTime + 0.1);
    }
  },
  stop() {
    bgmPlaying = false;
    clearTimeout(bgmTimer);
    if (bgmSource) {
      try {
        bgmSource.stop();
      } catch {
        /* 이미 정지됨 */
      }
      bgmSource.disconnect();
      bgmSource = null;
    }
    if (ctx && bgmGain) {
      bgmGain.gain.cancelScheduledValues(ctx.currentTime);
      bgmGain.gain.setValueAtTime(bgmGain.gain.value, ctx.currentTime);
      bgmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); // 페이드아웃
    }
  },
  isPlaying: () => bgmPlaying,
};
