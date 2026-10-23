# Manual browser review

Run `npm ci` and `npm start`, then open `http://localhost:8080` in a modern browser. These are manual interaction checks; they are intentionally separate from the domain test suite.

## Setup and concealment

- Confirm your board shows five straight ships of lengths 5, 4, 3, 3, and 2: 17 occupied squares, no overlap or off-board cells. Adjacent ships are legal.
- Select **Randomize fleet** repeatedly. Each layout should remain legal; layouts should vary over several attempts.
- Before starting, try enemy cells: no shot should be recorded.
- Inspect enemy cell classes, labels, attributes, and markup in DevTools. Unattacked ships must be indistinguishable from empty untried squares. Coordinate data attributes are allowed; ship identifiers or placement data must be absent.
- Select **Start game**. Setup controls should lock, focus should move to A1, and the human should fire first.

## Turns and victory

- Fire at several squares. Check coordinate labels, recent signals, ship counts, live status, and distinct hit/miss/sunk shapes and colors.
- During the short computer delay, click rapidly on multiple squares and press Enter/Space repeatedly. Exactly one human shot and one computer response should occur.
- Try a previously fired square. It must remain inspectable and must not consume another turn or damage a ship again.
- Confirm hits also hand the turn to the other player.
- Track incoming shots throughout a game: no computer coordinate should repeat.
- Complete a game. The final shot should immediately announce victory/defeat, lock attacks, reveal and label the remaining enemy fleet, and stop computer responses. Review both outcomes across games if practical.

## Restart and keyboard

- Fire, then immediately select **New game** during the computer delay. Wait longer than one second. The new setup must have no attacks or stale computer response.
- Repeat restart/start several times. Each human shot should still produce only one computer response and one log entry per actor.
- Confirm restart resets winner, shot markers, logs, counters, and phase, and returns focus to **Randomize fleet**.
- Navigate using only the keyboard. Tab should enter the attack board once; arrows move one square without page scrolling. Home/End reach row edges, Enter/Space fire, and Tab/Shift+Tab leave normally.
- Check arrow navigation at all four edges. Focus must stay within the board.
- Fire by keyboard, navigate during the computer delay, and confirm the response preserves the current focused cell.
- Confirm fired cells cannot fire again and have descriptive hit/miss/sunk accessible names.
- With a screen reader, verify coordinate descriptions, turn/outcome announcements, and the final winner. Hidden ships must not be announced.

## Layout and visual review

- Check a wide desktop viewport and narrow/mobile widths, including exactly 320 CSS pixels.
- Confirm the boards are side by side on desktop and stacked on mobile, with readable axes and usable cells.
- Check that there is no horizontal page overflow at 320px, including after long outcome messages and with all controls visible.
- Inspect visible keyboard focus, disabled-control states, text contrast, and shape cues independently of color.
- Check browser zoom at 200%, forced-colors mode if available, and touch interaction.
- Keep DevTools Console open through setup, play, victory, and repeated restarts. There should be no errors.

## Production build and repository path

1. Run `npm run build`.
2. Serve the contents of `dist/` through an HTTP server mounted at `/odin-battleship/` (or inspect the actual Pages deployment after publishing).
3. Load `/odin-battleship/` and refresh it. HTML and hashed JavaScript must return successfully, with no requests mistakenly made to `/main…js` at the server root.
4. Check that styles apply and a full setup/start/attack/restart cycle works in the production build.
5. Repeat the console and mobile-overflow checks on the production site.
