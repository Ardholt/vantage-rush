// Local top-10 leaderboard in localStorage. This is the ONLY thing that survives a reset between players.
export const KEY = 'vantage-rush.top10.v1';
const clean = (s) => String(s || '').toUpperCase().replace(/[^A-Z]/g, '').padEnd(3, '-').slice(0, 3);

export function load() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(a)) return [];
    return a.filter((e) => e && Number.isFinite(e.score)).map((e) => ({ name: clean(e.name), score: Math.round(e.score), at: +e.at || 0 }))
      .sort((p, q) => q.score - p.score || p.at - q.at).slice(0, 10);
  } catch { return []; }
}
export const qualifies = (score) => score > 0 && (load().length < 10 || score > load()[9].score);
export function add(name, score) {
  const entry = { name: clean(name), score: Math.round(score), at: Date.now() };
  const all = [...load(), entry].sort((p, q) => q.score - p.score || p.at - q.at).slice(0, 10);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  return { all, entry, rank: all.indexOf(entry) + 1 };
}
