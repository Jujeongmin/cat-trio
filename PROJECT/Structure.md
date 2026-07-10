# Structure — Cat Trio

## Key Files

### `server/src/server.ts`
TypeScript-based game server code containing:
- `submitStageRecord(bestStage, nickname)`: Validates and persists high-stage records per user account under the `"rankings"` collection. Ensures old records are cleared to avoid duplication, and supports nickname updates.
- `getTopRankings()`: Queries the `"rankings"` collection, sorting entries by `bestStage` in descending order, returning the top 20 rankings.
- `getMyBestRank()`: Computes the player's personal rank by counting how many other players completed strictly higher stages.

### `server/test/server.test.ts`
Full test suite verifying the server's record submission, preventing record downgrades, and verifying correct ranking math.

### `game/src/server.ts`
Initializes a client-side singleton of the `GameServer` instance and exports async helpers to connect to the backend server dynamically.

### `game/src/screens.ts`
Contains UI layout engines. Updated to:
- Render a 🏆 **Leaderboard button** in the top bar of the Stage Select card page.
- Render a **showRanking Dialog** displaying the Top 20 ranking rows, custom badges for 🥇/🥈/🥉, highlighting the player's own rank, and offering an interactive text input to modify nicknames (with full length and presence validation).

### `game/src/i18n.ts`
Multi-language translations. Updated with Korean and English localization strings for the entire ranking modal and errors.

### `game/src/main.ts`
Vite entry point for vanilla TS. Updated to trigger background server connections at boot and instantly upload cleared stages in the background upon winning a level.
