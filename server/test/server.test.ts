describe('Server Leaderboard', () => {
  test('ping returns pong', async (server) => {
    const result = await server.ping();
    expect(result).toBe('pong');
  });

  test('submitStageRecord saves and prevents downgrades', async (server) => {
    server.connect({ account: 'user-bob' });
    
    // First submission
    const res1 = await server.submitStageRecord(3, 'BobTheCat');
    expect(res1.updated).toBe(true);
    expect(res1.entry.bestStage).toBe(3);
    expect(res1.entry.nickname).toBe('BobTheCat');
    
    // Lower submission should be rejected/ignored
    const res2 = await server.submitStageRecord(2, 'BobTheCat');
    expect(res2.updated).toBe(false);
    expect(res2.entry.bestStage).toBe(3); // still 3

    // Higher submission should be accepted
    const res3 = await server.submitStageRecord(4, 'SuperBob');
    expect(res3.updated).toBe(true);
    expect(res3.entry.bestStage).toBe(4);
    expect(res3.entry.nickname).toBe('SuperBob');
  });

  test('getMyBestRank and getTopRankings calculate ranks correctly', async (server) => {
    // Alice submits Stage 5
    server.connect({ account: 'user-alice' });
    await server.submitStageRecord(5, 'AliceTheCat');

    // Bob submits Stage 3
    server.connect({ account: 'user-bob' });
    await server.submitStageRecord(3, 'BobTheCat');

    // Check Bob's rank
    const bobRank = await server.getMyBestRank();
    expect(bobRank.bestEntry.bestStage).toBe(3);
    expect(bobRank.rank).toBe(2); // Alice is 1st (5), Bob is 2nd (3)

    // Check Alice's rank
    server.connect({ account: 'user-alice' });
    const aliceRank = await server.getMyBestRank();
    expect(aliceRank.bestEntry.bestStage).toBe(5);
    expect(aliceRank.rank).toBe(1);

    // Check Top Rankings sorting
    const top = await server.getTopRankings();
    expect(top.length).toBe(2);
    expect(top[0].nickname).toBe('AliceTheCat');
    expect(top[0].bestStage).toBe(5);
    expect(top[1].nickname).toBe('BobTheCat');
    expect(top[1].bestStage).toBe(3);
  });

  test('saveGameData and loadGameData store and retrieve full save progress', async (server) => {
    server.connect({ account: 'user-charlie' });
    const fakeSave = {
      highStage: 3,
      coins: 150,
      bestStars: { 1: 3, 2: 2 },
    };
    
    await server.saveGameData(fakeSave);
    const loaded = await server.loadGameData();
    expect(loaded).toBeTruthy();
    expect(loaded.highStage).toBe(3);
    expect(loaded.coins).toBe(150);
  });
});
