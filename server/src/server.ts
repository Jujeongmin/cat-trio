/**
 * Agent8 GameServer - Cat Trio Leaderboard and Data Persistence
 */

export class Server {
  async ping(): Promise<string> {
    return 'pong';
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
}
