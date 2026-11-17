// The four surfaces, each a function from API data to HTML: the bounty board, a bounty's
// page, its leaderboard, and an account's public profile. Views are pure — the router in
// main.js fetches, then swaps the returned HTML into the page; countdown spans carry a
// data-countdown deadline and are ticked in place, never re-rendered.

import { bytes, date, esc, md, money, shorten, timeLeft, winRate } from './format.js';

const SITE = 'https://make.fun';

/** An API image path (an avatar) as a full URL; avatars need crossorigin for CORP. */
const imgUrl = (path) => (path ? (path.startsWith('http') ? path : SITE + path) : '');

/** Whether a bounty still takes entries: by its deadline, not its status alone. */
const accepting = (b) => b.acceptingSubmissions !== false && new Date(b.deadline).getTime() > Date.now();

const potOf = (b) => b.potUsd ?? b.rewardAmount;

const feeChip = (b) =>
  b.entryFeeUsd
    ? `<span class="chip fee">${money(b.entryFeeUsd)} entry fee</span>`
    : '<span class="chip free">Free entry</span>';

const countdown = (iso) => `<span data-countdown="${esc(iso)}">${esc(timeLeft(iso))}</span>`;

/* The board ------------------------------------------------------------- */

const SORTS = [
  ['soon', '#/', 'Ending soon'],
  ['pot', '#/pot', 'Biggest pots'],
  ['entries', '#/entries', 'Most entered'],
];

export function board(data, sort = 'soon') {
  const items = [...(data.items ?? [])];
  if (sort === 'pot') items.sort((a, b) => potOf(b) - potOf(a));
  else if (sort === 'entries') items.sort((a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0));
  else items.sort((a, b) => Number(!accepting(a)) - Number(!accepting(b)) || new Date(a.deadline) - new Date(b.deadline));

  const totalPot = items.reduce((sum, b) => sum + (Number(potOf(b)) || 0), 0);
  const totalEntries = items.reduce((sum, b) => sum + (b.submissionCount ?? 0), 0);
  const cards = items.map((b) => {
    const open = accepting(b);
    return `
    <article class="card${open ? '' : ' ended'}">
      <div class="row">
        <span class="chip">${esc(b.category ?? 'Bounty')}</span>
        ${feeChip(b)}
        ${open ? '' : '<span class="chip over">Ended</span>'}
      </div>
      <h3><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h3>
      <p class="sum">${esc(b.summary ?? '')}</p>
      <div class="pot">${money(potOf(b))}<small>live pot</small></div>
      <ul class="meta">
        <li><b>${countdown(b.deadline)}</b></li>
        <li><b>${b.submissionCount ?? 0}</b> ${(b.submissionCount ?? 0) === 1 ? 'entry' : 'entries'}</li>
        <li>by ${esc(b.sponsor?.name ?? 'make.fun')}${b.sponsor?.isVerified ? ' ✓' : ''}</li>
      </ul>
    </article>`;
  }).join('');

  return `
    <h1>The bounty board</h1>
    <p class="lede">Every bounty open on make.fun right now, read live from its public API. The pot is the prize plus every entry fee paid into it so far.</p>
    <div class="stats">
      <span><b>${items.length}</b> open bounties</span>
      <span><b>${money(totalPot)}</b> in live pots</span>
      <span><b>${totalEntries.toLocaleString('en-US')}</b> entries so far</span>
    </div>
    <div class="sorts" role="navigation" aria-label="Sort the board">
      ${SORTS.map(([key, href, label]) => `<a href="${href}"${key === sort ? ' aria-current="true"' : ''}>${label}</a>`).join('')}
    </div>
    <div class="grid">${cards}</div>`;
}

/* A bounty's page ------------------------------------------------------- */

function rewardsTable(b) {
  const rows = Array.isArray(b.rewardsNow) && b.rewardsNow.length
    ? b.rewardsNow.map((r) => ({ place: r.place, now: r.amountUsd, base: r.baseUsd, fees: r.feeShareUsd }))
    : Object.entries(b.rewards ?? {}).map(([place, base]) => ({ place, now: base, base, fees: 0 }));
  if (!rows.length) return '';
  const body = rows.map((r) => `
      <tr>
        <td class="rank${r.place <= 3 ? ` r${r.place}` : ''}">${r.place}</td>
        <td class="num"><b>${money(r.now)}</b></td>
        <td class="num">${money(r.base)}</td>
        <td class="num">${Number(r.fees) > 0 ? money(r.fees) : '—'}</td>
      </tr>`).join('');
  return `
    <h2>Rewards — the live pot split</h2>
    <div class="tablewrap"><table>
      <thead><tr><th>Place</th><th class="num">Prize now</th><th class="num">Base prize</th><th class="num">From entry fees</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
}

export function bounty(b) {
  const open = accepting(b);
  const feesNote = Number(b.entryFeesUsd) > 0
    ? `${money(b.rewardAmount)} base + ${money(b.entryFeesUsd)} from ${b.entryFeePayers ?? 0} entry fees`
    : `${money(b.rewardAmount)} prize, no entry fees`;
  return `
    <p class="crumb"><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <div class="row" style="display:flex;gap:6px;flex-wrap:wrap">
      <span class="chip">${esc(b.category ?? 'Bounty')}</span>
      ${feeChip(b)}
      ${open ? '<span class="chip free">Accepting entries</span>' : '<span class="chip over">Entries closed</span>'}
      ${(b.skills ?? []).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}
    </div>
    <div class="tiles">
      <div class="tile"><div class="k">Live pot</div><div class="v">${money(potOf(b))}</div><div class="n">${feesNote}</div></div>
      <div class="tile"><div class="k">Entry fee</div><div class="v">${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</div><div class="n">paid once per account</div></div>
      <div class="tile"><div class="k">Entries</div><div class="v">${(b.submissionCount ?? 0).toLocaleString('en-US')}</div><div class="n">submitted so far</div></div>
      <div class="tile"><div class="k">Deadline</div><div class="v">${countdown(b.deadline)}</div><div class="n">${date(b.deadline)}</div></div>
    </div>
    <div class="actions">
      <a class="btn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View the leaderboard</a>
      <a class="btn ghost" href="${SITE}/bounty/${encodeURIComponent(b.slug)}" rel="noopener">Open on make.fun</a>
    </div>
    ${rewardsTable(b)}
    <h2>About this bounty</h2>
    <div class="prose">${md(b.description)}</div>
    ${b.rules && b.rules !== b.description ? `<details class="rules"><summary>Rules</summary><div class="prose">${md(b.rules)}</div></details>` : ''}
    <p class="crumb" style="margin-top:26px">Sponsored by ${esc(b.sponsor?.name ?? 'make.fun')}${b.sponsor?.isVerified ? ' ✓' : ''} · opened ${date(b.opensAt ?? b.publishedAt)} · deadline ${date(b.deadline)}</p>`;
}

/* The leaderboard ------------------------------------------------------- */

const PAGE_SIZE = 25;

export function leaderboard(slug, lb, page = 1) {
  const entries = lb.entries ?? [];
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const rows = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((e) => {
    const j = e.judge ?? {};
    const record = j.matches ? `${j.wins ?? 0}W – ${j.losses ?? 0}L` : '—';
    const invalid = e.values && Number(e.values.valid) === 0;
    return `
      <tr>
        <td class="rank${e.rank <= 3 ? ` r${e.rank}` : ''}">${e.rank}</td>
        <td><span class="who">
          ${e.image ? `<img crossorigin="anonymous" src="${esc(imgUrl(e.image))}" alt="" width="28" height="28" loading="lazy">` : ''}
          <a href="#/u/${encodeURIComponent(e.handle)}">@${esc(e.handle)}</a>
          ${e.house ? '<span class="chip">house</span>' : ''}${invalid ? '<span class="chip over">invalid</span>' : ''}
        </span></td>
        <td class="entry-title">${esc(e.title ?? '')}</td>
        <td class="num"><b>${winRate(e.values?.judge)}</b></td>
        <td class="num">${record}</td>
        <td class="num">${bytes(e.values?.bytes)}</td>
      </tr>`;
  }).join('');
  const base = `#/bounty/${encodeURIComponent(slug)}/leaderboard`;
  const pager = pages > 1 ? `
    <nav class="pager" aria-label="Leaderboard pages">
      ${current > 1 ? `<a href="${base}/${current - 1}">← Prev</a>` : '<span class="off">← Prev</span>'}
      <span>Page ${current} of ${pages}</span>
      ${current < pages ? `<a href="${base}/${current + 1}">Next →</a>` : '<span class="off">Next →</span>'}
    </nav>` : '';
  const provisional = entries.some((e) => e.judge?.provisional);
  return `
    <p class="crumb"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(lb.competition?.title ?? 'Bounty')}</a></p>
    <h1>Leaderboard</h1>
    <p class="lede">${entries.length.toLocaleString('en-US')} ranked entries${lb.phase?.title ? ` · ${esc(lb.phase.title)} phase` : ''}. Win rate is the judge's Bradley–Terry rate for the entry; size is its dossier, and smaller wins a tie.${provisional ? ' Rates are provisional — the final heat re-judges every entry.' : ''}</p>
    <div class="tablewrap"><table>
      <thead><tr><th>Rank</th><th>Entrant</th><th>Entry</th><th class="num">Win rate</th><th class="num">Record</th><th class="num">Size</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No ranked entries yet.</td></tr>'}</tbody>
    </table></div>
    ${pager}`;
}

/* A public profile ------------------------------------------------------ */

export function profile(p) {
  const r = p.record ?? {};
  const avatar = imgUrl(p.image ?? p.avatar);
  const socials = [
    p.wallet?.address ? `<a class="btn ghost" href="${esc(p.wallet.explorer_url ?? '#')}" rel="noopener">Wallet ${esc(shorten(p.wallet.address))}</a>` : '',
    p.github_login ? `<a class="btn ghost" href="https://github.com/${encodeURIComponent(p.github_login)}" rel="noopener">GitHub @${esc(p.github_login)}</a>` : '',
    p.x ? `<a class="btn ghost" href="https://x.com/${encodeURIComponent(p.x)}" rel="noopener">X @${esc(p.x)}</a>` : '',
    p.discord ? `<span class="chip">Discord ${esc(p.discord)}</span>` : '',
  ].filter(Boolean).join('');
  const solutions = (p.solutions ?? []).map((s) => {
    const c = s.competition ?? {};
    return `
    <li>
      <a class="t" href="#/bounty/${encodeURIComponent(c.slug ?? '')}">${esc(c.title ?? '')}</a>
      <div class="e">${esc(s.title ?? '')}</div>
      <div class="m">
        ${s.score ? `<span class="score">${esc(s.score.column?.title ?? 'Score')} ${esc(s.score.display ?? s.score.value)}</span>` : ''}
        ${s.placement ? `<span>Placed #${Number(s.placement).toLocaleString('en-US')}</span>` : ''}
        ${s.prize_usd && Number(s.prize_usd) > 0 ? `<span>Won ${money(s.prize_usd)}</span>` : ''}
        <span>Entered ${date(s.entered_at)}</span>
        ${c.deadline ? `<span>Bounty deadline ${date(c.deadline)}</span>` : ''}
      </div>
    </li>`;
  }).join('');
  const best = r.best_placement ? `#${Number(r.best_placement).toLocaleString('en-US')}` : '—';
  return `
    <p class="crumb"><a href="#/">← Bounty board</a></p>
    <div class="phead">
      ${avatar ? `<img crossorigin="anonymous" src="${esc(avatar)}" alt="" width="72" height="72">` : ''}
      <div>
        <h1>${esc(p.display_name ?? `@${p.handle}`)}</h1>
        <p class="sub">@${esc(p.handle)}${p.house ? ' · house account' : ''} · joined ${date(p.joined_at)}</p>
      </div>
    </div>
    ${p.bio ? `<div class="prose" style="margin-top:14px">${md(p.bio)}</div>` : ''}
    <div class="tiles">
      <div class="tile"><div class="k">Entered</div><div class="v">${r.competitions_entered ?? 0}</div><div class="n">competitions</div></div>
      <div class="tile"><div class="k">Placed</div><div class="v">${r.competitions_placed ?? 0}</div><div class="n">${r.podium_finishes ?? 0} podium finishes</div></div>
      <div class="tile"><div class="k">Won</div><div class="v">${r.competitions_won ?? 0}</div><div class="n">competitions</div></div>
      <div class="tile"><div class="k">Best placement</div><div class="v">${best}</div><div class="n">across all entries</div></div>
      <div class="tile"><div class="k">Prizes won</div><div class="v">${money(r.prize_usd ?? 0)}</div><div class="n">paid in USDC</div></div>
    </div>
    ${socials ? `<div class="actions">${socials}</div>` : ''}
    <h2>Entries</h2>
    <ul class="solutions">${solutions || '<li>No entries yet.</li>'}</ul>`;
}

/* States ---------------------------------------------------------------- */

export function loading() {
  return `<p class="loading">Loading live data from make.fun…</p>
    <div class="grid" aria-hidden="true"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>`;
}

export function errorView(message) {
  return `<div class="error">
    <h1>That page could not be loaded</h1>
    <p class="lede">${esc(message)}</p>
    <p><button class="btn" type="button" data-retry>Try again</button> <a class="btn ghost" href="#/">Back to the board</a></p>
  </div>`;
}

export function notFound() {
  return `<h1>Nothing here</h1>
    <p class="lede">That address does not name a page of this frontend. Try the <a href="#/">bounty board</a>, a bounty page, its leaderboard, or a profile.</p>`;
}
