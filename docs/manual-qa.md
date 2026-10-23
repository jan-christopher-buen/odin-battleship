# Manual browser review

Run `npm ci` and `npm start`, then open `http://localhost:8080` in a modern browser. These are manual interaction checks; they are intentionally separate from the domain test suite.

## Setup and concealment

- Confirm your board shows five straight ships of lengths 5, 4, 3, 3, and 2: 17 occupied squares, no overlap or off-board cells. Adjacent ships are legal.
- Select **Randomize fleet** repeatedly. Each layout should remain legal; layouts should vary over several attempts.
- Before starting, try enemy cells: no shot should be recorded.
- Inspect enemy cell classes, labels, attributes, and markup in DevTools. Unattacked ships must be indistinguishable from empty untried squares. Coordinate data attributes are allowed; ship identifiers or placement data must be absent.
- Select **Start game**. Setup controls should lock, focus should move to A1, and the human should fire first.

## Ship placement

- Drag each dock ship to a legal start square. Verify its length, direction, and the removal of its old position.
- Drag an existing ship by its first and by an interior square; the grabbed segment should land on the drop square.
- Select a ship, use **Rotate**, then drag that ship from the dock or its current board position. Check both directions and the board edges.
- Drop onto another ship, across an edge, outside the board, and back onto its existing position. Rejected moves must leave the full fleet unchanged, with a clear status message; canceled drags must clear the drop highlight.
- Select each ship and place it using click/tap. Repeat using only keyboard: select the dock button, Tab to your board, arrows/Home/End to navigate, R to rotate, and Enter/Space to place.
- Randomize after manual edits. All five ships must remain legal, with no stale highlights or incorrect selection direction.
- After starting, confirm placement controls disappear and neither dragging nor keyboard placement changes any fleet.
- At 320px and on touch devices, verify the dock and Rotate controls wrap, and tap placement works without native dragging.

## Turns and victory

- Fire at several squares. Check coordinate labels, recent signals, ship counts, live status, and distinct hit/miss/sunk shapes and colors.
- During the short computer delay, click rapidly on multiple squares and press Enter/Space repeatedly. Exactly one human shot and one computer response should occur.
- Try a previously fired square. It must remain inspectable and must not consume another turn or damage a ship again.
- Confirm hits also hand the turn to the other player.
- Track incoming shots throughout a game: no computer coordinate should repeat. After a nonsinking hit, the next computer shot should target an untried orthogonal neighbor when one remains. Misses should not discard other queued neighbors; after sinking, hunting resumes.
- Complete a game. The final shot should immediately announce victory/defeat, lock attacks, reveal and label the remaining enemy fleet, and stop computer responses. Review both outcomes across games if practical.

## Local two-player mode

- Select **Two players · pass device**. Confirm a neutral **Pass to Player 1** screen appears before any fleet is visible.
- Inspect both boards in DevTools during handoff: prior ship/hit/miss/sunk markers and labels must be cleared, with no ship coordinates in hidden markup. The board area should be hidden and inert, and focus should be on **Ready**.
- Player 1 selects Ready, arranges a fleet, and confirms. Before Player 2 selects Ready, neither board should be visible or reachable by keyboard/screen reader.
- Player 2 arranges and randomizes their fleet. Player 1's confirmed layout must stay unchanged. Confirm, then pass back to Player 1 to begin.
- Fire a shot. The public outcome should remain visible on the handoff screen while both boards are concealed. No automatic response should happen, even after waiting several seconds.
- Select Ready for the named next player. Their own board should show incoming shots and their ships, while the opposing board shows only known shots. Focus should move to opposing square A1.
- Alternate several turns, including hits, misses, sunk ships, and repeated square attempts. Every valid nonwinning shot requires a handoff; invalid/duplicate attempts do not change the active player.
- Verify Player 1 and Player 2 can each win across games. Victory should end immediately without another handoff and reveal the opponent's remaining fleet.
- Restart from initial handoff, either setup, between turns, and after victory. Always return to a fresh Player 1 handoff in local mode.
- Start against the computer, fire, immediately restart, then select local mode before the old delay expires. No stale response may appear in the new session.
- Check mode changes from setup and game over; they should start a fresh session. During active play, mode selection should be disabled.
- Repeat these flows using keyboard and a screen reader, confirming player names, incoming-shot descriptions, Ready focus, and no concealed fleet announcements.

## Restart and keyboard

- Fire, then immediately select **New game** during the computer delay. Wait longer than one second. The new setup must have no attacks or stale computer response.
- Repeat restart/start several times. Each human shot should still produce only one computer response and one log entry per actor.
- Confirm restart resets winner, shot markers, logs, counters, and phase, and returns focus to **Randomize fleet** against the computer or **Ready** in local mode.
- Navigate using only the keyboard. Tab should enter the attack board once; arrows move one square without page scrolling. Home/End reach row edges, Enter/Space fire, and Tab/Shift+Tab leave normally.
- Check arrow navigation at all four edges. Focus must stay within the board.
- Fire by keyboard, navigate during the computer delay, and confirm the response preserves the current focused cell.
- Confirm fired cells cannot fire again and have descriptive hit/miss/sunk accessible names.
- With a screen reader, verify coordinate descriptions, turn/outcome announcements, and the final winner. Hidden ships must not be announced.

## Layout and visual review

- Check a wide desktop viewport and narrow/mobile widths, including exactly 320 CSS pixels.
- Confirm the boards are side by side on desktop and stacked on mobile, with readable axes and usable cells.
- Check that there is no horizontal page overflow at 320px, including placement controls, mode selection, the handoff screen, and long outcome messages.
- Inspect visible keyboard focus, disabled-control states, text contrast, and shape cues independently of color.
- Check browser zoom at 200%, forced-colors mode if available, and touch interaction.
- Keep DevTools Console open through setup, play, victory, and repeated restarts. There should be no errors.

## Production build and repository path

1. Run `npm run build`.
2. Serve the contents of `dist/` through an HTTP server mounted at `/odin-battleship/` (or inspect the actual Pages deployment after publishing).
3. Load `/odin-battleship/` and refresh it. HTML and hashed JavaScript must return successfully, with no requests mistakenly made to `/main…js` at the server root.
4. Check that styles apply and placement and a full setup/start/attack/restart cycle work in both modes in the production build.
5. Repeat the console and mobile-overflow checks on the production site.
