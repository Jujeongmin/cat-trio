import { GameServer } from '@agent8/gameserver';

let serverInstance: GameServer | null = null;

export function getGameServer(): GameServer {
  if (!serverInstance) {
    serverInstance = GameServer.getInstance();
  }
  return serverInstance;
}

export async function connectGameServer(): Promise<GameServer> {
  const s = getGameServer();
  if (!s.connected) {
    try {
      await s.connect();
    } catch (e) {
      console.warn('GameServer connection failed, will retry.', e);
    }
  }
  return s;
}
