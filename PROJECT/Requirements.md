# Requirements — Cat Trio

## Coding Patterns

- **Functional Components**: React functional components with hooks only; no class components.
- **Strict Layout limits**: Keep single files small (under 500 lines recommended, strictly under 800 lines P0).
- **Tailwind-centric styling**: Styling is implemented via utility classes inside JSX; custom styles in `App.css` are reserved for general reset rules.
- **Audio synthesis**: Do not import external sound clips. Use the procedural synth engine in `src/utils/audio.ts` for cute, reliable audio feedback.
- **SVGs in components**: Graphic icons and cat breeds are rendered as inline SVGs via `src/components/CatSVG.tsx` to ensure crisp rendering on all screens and resolutions.

## Known Issues / Constraints

- **Audio Context suspension**: Modern browsers prevent sound autoplay until a user clicks on the page. The `AudioContext` is created lazily on first interaction to avoid console warnings.
- **Overlapping coordinates**: Minor screen resize events do not impact coordinates because grid positions are translated to percentage offsets on a fixed aspect-ratio square board.
