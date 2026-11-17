// Small helpers for showing API values, plus a safe miniature Markdown renderer for the
// descriptions and rules the API returns (they are written in Markdown).

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount as '$1,000' when whole, '$0.50' when not. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A date in UTC, e.g. 'Nov 17, 2026, 12:30 PM UTC'. */
export function date(iso) {
  if (!iso) return '—';
  return `${new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. A bounty past its
 *  deadline takes no entries even while its status still reads open. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return 'under a minute left';
}

/** A judge win rate stored in millionths (956066) as a percentage ('95.6%'). */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(1)}%`;
}

/** A byte count as '915 KB'. */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v < 1024) return `${v} B`;
  if (v < 1048576) return `${(v / 1024).toFixed(0)} KB`;
  return `${(v / 1048576).toFixed(1)} MB`;
}

/** A long identifier shortened in the middle: 'B13MAsus…BtGuzi'. */
export function shorten(text, head = 8, tail = 6) {
  const s = String(text ?? '');
  return s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}

/** Inline Markdown on already-escaped text: code, bold, italic, links. */
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) =>
      /^(https?:\/\/|\/)/.test(url) ? `<a href="${url}" rel="noopener">${label}</a>` : label);
}

/** Markdown to HTML, small and safe: the input is escaped first, and only a fixed set of
 *  constructs is turned back into tags, so nothing in an API answer can inject markup. */
export function md(source) {
  const lines = esc(source ?? '').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol' while inside a list
  let fence = false;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      closeList();
      out.push(fence ? '</code></pre>' : '<pre><code>');
      fence = !fence;
      continue;
    }
    if (fence) { out.push(line); continue; }
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      const kind = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(item[1])}</li>`);
    } else if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')) {
      // A table separator row: the rows around it are rendered as plain paragraphs'
      // text with the pipes kept readable; skip the separator itself.
      closeList();
    } else if (line.trim() === '') {
      closeList();
    } else if (line.trimStart().startsWith('&gt;')) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^\s*&gt;\s?/, ''))}</blockquote>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  if (fence) out.push('</code></pre>');
  return out.join('\n');
}
