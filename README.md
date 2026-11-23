# Vantage Rush

Find where the photographer stood.

Vantage Rush is a short three-round browser game. Each round shows a postcard photo of a small hand-built 3D diorama next to a top-down map of the same scene, and you tap or click the map where you think the camera stood. The closer and the faster your guess, the more points you score (up to 1000 per round), and a whole game takes under three minutes. At the end you enter three initials for a local top 10.

**Live demo:** https://ardholt.github.io/vantage-rush/

## Controls

**Desktop**
- Click or press any key on the title screen to start.
- Click the map where the photographer stood. Each round lasts 25 seconds; no click scores 0.
- After a guess, click NEXT ROUND (or press Enter / Space) to skip the 5-second reveal.
- Initials: the ▲ / ▼ buttons, or the arrow keys (left/right pick a slot, up/down change the letter, letters type directly), then Enter or SAVE SCORE.
- SOUND (bottom left) toggles the sound effects.

**Phone and tablet**
- Tap the title screen to start, then tap the map to place your guess.
- Tap NEXT ROUND to move on, use the ▲ / ▼ buttons for your initials and tap SAVE SCORE.
- Hold the phone in landscape for the best view: in portrait the map is drawn narrow (taps still land correctly).

After 20 seconds without input the game returns to the title screen. The top 10 is kept in the browser's localStorage.

## Scoring

`d` is the distance in world units between your map point and the camera's ground position.

```
accuracy    = exp(-(d / 5)^2)
round score = round(accuracy * (700 + 300 * secondsLeft / 25))   // 0..1000
```

## Run locally

The built game is a single self-contained file: open `dist/index.html` in a current Chrome, Edge or Firefox. It works straight from `file://` and offline; nothing is fetched at play time.

To build it yourself (Node.js 20.19+ or 22.12+ and npm):

```sh
npm install
npm run build     # bundles src/ into the single file dist/index.html
npm run serve     # optional: serves dist/index.html on http://127.0.0.1:8080
```

`node scripts/verify.mjs` runs a headless end-to-end check (expects Google Chrome at `/usr/bin/google-chrome`; screenshots go to `shots/`, results to `proof/results.json`).

The game needs WebGL. The 15 dioramas are built in code with three.js geometry and canvas-drawn textures; there are no external assets.

Built with WebStorm 2026.3.

## License

MIT. See [LICENSE](LICENSE). Uses three.js (MIT).
