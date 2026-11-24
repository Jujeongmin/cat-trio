// 일시정지를 아는 `wait()`.
//
// 연출 시퀀스(`await wait(560)`)를 그냥 `setTimeout` 으로 두면, 광고가 게임을
// 접은 동안에도 타이머가 계속 흘러 판이 스스로 진행된다 — 요건 6 위반이다.
// 여기서는 남은 시간을 기억해 두고, 접히면 타이머를 끊고, 복귀할 때 남은
// 시간만큼 다시 건다. `Promise` 는 버려지지 않으므로 `await` 가 영영 안 끝나는
// 일도 없다 (복귀하면 이어서 끝난다).

interface PendingWait {
  remain: number;
  startedAt: number;
  timer: number;
  resolve: () => void;
}

const pending = new Set<PendingWait>();
let paused = false;

function arm(w: PendingWait): void {
  w.startedAt = performance.now();
  w.timer = window.setTimeout(() => {
    pending.delete(w);
    w.resolve();
  }, w.remain);
}

/** 접힌 동안에는 흐르지 않는 대기. 연출 시퀀스는 전부 이걸 쓴다. */
export function wait(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const w: PendingWait = { remain: ms, startedAt: performance.now(), timer: 0, resolve };
    pending.add(w);
    if (!paused) arm(w);
  });
}

/** 대기 중인 모든 연출을 그 자리에서 멎게 한다. */
export function pauseWaits(): void {
  if (paused) return;
  paused = true;
  for (const w of pending) {
    if (!w.timer) continue;
    clearTimeout(w.timer);
    w.timer = 0;
    w.remain = Math.max(0, w.remain - (performance.now() - w.startedAt));
  }
}

/** 남은 시간만큼 다시 걸어 이어서 끝낸다. */
export function resumeWaits(): void {
  if (!paused) return;
  paused = false;
  for (const w of pending) if (!w.timer) arm(w);
}

/** 검증용 — 지금 대기 중인 연출 수. */
export function pendingWaitCount(): number {
  return pending.size;
}
