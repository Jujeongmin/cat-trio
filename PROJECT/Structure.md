# Structure — Cat Trio

## Key Files

### `src/main.tsx`
Vite entry point. Mounts the root `<App />` component into the DOM.

### `src/types.ts`
Holds the schema and TypeScript interfaces for the tiles, slot status, and game states (e.g., `Tile`, `GameState`, `TileType`).

### `src/components/CatSVG.tsx`
Contains the SVG renderer definitions for the 12 cute kitten faces and items (Siamese, Orange tabby, Calico, Grey, Black, White fluff, Scottish fold, Sphynx, Fish bone, Milk carton, Yarn ball, Lucky paw). Also exports metadata containing theme colors and Tailwind borders.

### `src/utils/audio.ts`
Uses the Web Audio API to procedurally generate all game sounds:
- `playClick()`: Bubble pop click.
- `playMeow()`: Real-time frequency sweep nasal bandpass cat meow.
- `playMatch()`: Sweet, sparkling major chimes.
- `playWin()`: Ascending C-Major chord arpeggio victory fanfare.
- `playLose()`: Melancholic minor-descending sad slide.

### `src/App.tsx`
Central controller containing the level generation algorithm, collision overlap checking, game loop triggers, slot deck management, power-up state transitions (Undo, Shuffle, Hold Drawer), and UI layouts (modals for tutorial, win, and lose).

### `src/App.css`
App-level stylesheet with root rules, background settings, and pop-in keyframe animations.
