import { GameServer } from '@agent8/gameserver';

let serverInstance: GameServer | null = null;

// 진행 중인 연결 시도를 공유해 중복 connect() 를 막는다.
let connectPromise: Promise<unknown> | null = null;

// 연결이 영영 안 끝나도 호출부가 멈추지 않도록 하는 최대 대기 시간(ms).
const CONNECT_TIMEOUT_MS = 5000;

export function getGameServer(): GameServer {
  if (!serverInstance) {
    serverInstance = GameServer.getInstance();
  }
  return serverInstance;
}

/**
 * 게임 서버 연결. connect() 가 영영 resolve/reject 하지 않는 경우에도
 * 최대 CONNECT_TIMEOUT_MS 후 반환되어(연결 실패 상태) 호출부가 무한 대기하지
 * 않는다 — 랭킹 모달 무한 로딩 방지. 여러 호출은 하나의 연결 시도를 공유한다.
 */
export async function connectGameServer(): Promise<GameServer> {
  const s = getGameServer();
  if (!s.connected) {
    if (!connectPromise) {
      connectPromise = s
        .connect()
        .catch((e) => {
          console.warn('GameServer connection failed, will retry.', e);
        })
        .finally(() => {
          connectPromise = null;
        });
    }
    await Promise.race([
      connectPromise,
      new Promise((resolve) => setTimeout(resolve, CONNECT_TIMEOUT_MS)),
    ]);
  }
  return s;
}
