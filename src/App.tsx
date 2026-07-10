import { useState, useEffect } from "react";
import { Tile, GameState } from "./types";
import { CatSVG, TILE_TYPES } from "./components/CatSVG";
import {
  playClick,
  playMeow,
  playMatch,
  playWin,
  playLose,
  toggleMute,
  getMuteState,
} from "./utils/audio";
import {
  RotateCcw,
  Shuffle,
  ArrowUpFromLine,
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  Sparkles,
  Zap,
  RotateCw,
  Cat,
} from "lucide-react";
import "./App.css";

// Check if two tiles overlap on the 2D plane
const isOverlapping = (t1: Tile, t2: Tile): boolean => {
  // Tile dimension is abstractly 1.6 units to allow nice offset-layer structures.
  // Standard tile width/height is 1.6 grid units.
  return Math.abs(t1.gridX - t2.gridX) < 1.4 && Math.abs(t1.gridY - t2.gridY) < 1.4;
};

// Calculate and update the blocked status of all tiles
const updateBlockedTiles = (tiles: Tile[]): Tile[] => {
  return tiles.map((tile) => {
    // A tile is blocked if there's any other tile on a strictly higher layer that overlaps with it
    const isBlocked = tiles.some(
      (other) =>
        other.id !== tile.id &&
        other.layer > tile.layer &&
        isOverlapping(tile, other)
    );
    return { ...tile, isBlocked };
  });
};

// Level design configuration generator
const generateLevelTiles = (level: number): Tile[] => {
  // Level scaling:
  // Level 1: 6 trios (18 tiles), 4 cat types
  // Level 2: 12 trios (36 tiles), 6 cat types
  // Level 3: 18 trios (54 tiles), 8 cat types
  // Level 4+: 24 trios (72 tiles), 12 cat types
  const numTrios = Math.min(6 + (level - 1) * 6, 24);
  const numTypes = Math.min(4 + (level - 1) * 2, 12);

  // Active pool of types
  const activeTypes = Array.from({ length: numTypes }, (_, i) => i);

  // Create a balanced pool (multiples of 3)
  const pool: number[] = [];
  let trioCount = 0;
  while (trioCount < numTrios) {
    const typeId = activeTypes[trioCount % activeTypes.length];
    pool.push(typeId, typeId, typeId);
    trioCount++;
  }

  // Shuffle the pool using Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Generate layer placements
  const positions: { layer: number; gridX: number; gridY: number }[] = [];
  const maxLayer = Math.min(2 + Math.floor(level / 2), 5); // 3 to 5 layers

  // Center coordinates are roughly gridX = 4, gridY = 4
  for (let layer = 0; layer < maxLayer; layer++) {
    const offset = (layer % 2) * 0.4; // alternating offset creates half-overlap patterns
    const inset = layer * 0.4; // pyramiding inward slightly

    // Coordinates range from 0.8 to 7.2
    const minX = 1 + inset;
    const maxX = 7.5 - inset;
    const minY = 1 + inset;
    const maxY = 7.5 - inset;

    for (let gx = minX; gx <= maxX; gx += 1.2) {
      for (let gy = minY; gy <= maxY; gy += 1.2) {
        // Create custom level shapes
        if (level === 1) {
          // Simple small circular heart shape on layer 0 & 1
          const dist = Math.hypot(gx + offset - 4, gy + offset - 4);
          if (dist > 2.2) continue;
        } else if (level === 2) {
          // Cross-shape
          const dx = Math.abs(gx + offset - 4);
          const dy = Math.abs(gy + offset - 4);
          if (dx > 2.5 && dy > 2.5) continue;
        } else if (level === 3) {
          // Diamond layout
          const dist = Math.abs(gx + offset - 4) + Math.abs(gy + offset - 4);
          if (dist > 4.2) continue;
        }

        positions.push({
          layer,
          gridX: gx + offset,
          gridY: gy + offset,
        });
      }
    }
  }

  // If we don't have enough positions, generate additional random safe slots
  while (positions.length < pool.length) {
    const layer = Math.floor(Math.random() * maxLayer);
    const offset = (layer % 2) * 0.4;
    const gridX = Math.floor(Math.random() * 5) + 1.5 + offset;
    const gridY = Math.floor(Math.random() * 5) + 1.5 + offset;

    if (!positions.some((p) => p.layer === layer && Math.abs(p.gridX - gridX) < 0.2 && Math.abs(p.gridY - gridY) < 0.2)) {
      positions.push({ layer, gridX, gridY });
    }
  }

  // Use only needed positions, sorted by layer so lower layers render and stack first
  const chosenPositions = positions.slice(0, pool.length);
  chosenPositions.sort((a, b) => a.layer - b.layer);

  const tiles: Tile[] = chosenPositions.map((pos, idx) => ({
    id: `tile-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    typeId: pool[idx],
    layer: pos.layer,
    gridX: pos.gridX,
    gridY: pos.gridY,
    isBlocked: false,
  }));

  return updateBlockedTiles(tiles);
};

function App() {
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem("cattrio_highscore");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [boardTiles, setBoardTiles] = useState<Tile[]>([]);
  const [slots, setSlots] = useState<Tile[]>([]);
  const [holdShelf, setHoldShelf] = useState<Tile[]>([]); // "Clear Slots" temporary drawer

  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);
  const [isMuted, setIsMutedState] = useState<boolean>(getMuteState());
  const [showHelp, setShowHelp] = useState<boolean>(true);

  // Power-up counts
  const [powerups, setPowerups] = useState({
    undo: 1,
    shuffle: 2,
    clearSlots: 1,
  });

  // History stack for the Undo powerup
  const [history, setHistory] = useState<{ board: Tile[]; slots: Tile[]; hold: Tile[] }[]>([]);

  // Initialize Level
  useEffect(() => {
    initLevel(level);
  }, [level]);

  const initLevel = (lvl: number) => {
    const tiles = generateLevelTiles(lvl);
    setBoardTiles(tiles);
    setSlots([]);
    setHoldShelf([]);
    setHistory([]);
    setIsGameOver(false);
    setIsGameWon(false);
    // Reset powerups per level (grant 1 extra shuffle per level)
    setPowerups({
      undo: 1 + Math.floor(lvl / 3),
      shuffle: 2 + Math.floor(lvl / 2),
      clearSlots: 1 + Math.floor(lvl / 4),
    });
  };

  const handleMuteToggle = () => {
    const muted = toggleMute();
    setIsMutedState(muted);
  };

  // Click on a tile from the layered board
  const handleTileClick = (clickedTile: Tile) => {
    if (clickedTile.isBlocked || isGameOver || isGameWon) return;

    playClick();

    // 1. Save history for Undo
    setHistory((prev) => [
      ...prev,
      {
        board: [...boardTiles],
        slots: [...slots],
        hold: [...holdShelf],
      },
    ]);

    // 2. Remove tile from board
    const nextBoard = boardTiles.filter((t) => t.id !== clickedTile.id);

    // 3. Add to slots and sort by typeId to group identical cats
    const updatedSlots = [...slots, clickedTile];
    
    // Sort slots so that similar typeIds group together
    const sortedSlots: Tile[] = [];
    const counts: Record<number, Tile[]> = {};
    
    updatedSlots.forEach((tile) => {
      if (!counts[tile.typeId]) counts[tile.typeId] = [];
      counts[tile.typeId].push(tile);
    });

    // Reconstruct sorted array maintaining groupings
    Object.keys(counts).forEach((key) => {
      const typeNum = parseInt(key, 10);
      sortedSlots.push(...counts[typeNum]);
    });

    // 4. Check for Match (Trio)
    let finalSlots = [...sortedSlots];
    let matchedAny = false;

    // Check each unique type to see if it has 3 matching items
    Object.keys(counts).forEach((key) => {
      const typeNum = parseInt(key, 10);
      if (counts[typeNum].length === 3) {
        // Clear these 3 tiles from slots
        finalSlots = finalSlots.filter((t) => t.typeId !== typeNum);
        matchedAny = true;
      }
    });

    if (matchedAny) {
      setTimeout(() => {
        playMatch();
        setScore((prev) => {
          const newScore = prev + 150;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("cattrio_highscore", newScore.toString());
          }
          return newScore;
        });
      }, 100);
    }

    // Update board and slots state
    const processedBoard = updateBlockedTiles(nextBoard);
    setBoardTiles(processedBoard);
    setSlots(finalSlots);

    // 5. Game End Conditions
    if (processedBoard.length === 0 && finalSlots.length === 0 && holdShelf.length === 0) {
      // WIN!
      setTimeout(() => {
        playWin();
        setIsGameWon(true);
      }, 500);
    } else if (finalSlots.length >= 7) {
      // LOSE (Deck full)
      setTimeout(() => {
        playLose();
        setIsGameOver(true);
      }, 400);
    }
  };

  // Click on a tile from the hold shelf to return it to the slots
  const handleHoldShelfClick = (tile: Tile) => {
    if (slots.length >= 7) {
      // Slots full, can't pull back from hold yet
      return;
    }

    playClick();

    // Save history for Undo
    setHistory((prev) => [
      ...prev,
      {
        board: [...boardTiles],
        slots: [...slots],
        hold: [...holdShelf],
      },
    ]);

    const nextHold = holdShelf.filter((t) => t.id !== tile.id);
    const updatedSlots = [...slots, tile];

    // Sort slots
    const sortedSlots: Tile[] = [];
    const counts: Record<number, Tile[]> = {};
    updatedSlots.forEach((t) => {
      if (!counts[t.typeId]) counts[t.typeId] = [];
      counts[t.typeId].push(t);
    });
    Object.keys(counts).forEach((key) => {
      sortedSlots.push(...counts[parseInt(key, 10)]);
    });

    let finalSlots = [...sortedSlots];
    let matchedAny = false;

    Object.keys(counts).forEach((key) => {
      const typeNum = parseInt(key, 10);
      if (counts[typeNum].length === 3) {
        finalSlots = finalSlots.filter((t) => t.typeId !== typeNum);
        matchedAny = true;
      }
    });

    if (matchedAny) {
      setTimeout(() => {
        playMatch();
        setScore((prev) => {
          const newScore = prev + 150;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("cattrio_highscore", newScore.toString());
          }
          return newScore;
        });
      }, 100);
    }

    setHoldShelf(nextHold);
    setSlots(finalSlots);

    if (boardTiles.length === 0 && finalSlots.length === 0 && nextHold.length === 0) {
      setTimeout(() => {
        playWin();
        setIsGameWon(true);
      }, 500);
    }
  };

  // POWER-UPS

  // 1. UNDO
  const handleUndo = () => {
    if (powerups.undo <= 0 || history.length === 0) return;

    playMeow();
    const previousState = history[history.length - 1];

    setBoardTiles(updateBlockedTiles(previousState.board));
    setSlots(previousState.slots);
    setHoldShelf(previousState.hold);

    setHistory((prev) => prev.slice(0, -1));
    setPowerups((prev) => ({ ...prev, undo: prev.undo - 1 }));
  };

  // 2. SHUFFLE
  const handleShuffle = () => {
    if (powerups.shuffle <= 0 || boardTiles.length === 0) return;

    playMeow();

    // Collect all typeIds from board
    const typeIds = boardTiles.map((t) => t.typeId);

    // Shuffle the typeIds
    for (let i = typeIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [typeIds[i], typeIds[j]] = [typeIds[j], typeIds[i]];
    }

    // Reassign back to tiles
    const shuffledTiles = boardTiles.map((tile, idx) => ({
      ...tile,
      typeId: typeIds[idx],
    }));

    setBoardTiles(updateBlockedTiles(shuffledTiles));
    setPowerups((prev) => ({ ...prev, shuffle: prev.shuffle - 1 }));
  };

  // 3. CLEAR SLOTS (Move 3 to hold shelf)
  const handleClearSlots = () => {
    if (powerups.clearSlots <= 0 || slots.length < 3) return;

    playMeow();

    // Save history
    setHistory((prev) => [
      ...prev,
      {
        board: [...boardTiles],
        slots: [...slots],
        hold: [...holdShelf],
      },
    ]);

    // Move first 3 tiles in slot bar to the hold shelf
    const toMove = slots.slice(0, 3);
    const remainingSlots = slots.slice(3);

    setSlots(remainingSlots);
    setHoldShelf((prev) => [...prev, ...toMove]);
    setPowerups((prev) => ({ ...prev, clearSlots: prev.clearSlots - 1 }));
  };

  const handleNextLevel = () => {
    setLevel((prev) => prev + 1);
  };

  const handleRestartGame = () => {
    setScore(0);
    setLevel(1);
    initLevel(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdfbf7] to-[#f5ebd6] text-[#4a3b32] font-sans flex flex-col items-center p-4 selection:bg-rose-200">
      {/* HEADER SECTION */}
      <header className="w-full max-w-md flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-rose-400 rounded-full flex items-center justify-center shadow-md animate-bounce">
              <Cat className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#4a3a2f] flex items-center gap-1">
                Cat <span className="text-rose-500">Trio</span>
              </h1>
              <p className="text-xs font-semibold text-amber-800 tracking-wider">TRIPLE TILE MATCH</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 bg-white hover:bg-amber-50 border-2 border-[#8c7467]/20 rounded-xl transition shadow-sm active:scale-90"
              title="How to Play"
            >
              <HelpCircle className="w-5 h-5 text-amber-900" />
            </button>
            <button
              onClick={handleMuteToggle}
              className="p-2 bg-white hover:bg-amber-50 border-2 border-[#8c7467]/20 rounded-xl transition shadow-sm active:scale-90"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-rose-500 animate-pulse" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-600" />
              )}
            </button>
          </div>
        </div>

        {/* STATUS BAR (Score, level, high score) */}
        <div className="bg-white/80 backdrop-blur border-2 border-amber-900/10 rounded-2xl p-3 flex justify-between items-center shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-amber-800/60 uppercase">Score</span>
            <span className="text-lg font-extrabold text-[#4a3b32]">{score}</span>
          </div>

          <div className="px-4 py-1 bg-rose-100 rounded-full text-center border border-rose-200">
            <span className="text-xs font-bold text-rose-700 uppercase">LVL</span>
            <span className="text-lg font-black ml-1 text-rose-800">{level}</span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-amber-800/60 uppercase flex items-center gap-1 justify-end">
              <Trophy className="w-3 h-3 text-amber-500" /> Best
            </span>
            <span className="text-lg font-extrabold text-[#4a3b32]">{highScore}</span>
          </div>
        </div>
      </header>

      {/* CORE GAMEPLAY CONTAINER */}
      <main className="w-full max-w-md flex flex-col items-center flex-1 justify-center gap-4">
        
        {/* TILE BOARD AREA */}
        <div className="relative w-full aspect-square bg-[#f0e3ce] border-4 border-[#a18276] rounded-[2rem] p-4 shadow-inner overflow-hidden flex items-center justify-center">
          {/* Paw grid watermark inside background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none flex flex-wrap gap-10 items-center justify-center p-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <Cat key={i} className="w-16 h-16" />
            ))}
          </div>

          {boardTiles.length === 0 && !isGameWon && (
            <div className="text-center z-10 p-4">
              <p className="text-amber-800 font-bold animate-pulse text-sm">Generating sweet kittens...</p>
            </div>
          )}

          {/* Layered Tiles */}
          <div className="relative w-full h-full">
            {boardTiles.map((tile) => {
              const leftPercent = tile.gridX * 11;
              const topPercent = tile.gridY * 11;
              const typeMeta = TILE_TYPES[tile.typeId] || TILE_TYPES[0];

              return (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  disabled={tile.isBlocked}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    zIndex: tile.layer * 10 + 2,
                  }}
                  className={`absolute w-12 h-12 rounded-xl border-2 shadow-md flex items-center justify-center transition-all duration-300 transform select-none
                    ${typeMeta.bgColor}
                    ${
                      tile.isBlocked
                        ? "brightness-75 saturate-75 opacity-90 cursor-not-allowed border-stone-400 translate-y-0.5"
                        : "hover:-translate-y-1 hover:shadow-lg cursor-pointer active:scale-95 active:translate-y-0"
                    }
                  `}
                >
                  {/* Visual thickness depth layer for 3D effect */}
                  <div
                    className={`absolute inset-x-0 bottom-[-4px] h-1 rounded-b-xl opacity-40 ${
                      tile.isBlocked ? "bg-stone-500" : "bg-[#8c7467]"
                    }`}
                  />
                  {/* The actual adorable cat SVG face */}
                  <div className="w-10 h-10 p-0.5 relative z-10">
                    <CatSVG typeId={tile.typeId} />
                  </div>
                  {/* Subtle lock padlock icon or block indicator if blocked */}
                  {tile.isBlocked && (
                    <div className="absolute inset-0 bg-stone-900/10 rounded-xl" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TEMPORARY HOLD DRAWER (Power-up Shelf) */}
        {holdShelf.length > 0 && (
          <div className="w-full bg-[#dfd0bd]/60 border-2 border-dashed border-[#8c7467]/30 rounded-2xl p-2 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-amber-900/60 tracking-wider">
              Temporary Cozy Hold (Tap to return)
            </span>
            <div className="flex gap-2">
              {holdShelf.map((tile) => {
                const typeMeta = TILE_TYPES[tile.typeId] || TILE_TYPES[0];
                return (
                  <button
                    key={tile.id}
                    onClick={() => handleHoldShelfClick(tile)}
                    className={`w-12 h-12 rounded-xl border-2 ${typeMeta.bgColor} flex items-center justify-center shadow transition hover:-translate-y-0.5 active:scale-95`}
                  >
                    <div className="w-10 h-10 p-0.5">
                      <CatSVG typeId={tile.typeId} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTTOM DECK SLOTS (Holds up to 7 tiles) */}
        <div className="w-full flex flex-col gap-1.5 items-center">
          <div className="w-full bg-[#eddcb9] border-2 border-[#bc9a70] rounded-2xl p-3 shadow-inner">
            <div className="grid grid-cols-7 gap-1 w-full justify-items-center relative min-h-[52px]">
              {/* Slot Background Slots (visual frames) */}
              {Array.from({ length: 7 }).map((_, idx) => (
                <div
                  key={`bg-slot-${idx}`}
                  className="w-11 h-11 rounded-lg border-2 border-dashed border-[#bc9a70]/40 flex items-center justify-center bg-[#fdfaf2]/40"
                />
              ))}

              {/* Slided Active Tiles in Slots */}
              <div className="absolute inset-x-0 top-0 bottom-0 flex gap-1 px-3 items-center justify-start pointer-events-none">
                {slots.map((tile, idx) => {
                  const typeMeta = TILE_TYPES[tile.typeId] || TILE_TYPES[0];
                  return (
                    <div
                      key={`slot-${tile.id}-${idx}`}
                      className={`w-11 h-11 rounded-lg border-2 ${typeMeta.bgColor} flex items-center justify-center shadow transition-all duration-300 scale-95 pointer-events-auto`}
                    >
                      <div className="w-9 h-9 p-0.5">
                        <CatSVG typeId={tile.typeId} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-900/60 uppercase tracking-wider">
            Slot bar ({slots.length}/7) — Don't let it fill up!
          </span>
        </div>

        {/* POWER-UPS BOARD */}
        <div className="w-full grid grid-cols-3 gap-2.5">
          <button
            onClick={handleUndo}
            disabled={powerups.undo <= 0 || history.length === 0}
            className="flex flex-col items-center gap-1 p-2 bg-white hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-white border-2 border-[#8c7467]/10 rounded-2xl shadow-sm transition active:scale-95"
          >
            <div className="flex items-center gap-1">
              <RotateCcw className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-black">Undo</span>
            </div>
            <div className="flex items-center text-[10px] font-extrabold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
              <Zap className="w-2.5 h-2.5 mr-0.5 fill-orange-500 stroke-none" />
              {powerups.undo}
            </div>
          </button>

          <button
            onClick={handleShuffle}
            disabled={powerups.shuffle <= 0 || boardTiles.length === 0}
            className="flex flex-col items-center gap-1 p-2 bg-white hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-white border-2 border-[#8c7467]/10 rounded-2xl shadow-sm transition active:scale-95"
          >
            <div className="flex items-center gap-1">
              <Shuffle className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-black">Shuffle</span>
            </div>
            <div className="flex items-center text-[10px] font-extrabold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full">
              <Zap className="w-2.5 h-2.5 mr-0.5 fill-sky-500 stroke-none" />
              {powerups.shuffle}
            </div>
          </button>

          <button
            onClick={handleClearSlots}
            disabled={powerups.clearSlots <= 0 || slots.length < 3}
            className="flex flex-col items-center gap-1 p-2 bg-white hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-white border-2 border-[#8c7467]/10 rounded-2xl shadow-sm transition active:scale-95"
          >
            <div className="flex items-center gap-1">
              <ArrowUpFromLine className="w-4 h-4 text-pink-600" />
              <span className="text-xs font-black">Hold 3</span>
            </div>
            <div className="flex items-center text-[10px] font-extrabold px-2 py-0.5 bg-pink-100 text-pink-800 rounded-full">
              <Zap className="w-2.5 h-2.5 mr-0.5 fill-pink-500 stroke-none" />
              {powerups.clearSlots}
            </div>
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-4 text-center text-xs font-semibold text-amber-900/50">
        Agent8 Game Studio &copy; {new Date().getFullYear()} • Cat Trio
      </footer>

      {/* MODAL: TUTORIAL / HELP */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fefcf8] border-4 border-[#8c7467] rounded-[2rem] max-w-sm w-full p-6 text-center shadow-2xl relative">
            <div className="w-14 h-14 bg-rose-400 rounded-full flex items-center justify-center shadow-md mx-auto mb-3">
              <Cat className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-[#4a3b32] mb-1">How to play Cat Trio</h2>
            <p className="text-xs text-rose-500 font-extrabold uppercase tracking-wider mb-4">Cute & Fun Puzzle Guide</p>
            
            <div className="space-y-3.5 text-left text-sm font-medium mb-6">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-900 text-xs shrink-0 mt-0.5">1</div>
                <p className="text-stone-600 leading-tight">
                  Tap any <strong className="text-amber-900">bright, unblocked</strong> cat tile to send it down to the slots.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-900 text-xs shrink-0 mt-0.5">2</div>
                <p className="text-stone-600 leading-tight">
                  Get <strong className="text-rose-600">3 cats of the same breed</strong> in the slot bar to match and clear them as a <strong className="text-rose-600">Trio</strong>!
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-900 text-xs shrink-0 mt-0.5">3</div>
                <p className="text-stone-600 leading-tight">
                  Don't let the slot bar fill up with <strong className="text-red-500">7 tiles</strong> without making matches, or you lose!
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-900 text-xs shrink-0 mt-0.5">4</div>
                <p className="text-stone-600 leading-tight">
                  Use your magic powerups like <strong className="text-sky-600">Shuffle</strong>, <strong className="text-orange-600">Undo</strong>, and <strong className="text-pink-600">Hold 3</strong> to save you from sticky situations.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowHelp(false);
                playMeow();
              }}
              className="w-full bg-[#8c7467] text-white font-extrabold py-3 rounded-2xl hover:bg-[#725e53] transition shadow-md active:scale-95"
            >
              Let's Match Cats!
            </button>
          </div>
        </div>
      )}

      {/* MODAL: LEVEL CLEARED */}
      {isGameWon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fefcf8] border-4 border-emerald-500 rounded-[2rem] max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-emerald-100 rounded-full opacity-50" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-100 rounded-full opacity-50" />

            <div className="w-16 h-14 bg-emerald-400 rounded-full flex items-center justify-center shadow-md mx-auto mb-3">
              <Sparkles className="text-white w-8 h-8 animate-spin" />
            </div>
            
            <h2 className="text-3xl font-black text-emerald-800 mb-1">Level Cleared!</h2>
            <p className="text-xs text-rose-500 font-extrabold uppercase tracking-wider mb-4">Purr-fect Performance!</p>

            <p className="text-stone-600 font-bold mb-6 text-sm">
              You matched all trios and saved the kittens! Proceed to the next, even more challenging level!
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleRestartGame}
                className="w-1/3 border-2 border-[#8c7467]/30 hover:bg-stone-50 font-bold py-3 rounded-2xl transition active:scale-95 text-stone-500 flex items-center justify-center gap-1"
                title="Restart from Level 1"
              >
                <RotateCw className="w-4 h-4" /> Reset
              </button>
              <button
                onClick={() => {
                  handleNextLevel();
                  playMeow();
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-2xl transition shadow-md active:scale-95"
              >
                Level {level + 1} &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GAME OVER */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fefcf8] border-4 border-rose-500 rounded-[2rem] max-w-sm w-full p-6 text-center shadow-2xl relative">
            <div className="w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center shadow-md mx-auto mb-3">
              <VolumeX className="text-white w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-rose-800 mb-1">No More Moves!</h2>
            <p className="text-xs text-amber-800 font-extrabold uppercase tracking-wider mb-4">The basket is full of kittens!</p>

            <p className="text-stone-600 font-bold mb-6 text-sm">
              Don't worry, even cute cats slip up sometimes! Clean up and try again!
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  initLevel(level);
                  playMeow();
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3 rounded-2xl transition shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCw className="w-5 h-5" /> Retry Level {level}
              </button>
              <button
                onClick={handleRestartGame}
                className="w-1/3 border-2 border-stone-300 hover:bg-stone-50 text-stone-500 font-bold py-3 rounded-2xl transition active:scale-95"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
