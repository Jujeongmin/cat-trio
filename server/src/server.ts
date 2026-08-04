/**
 * Agent8 GameServer - Cat Trio Leaderboard and Data Persistence
 */

// 보상형 광고 지급 금액(서버 권위) — placementId 별 고정 보상.
// 0 은 "검증만 하고 금액은 클라이언트가 계산하는 변동 보상"을 뜻한다(예: 스테이지 2배).
// free-coins 는 클라이언트 FREE_AD_COINS 와 값을 맞춰 유지한다.
const AD_REWARD_TABLE: Record<string, number> = {
  'free-coins': 300,
  'double-stage-coins': 0,
};

// VX 상점 코인 상품(서버 감사용). 대시보드 productId 와 metadata coins 를 맞춰 유지.
// 실제 코인 지급은 결제 완료 시 클라이언트가 상품 metadata 로 하고, 여기선 감사 기록만 남긴다.
const VX_COIN_PRODUCTS: Record<string, number> = {
  coins_1000: 1000,
  coins_5000: 5000,
  coins_12000: 12000,
};

export class Server {
  async ping(): Promise<string> {
    return 'pong';
  }

  /**
   * VX 상점 결제 완료 콜백 (docs: /docs/vxshop). 플랫폼이 결제 성공 시 호출한다.
   * 감사 기록만 남긴다 — 코인 지급은 클라이언트가 상품 metadata 로 처리.
   * (분쟁/정산 대비 구매 로그 확보용. 알 수 없는 상품은 조용히 무시.)
   */
  async $onItemPurchased(payload: {
    account: string;
    productId: string;
    quantity?: number;
  }): Promise<void> {
    const { account, productId } = payload || ({} as any);
    if (!account || !productId) return;
    const qty = payload.quantity ?? 1;
    const coins = (VX_COIN_PRODUCTS[productId] ?? 0) * qty;
    try {
      await $global.addCollectionItem('vx_purchases', {
        account,
        productId,
        quantity: qty,
        coins,
        createdAt: Date.now(),
      });
    } catch {
      /* 감사 기록 실패는 결제 흐름에 영향 주지 않도록 무시 */
    }
  }

  /**
   * 보상형 광고 검증 후 보상 승인. (docs: /docs/ads/server-verification)
   * - Verse8 광고 검증서버에 requestId 상태를 조회해 verified 일 때만 승인.
   * - (account, requestId) 중복 지급(재생 공격) 방지.
   * - 반환: { granted, amount }. amount 0 은 변동 보상(클라 금액 사용).
   */
  async redeemAdReward(
    requestId: string,
    placementId: string,
  ): Promise<{ granted: boolean; amount: number; reason?: string }> {
    if (typeof requestId !== 'string' || !requestId) {
      throw new Error('Invalid requestId');
    }
    if (!(placementId in AD_REWARD_TABLE)) {
      return { granted: false, amount: 0, reason: 'unknown_placement' };
    }

    // 재생 방지: 같은 (account, requestId) 가 이미 지급됐으면 거부
    const existing = await $global.getCollectionItems('ad_redemptions', {
      filters: [
        { field: 'account', operator: '==', value: $sender.account },
        { field: 'requestId', operator: '==', value: requestId },
      ],
    });
    if (existing.length > 0) {
      return { granted: false, amount: 0, reason: 'already_redeemed' };
    }

    // Verse8 광고 검증서버 조회 (pending 이면 짧게 재시도)
    // fetch/setTimeout 은 런타임 전역을 사용 (server tsconfig lib 에 DOM/Node 타입이 없어 캐스팅)
    const g = globalThis as any;
    let status = 'failed';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await g.fetch(
          `https://ads-verifier.verse8.io/ads/status?requestId=${encodeURIComponent(requestId)}`,
        );
        const body = await res.json();
        status = body?.status ?? 'failed';
      } catch {
        return { granted: false, amount: 0, reason: 'verify_error' };
      }
      if (status !== 'pending') break;
      await new Promise<void>((resolve) => g.setTimeout(resolve, 1000));
    }

    if (status !== 'verified') {
      // dismissed / failed / pending → 지급 안 함
      return { granted: false, amount: 0, reason: status };
    }

    // 검증 성공 → 재생방지 기록 후 서버측 보상 금액 반환
    await $global.addCollectionItem('ad_redemptions', {
      account: $sender.account,
      requestId,
      placementId,
      createdAt: Date.now(),
    });
    return { granted: true, amount: AD_REWARD_TABLE[placementId] };
  }

  async getMyAccount(): Promise<string> {
    return $sender.account;
  }

  /**
   * Submits a player's highest completed stage and nickname.
   * Updates only if it's higher than their previous recorded best.
   */
  async submitStageRecord(bestStage: number, nickname: string): Promise<any> {
    if (typeof bestStage !== 'number' || bestStage < 1) {
      throw new Error('Invalid stage number');
    }
    
    const cleanNickname = (nickname || 'Cute Kitten').trim().substring(0, 15);

    // Get all current rankings for this player
    const myRankings = await $global.getCollectionItems('rankings', {
      filters: [{ field: 'account', operator: '==', value: $sender.account }]
    });

    const currentBest = myRankings.length > 0 ? myRankings[0] : null;

    if (!currentBest || bestStage > (currentBest.bestStage || 0)) {
      // Delete existing entries to guarantee only one record per user
      for (const entry of myRankings) {
        await $global.deleteCollectionItem('rankings', entry.__id);
      }

      // Record new best stage
      const entry = {
        account: $sender.account,
        nickname: cleanNickname,
        bestStage,
        updatedAt: Date.now(),
      };

      const newEntry = await $global.addCollectionItem('rankings', entry);
      return {
        updated: true,
        entry: newEntry,
        message: currentBest ? 'New best stage!' : 'First record submitted!'
      };
    } else {
      // If the nickname is updated, keep the score but change the name
      if (currentBest.nickname !== cleanNickname) {
        const updated = { ...currentBest, nickname: cleanNickname, updatedAt: Date.now() };
        await $global.updateCollectionItem('rankings', updated);
        return { updated: true, entry: updated, message: 'Nickname updated!' };
      }
      return {
        updated: false,
        entry: currentBest,
        message: 'Current record is already your best.'
      };
    }
  }

  /**
   * Retrieves the top 20 rankings sorted by highest stage.
   */
  async getTopRankings(): Promise<any[]> {
    return await $global.getCollectionItems('rankings', {
      orderBy: [{ field: 'bestStage', direction: 'desc' }],
      limit: 20,
    });
  }

  /**
   * Retrieves the current player's rank position and entry.
   */
  async getMyBestRank(): Promise<any> {
    const myRankings = await $global.getCollectionItems('rankings', {
      filters: [{ field: 'account', operator: '==', value: $sender.account }]
    });

    if (myRankings.length === 0) {
      return { bestEntry: null, rank: -1 };
    }

    const bestEntry = myRankings[0];
    const higherRankCount = await $global.countCollectionItems('rankings', {
      filters: [{ field: 'bestStage', operator: '>', value: bestEntry.bestStage }],
    });

    return {
      bestEntry,
      rank: higherRankCount + 1,
    };
  }

  /**
   * Saves the player's full progress (coins, levels, stars) securely on the server.
   */
  async saveGameData(data: any): Promise<void> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid save data');
    }
    await $global.updateMyState({ gameSave: data });
  }

  /**
   * Loads the player's full progress from the server.
   */
  async loadGameData(): Promise<any> {
    const state = await $global.getMyState();
    return state?.gameSave || null;
  }
}
