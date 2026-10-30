# Cube Attack

A Phaser/TypeScript browser runner. Source branch: main. No secrets or backend are needed.

## Continue on another device or with an AI

Use Node24. Run `npm ci`, `npm run dev`, then `npm run build` for production. The entry is `src/main.ts`; scenes are under `src/scenes`. Preserve the current game rules and art.

Space/Enter/click starts a run; Space or tap jumps. Results offer retry and return to title. Existing best-run progress must remain intact.

The mobile repair uses Phaser FIT with NO_CENTER because CSS already centers the canvas. Do not restore double centering. `vite.config.ts` uses a relative base so dist works from GitHub Pages subfolders.

Check actual start, jump, collision, retry, audio and resize/rotation at desktop1366x768/1920x1080 and phone390x844/360x640. Phone emulation does not prove real-device compatibility or full-level completion.

Source stays on main; GitHub Pages serves built files from gh-pages. Build first, inspect gameplay, then publish dist contents and .nojekyll to that branch. Never overwrite source with compiled files.
