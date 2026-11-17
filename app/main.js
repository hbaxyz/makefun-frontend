// The router: every surface has its own hash URL, reachable by a link and by typing it.
//
//   #/                                  the bounty board, ending soon first
//   #/pot                               the board, biggest pots first
//   #/entries                           the board, most entered first
//   #/bounty/<slug>                     one bounty's page
//   #/bounty/<slug>/leaderboard[/<n>]   its leaderboard, 25 entries a page
//   #/u/<handle>                        an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is on screen,
// so a screenshot script knows when to capture. Countdowns are ticked in place every
// 20 seconds by rewriting only their text, never the page around them.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, errorView, leaderboard, loading, notFound, profile } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');
let ticker = null;

function tickCountdowns() {
  for (const el of app.querySelectorAll('[data-countdown]')) {
    el.textContent = timeLeft(el.dataset.countdown);
  }
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tickCountdowns, 20000);
}

function show(html, title) {
  app.innerHTML = html;
  document.title = title;
  window.scrollTo(0, 0);
  startTicker();
  window.__shotReady = true;
}

async function render() {
  window.__shotReady = false;
  clearInterval(ticker);
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  try {
    if (parts.length === 0 || (parts.length === 1 && ['pot', 'entries'].includes(parts[0]))) {
      const sort = parts[0] ?? 'soon';
      app.innerHTML = loading();
      show(board(await getBounties(), sort), 'make.fun bounties — lean frontend');
    } else if (parts[0] === 'bounty' && parts.length === 2) {
      app.innerHTML = loading();
      const b = await getBounty(parts[1]);
      show(bounty(b), `${b.title} | make.fun bounties`);
    } else if (parts[0] === 'bounty' && parts[2] === 'leaderboard') {
      app.innerHTML = loading();
      const lb = await getLeaderboard(parts[1]);
      show(leaderboard(parts[1], lb, Number(parts[3]) || 1), `Leaderboard — ${lb.competition?.title ?? 'bounty'} | make.fun`);
    } else if (parts[0] === 'u' && parts.length === 2) {
      app.innerHTML = loading();
      const p = await getProfile(parts[1]);
      show(profile(p), `@${p.handle} | make.fun profiles`);
    } else {
      show(notFound(), 'Not found | make.fun bounties');
    }
  } catch (err) {
    show(errorView(err instanceof Error ? err.message : String(err)), 'Could not load | make.fun bounties');
  }
}

// Retry after an error, without leaving the page.
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-retry]')) render();
});

// The header's profile lookup: a handle becomes its profile URL.
document.getElementById('profile-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const handle = new FormData(event.target).get('handle').toString().trim().replace(/^@/, '');
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', render);
render();
