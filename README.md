# Leanboard

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/hbaxyz/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/hbaxyz/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A lean, fast, accessible frontend for [make.fun](https://make.fun), built as plain static files with no framework and no build step. It reads make.fun's public API alone and shows the four surfaces a visitor needs, each at its own shareable URL:

- **The bounty board** (`#/`) — every open bounty with its live pot (prize plus entry fees paid in), its entry fee, its time left and its entry count, sortable by deadline, pot or entries (`#/pot`, `#/entries`).
- **A bounty's page** (`#/bounty/<slug>`) — summary, description and rules rendered from the API's Markdown, and the rewards table split live between base prizes and entry-fee shares.
- **Its leaderboard** (`#/bounty/<slug>/leaderboard`) — ranked entries with judge win rates, records and dossier sizes, paged 25 at a time.
- **Public profiles** (`#/u/<handle>`) — an account's record (entered, placed, won, best placement, prizes) and every entry it has made, also reachable from the header's profile lookup.

For speed it keeps the first load at six files and about 12 KB gzipped, caches API answers in memory and revalidates them with their ETags (`If-None-Match`, so repeat views inside the minute cost a 304), ticks countdowns in place instead of re-rendering pages, and lays out for phones as well as desktops, with keyboard focus and screen-reader labelling throughout. Read-only: no sign-in, no writes, no tracking.

The entry program is `main.ts` (Node 22, standard library only): it copies `app/` and `screenshots/` to the output directory and writes the dossier with the kit's vendored library. Screenshots are real renders of this app on live make.fun data.

## Run it

```sh
git clone https://github.com/hbaxyz/makefun-frontend
cd makefun-frontend
node serve.ts   # serves app/ at http://localhost:8080 — open it in a browser
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=0af033q4&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
