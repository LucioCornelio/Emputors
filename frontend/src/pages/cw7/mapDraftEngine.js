// Map draft scenario engine (PA3).
// 1) Rival model: every rival pick, ban and snipe is a choice among the maps that were
//    actually available at that moment (a snipe only compares the two maps of the pair).
//    Fitted as a choice model with a prior that pulls maps with little evidence to neutral.
// 2) Scenarios: the whole draft tree is enumerated. Our moves maximise the chance of winning
//    the match; rival moves follow the model with probabilities (not a perfect opponent).

const evType = (ev) => String(ev?.actionType || ev?.type || '').toLowerCase();
const evPlayer = (ev) => String(ev?.player || ev?.executingPlayer || '').toUpperCase();
const evOption = (ev) => String(ev?.chosenOptionId || ev?.drafted || ev?.optionId || ev?.revealedOptionId || '').trim();
const toMapName = (id) => String(id || '').replace(/[-_]+/g, ' ').trim().toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
const isHidden = (id) => !id || id.toLowerCase().startsWith('hidd');

// PA3 order seen in every recorded map draft. A = side with the first pick.
export const PA3_TURNS = [
  { side: 'A', kind: 'pick' }, { side: 'B', kind: 'pick' }, { side: 'B', kind: 'pick' }, { side: 'A', kind: 'pick' },
  { side: 'A', kind: 'ban' }, { side: 'B', kind: 'ban' },
  { side: 'B', kind: 'snipe' }, { side: 'A', kind: 'snipe' },
];

// Rival decisions of one stored map draft: [{ kind, chosen, options }]
export const rivalChoices = (draft, pool) => {
  const side = String(draft.rival_side || '').toUpperCase();
  const picks = { HOST: [], GUEST: [] };
  const sniped = new Set();
  const banned = new Set();
  const out = [];
  (draft.events || []).forEach(ev => {
    const t = evType(ev);
    const p = evPlayer(ev);
    if (!['pick', 'ban', 'snipe'].includes(t) || (p !== 'HOST' && p !== 'GUEST')) return;
    const raw = evOption(ev);
    if (isHidden(raw)) return;
    const m = toMapName(raw);
    const opp = p === 'HOST' ? 'GUEST' : 'HOST';
    const taken = new Set([...picks.HOST, ...picks.GUEST, ...banned]);
    let options;
    if (t === 'snipe') options = picks[opp].filter(x => !sniped.has(x));
    else options = pool.filter(x => !taken.has(x));
    if (p === side && options.length > 1 && options.includes(m)) out.push({ kind: t, chosen: m, options });
    if (t === 'pick') picks[p].push(m);
    else if (t === 'ban') banned.add(m);
    else sniped.add(m);
  });
  return out;
};

// Utility per map (0 = neutral). Picks reward a high value, bans and snipes a low one.
export const fitRivalModel = (drafts, pool, { prior = 2, iterations = 1500, rate = 0.05 } = {}) => {
  const choices = (drafts || []).flatMap(d => rivalChoices(d, pool));
  const u = Object.fromEntries(pool.map(m => [m, 0]));
  for (let it = 0; it < iterations; it++) {
    const g = Object.fromEntries(pool.map(m => [m, -u[m] / prior]));
    choices.forEach(({ kind, chosen, options }) => {
      const sg = kind === 'pick' ? 1 : -1;
      const w = options.map(o => Math.exp(sg * u[o]));
      const z = w.reduce((a, b) => a + b, 0);
      options.forEach((o, i) => { g[o] -= sg * w[i] / z; });
      g[chosen] += sg;
    });
    pool.forEach(m => { u[m] += rate * g[m]; });
  }
  // Plain counts for the interface
  const counts = Object.fromEntries(pool.map(m => [m, { pick: 0, ban: 0, snipe: 0, available: 0 }]));
  choices.forEach(({ kind, chosen, options }) => {
    counts[chosen][kind] += 1;
    if (kind === 'pick') options.forEach(o => { counts[o].available += 1; });
  });
  return { utility: u, counts, decisions: choices.length };
};

// Chance of winning more than half of the maps, each map with its own win chance
export const matchWinChance = (ps) => {
  let dist = [1];
  ps.forEach(p => {
    const next = new Array(dist.length + 1).fill(0);
    dist.forEach((q, k) => { next[k] += q * (1 - p); next[k + 1] += q * p; });
    dist = next;
  });
  const need = Math.floor(ps.length / 2) + 1;
  return dist.slice(need).reduce((a, b) => a + b, 0);
};

const softmax = (opts, score) => {
  const w = opts.map(o => Math.exp(score(o)));
  const z = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / z);
};

/*
  pool: map names. ours: { map: win chance 0..1 } against this rival. utility: rival model.
  weFirst: true when Emputors has the first pick (side A).
  firstPick: optional map we commit to as our first pick (otherwise the best one).
  overrides: { stateKey: map } our own choice at a given point of the draft (stateKey comes with each step).
  Returns { winChance, firstPicks: [{ map, win }], finals: [{ maps, start, prob, win }], lines: [...] }.
*/
export const analyzeScenarios = ({ pool, ours, utility, weFirst = true, firstPick = null, overrides = {}, turns = PA3_TURNS }) => {
  const usSide = weFirst ? 'A' : 'B';
  const finalOf = (s) => {
    const left = pool.filter(m => !s.pa.includes(m) && !s.pb.includes(m) && !s.bans.includes(m));
    const keptA = s.pa.filter(m => !s.snA.includes(m));
    const keptB = s.pb.filter(m => !s.snB.includes(m));
    const usKept = usSide === 'A' ? keptA : keptB;
    const themKept = usSide === 'A' ? keptB : keptA;
    return { start: left, maps: [...left, ...usKept, ...themKept] };
  };
  const win = (maps) => matchWinChance(maps.map(m => ours[m] ?? 0.5));
  // Order inside each list does not change what can happen next, so it is left out of the key
  const srt = (l) => [...l].sort().join(',');
  const key = (s, t) => [t, srt(s.pa), srt(s.pb), srt(s.bans), srt(s.snA), srt(s.snB)].join('|');
  const options = (s, turn) => {
    const taken = new Set([...s.pa, ...s.pb, ...s.bans]);
    if (turn.kind === 'snipe') return (turn.side === 'A' ? s.pb.filter(m => !s.snB.includes(m)) : s.pa.filter(m => !s.snA.includes(m)));
    return pool.filter(m => !taken.has(m));
  };
  const apply = (s, turn, m) => {
    const n = { pa: [...s.pa], pb: [...s.pb], bans: [...s.bans], snA: [...s.snA], snB: [...s.snB] };
    if (turn.kind === 'pick') (turn.side === 'A' ? n.pa : n.pb).push(m);
    else if (turn.kind === 'ban') n.bans.push(m);
    else (turn.side === 'A' ? n.snB : n.snA).push(m); // side A snipes one of B's picks
    return n;
  };

  const memo = new Map();
  // Expected match win chance from a state, with our best move at our turns
  const value = (s, t) => {
    if (t === turns.length) return win(finalOf(s).maps);
    const k = key(s, t);
    if (memo.has(k)) return memo.get(k);
    const turn = turns[t];
    const opts = options(s, turn);
    let v;
    if (opts.length === 0) v = value(s, t + 1);
    else if (turn.side === usSide) {
      const forced = overrides[k];
      v = forced && opts.includes(forced) ? value(apply(s, turn, forced), t + 1) : Math.max(...opts.map(m => value(apply(s, turn, m), t + 1)));
    }
    else {
      const sg = turn.kind === 'pick' ? 1 : -1;
      const ps = softmax(opts, m => sg * (utility[m] || 0));
      v = opts.reduce((a, m, i) => a + ps[i] * value(apply(s, turn, m), t + 1), 0);
    }
    memo.set(k, v);
    return v;
  };
  const firstUs = turns.findIndex(x => x.side === usSide && x.kind === 'pick');
  const bestMove = (s, t) => {
    const opts = options(s, turns[t]);
    if (t === firstUs && firstPick && opts.includes(firstPick)) return firstPick;
    const forced = overrides[key(s, t)];
    if (forced && opts.includes(forced)) return forced;
    let best = null, bv = -1;
    opts.forEach(m => { const v = value(apply(s, turns[t], m), t + 1); if (v > bv + 1e-12) { bv = v; best = m; } });
    return best;
  };

  // Every path the rival can take, with our best answer at each of our turns
  const paths = [];
  const walk = (s, t, prob, steps) => {
    if (prob < 1e-5) return;
    if (t === turns.length) { paths.push({ prob, steps, ...finalOf(s) }); return; }
    const turn = turns[t];
    const opts = options(s, turn);
    if (opts.length === 0) { walk(s, t + 1, prob, steps); return; }
    if (turn.side === usSide) {
      const m = bestMove(s, t);
      const stateKey = key(s, t);
      const alternatives = opts.map(o => ({ map: o, win: value(apply(s, turn, o), t + 1) })).sort((a, b) => b.win - a.win);
      walk(apply(s, turn, m), t + 1, prob, [...steps, { ...turn, us: true, map: m, stateKey, alternatives, forced: !!overrides[stateKey] && overrides[stateKey] === m }]);
      return;
    }
    const sg = turn.kind === 'pick' ? 1 : -1;
    const ps = softmax(opts, m => sg * (utility[m] || 0));
    opts.forEach((m, i) => walk(apply(s, turn, m), t + 1, prob * ps[i], [...steps, { ...turn, us: false, map: m, chance: ps[i] }]));
  };
  const start = { pa: [], pb: [], bans: [], snA: [], snB: [] };
  walk(start, 0, 1, []);
  const winChance = paths.reduce((a, p) => a + p.prob * win(p.maps), 0) / paths.reduce((a, p) => a + p.prob, 0);

  // Match win chance for each possible first pick of ours
  const firstPicks = [];
  if (firstUs >= 0) {
    const reach = (s, t, prob, acc) => {
      if (t === firstUs) { acc.push({ s, prob }); return; }
      const turn = turns[t];
      const opts = options(s, turn);
      const sg = turn.kind === 'pick' ? 1 : -1;
      const ps = softmax(opts, m => sg * (utility[m] || 0));
      opts.forEach((m, i) => reach(apply(s, turn, m), t + 1, prob * ps[i], acc));
    };
    const states = [];
    reach(start, 0, 1, states);
    pool.forEach(m => {
      let v = 0, w = 0;
      states.forEach(({ s, prob }) => {
        if (options(s, turns[firstUs]).includes(m)) { v += prob * value(apply(s, turns[firstUs], m), firstUs + 1); w += prob; }
      });
      if (w > 0) firstPicks.push({ map: m, win: v / w, available: w });
    });
    firstPicks.sort((a, b) => b.win - a.win);
  }

  // Final map sets (all maps are played; the most likely starting map goes first)
  const finals = new Map();
  paths.forEach(p => {
    const k = [...p.maps].sort().join('|');
    const f = finals.get(k) || { set: [...p.maps].sort(), starts: {}, prob: 0, win: win(p.maps) };
    f.prob += p.prob;
    f.starts[p.start[0]] = (f.starts[p.start[0]] || 0) + p.prob;
    finals.set(k, f);
  });
  finals.forEach(f => {
    f.start = Object.entries(f.starts).sort((a, b) => b[1] - a[1])[0][0];
    f.maps = [f.start, ...f.set.filter(m => m !== f.start)];
  });

  // Lines grouped by the rival's picks, each shown by its most likely path
  const groups = new Map();
  paths.forEach(p => {
    const theirPicks = p.steps.filter(s => !s.us && s.kind === 'pick').map(s => s.map).sort();
    const k = theirPicks.join(' + ');
    const g = groups.get(k) || { theirPicks, prob: 0, ev: 0, best: null };
    g.prob += p.prob;
    g.ev += p.prob * win(p.maps);
    if (!g.best || p.prob > g.best.prob) g.best = p;
    groups.set(k, g);
  });
  const lines = [...groups.values()].map(g => ({
    theirPicks: g.theirPicks, prob: g.prob, win: g.ev / g.prob,
    steps: g.best.steps, start: g.best.start[0],
  })).sort((a, b) => b.prob - a.prob);

  return { winChance, firstPicks, finals: [...finals.values()].sort((a, b) => b.prob - a.prob), lines };
};
