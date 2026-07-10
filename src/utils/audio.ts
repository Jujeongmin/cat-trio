let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const toggleMute = (): boolean => {
  isMuted = !isMuted;
  return isMuted;
};

export const getMuteState = (): boolean => {
  return isMuted;
};

// Simple bubbly pop when a tile is clicked
export const playClick = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.warn("Audio click playback failed", e);
  }
};

// Adorable synthetic cat "Meow" sound using a frequency-swept triangle wave and bandpass filter
export const playMeow = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";

    const now = ctx.currentTime;
    // Meow vocal frequency sweep: starts mid, sweeps up to head voice, then slides down to tail
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.quadraticCurveToValueAtTime(520, now + 0.12, 380, now + 0.38);

    // Formant filter (nasal quality of a cat meow)
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.38);
    filter.Q.setValueAtTime(2.5, now);

    // Gain envelope (Attack, Decay, Sustain, Release)
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.06); // quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.22); // gradual decay
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.40); // release

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.40);
  } catch (e) {
    console.warn("Audio meow playback failed", e);
  }
};

// Sparkly major chime when 3 tiles are matched
export const playMatch = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gainNode.gain.setValueAtTime(0.001, now + idx * 0.06);
      gainNode.gain.linearRampToValueAtTime(0.1, now + idx * 0.06 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.22);
    });
  } catch (e) {
    console.warn("Audio match playback failed", e);
  }
};

// Uplifting major arpeggio fanfare for clearing a level
export const playWin = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // C5, E5, G5, C6 (C major arpeggio finishing strong)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gainNode.gain.setValueAtTime(0.001, now + idx * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.4);
    });
  } catch (e) {
    console.warn("Audio win playback failed", e);
  }
};

// Melancholic descending minor slide when the game is lost
export const playLose = () => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4 (sad minor descend)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      if (idx === notes.length - 1) {
        osc.frequency.exponentialRampToValueAtTime(150, now + idx * 0.18 + 0.4);
      }

      gainNode.gain.setValueAtTime(0.001, now + idx * 0.18);
      gainNode.gain.linearRampToValueAtTime(0.1, now + idx * 0.18 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.45);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.45);
    });
  } catch (e) {
    console.warn("Audio lose playback failed", e);
  }
};
