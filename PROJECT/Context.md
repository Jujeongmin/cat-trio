# Context — Cat Trio

## Project Overview

Cat Trio is an adorable, responsive 2D triple-tile matching puzzle game built with React, Vite, and Tailwind CSS. The game takes inspiration from the layered matching genre (e.g., "Sheep-a-Sheep"). Players click on active, unblocked tiles from a layered 3D-like pyramid structure to send them to a 7-slot holding bar. Aligning exactly three cat tiles of the same breed merges them into a "Trio" and clears them. Clearing the board wins the level, while filling all 7 slots without a match triggers a game over.

The project features:
- **Procedural Layer Generation**: Creates complex overlapping layouts that shift coordinates by half-steps for authentic layered aesthetics.
- **Physics-free Collision Math**: Computes overlaps on-the-fly to toggle interactive (active) vs. dimmed (blocked) tile states.
- **Procedural Sound Synthesizer**: Uses window.AudioContext (Web Audio API) to synthesize adorable cat meows, click pops, major chord match chimes, ascending win fanfares, and sad descending game-over melodies without any external assets.
- **Power-ups & Tools**: Includes a deep state Undo history, randomized board Shuffles, and a Temporary Hold shelf to move 3 slots out of the deck.
- **Persisted Stats**: Best high scores are tracked and persisted locally inside `localStorage`.

## Tech Stack

- **Framework**: React 18, React DOM
- **Build / Lang**: Vite, TypeScript 5
- **Styling**: Tailwind CSS, PostCSS (autoprefixer)
- **Icons**: `lucide-react`
- **Audio**: Web Audio API (native procedural synthesis)

## Critical Memory

- **Unblocked state calculation**: A tile is unblocked if and only if no other tiles on a strictly higher layer overlap with it by less than 1.4 grid units.
- **Solvability guarantee**: Level generation always adds tiles in strict multiples of 3 for each selected cat type, ensuring every puzzle is mathematically solvable.
- **Audio initialization**: AudioContext is instantiated lazily on the first user click/touch to comply with modern browser autoplay policies.
