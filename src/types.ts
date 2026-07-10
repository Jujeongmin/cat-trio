export interface Tile {
  id: string;
  typeId: number;
  layer: number;
  gridX: number; // Position on a fine coordinate system (e.g., unit size = 32px or 40px)
  gridY: number;
  isBlocked: boolean; // True if another active tile in a higher layer overlaps this tile
}

export type TileType = {
  id: number;
  name: string;
  color: string;
  bgColor: string;
};

export interface GameState {
  score: number;
  highScore: number;
  level: number;
  boardTiles: Tile[];
  slots: Tile[];
  isGameOver: boolean;
  isGameWon: boolean;
  undoStack: Tile[][]; // For undo power-up
  powerups: {
    undo: number;
    shuffle: number;
    clearSlots: number; // Clear 3 tiles from slots to a temporary hold
  };
}
