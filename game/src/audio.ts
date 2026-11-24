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
  // PixelLab 효과음 (2026-11-24). 파일명 _v2: 같은 경로 교체는 CDN 캐시가 옛 파일을 준다.
  tap: 'sfx/tap_v2.mp3',
  match: 'sfx/match_v2.mp3',
  win: 'sfx/win_v2.mp3',
  lose: 'sfx/lose_v2.mp3',
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
  void decodeAudio(soundUrl(BGM_FILE)).then((b) => {
    const c = getCtx();
    if (b) {
      bgmBuffer = b;
      // BGM 이 켜진 상태로 파일 로드를 기다리고 있었으면 지금 파일 루프 시작.
      // (합성음 폴백이 돌고 있었다면 그걸 끄고 파일로 전환)
      if (bgmPlaying && !bgmSource && c) startBgmFile(c);
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
// 합성음(오실레이터) 폴백은 쓰지 않는다 — 파일이 아직 안 받아졌으면 그 소리는 건너뛴다.

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
// PixelLab 곡 "Cat Trio cafe theme (loop)" 의 루프 구간(53.847~117.110s)만 모노로 잘라 둔 파일.
// 63초 모노 ≈ 디코드 후 12MB. 파일 앞뒤 0.5초는 MP3 여백 대비 패딩 — 루프 지점은 그 안쪽.
// 합성음 폴백은 없다.
const BGM_FILE = 'bgm/cafe_loop_v2.mp3';
const BGM_LOOP = { start: 0.5, end: 0.5 + (117.11 - 53.847) };

let bgmGain: GainNode | null = null;
let bgmPlaying = false;
let bgmSource: AudioBufferSourceNode | null = null; // 파일 루프 모드

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
  bgmSource.loopStart = BGM_LOOP.start;
  bgmSource.loopEnd = Math.min(BGM_LOOP.end, bgmBuffer.duration);
  bgmSource.connect(g);
  bgmSource.start();
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
    if (bgmBuffer) startBgmFile(c); // 로딩 중이면 로드 콜백이 시작한다
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
