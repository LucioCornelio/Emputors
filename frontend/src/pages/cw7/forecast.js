import { io } from 'socket.io-client';

// --- Shared helpers for rival scouting and the pick forecast ---

export const normalizeCiv = (c) => {
  if (!c) return "";
  const clean = String(c).trim();
  if (clean.toLowerCase().startsWith("hidd")) return "Hidden";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};

const isPlayerEvent = (ev) => ev && (ev.actionType || ev.type);
const evType = (ev) => String(ev.actionType || ev.type || "").toLowerCase();
const evPlayer = (ev) => String(ev.player || ev.executingPlayer || "").toUpperCase();
const evCiv = (ev) => normalizeCiv(ev.chosenOptionId || ev.drafted || ev.civ || ev.optionId || ev.revealedOptionId || "");

// Loads a FINISHED draft from aoe2cm. Finished drafts are sent once as a 'replay' event.
export const loadFinishedDraft = (idOrUrl) => new Promise((resolve, reject) => {
  const match = String(idOrUrl).match(/draft\/([a-zA-Z0-9_-]+)/);
  const draftId = match ? match[1] : String(idOrUrl).trim();
  if (!draftId) { reject(new Error("Enter a draft URL or ID")); return; }

  const socket = io('https://aoe2cm.net', { query: { draftId }, transports: ['websocket'] });
  const timer = setTimeout(() => {
    socket.disconnect();
    reject(new Error("No finished draft received. Is the draft finished and the ID correct?"));
  }, 10000);

  socket.on('replay', (data) => {
    clearTimeout(timer);
    socket.disconnect();
    resolve({ draftId, data });
  });
  socket.on('message', (msg) => {
    if (typeof msg === 'string' && msg.toLowerCase().includes('not exist')) {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error(msg));
    }
  });
  socket.on('connect_error', () => {
    clearTimeout(timer);
    socket.disconnect();
    reject(new Error("Could not connect to aoe2cm.net"));
  });
});

// Summary of one side of a draft (for the side chooser)
export const sideSummary = (events, side) => {
  const picks = [], bans = [], snipes = [];
  (events || []).forEach(ev => {
    if (!isPlayerEvent(ev) || evPlayer(ev) !== side) return;
    const civ = evCiv(ev);
    if (!civ || civ === "Hidden") return;
    const t = evType(ev);
    if (t === 'pick' && !picks.includes(civ)) picks.push(civ);
    else if (t === 'ban' && !bans.includes(civ)) bans.push(civ);
    else if (t === 'snipe' && !snipes.includes(civ)) snipes.push(civ);
  });
  return { picks, bans, snipes };
};

/*
  RIVAL MODEL (picks only)
  Each rival pick is a choice among the civs that were still available at that moment.
  - A civ that was not available (banned or taken before) says nothing: it is not counted.
  - A civ that was available and skipped counts as "exposure" without a pick.
  - Earlier picks weigh more than later ones (they reveal stronger preference).
  preference = (weighted picks + ALPHA * base) / (weighted exposure + ALPHA)
  ALPHA pulls civs with little evidence towards the average, so one draft does not dominate.
*/
const ALPHA = 4;
const pickWeight = (n) => 1 / (1 + 0.3 * (n - 1));

export const buildRivalModel = (storedDrafts, allCivs) => {
  const stats = {};
  allCivs.forEach(c => { stats[c] = { exposure: 0, picks: 0, rawPicks: 0, seen: 0, snipes: 0 }; });
  let totalPicks = 0, totalExposure = 0;

  (storedDrafts || []).forEach(d => {
    const side = String(d.rival_side || "").toUpperCase();
    const turns = d.turns || [];
    const removed = new Set();
    let pickNo = 0;

    (d.events || []).forEach((ev, i) => {
      if (!isPlayerEvent(ev)) return;
      const t = evType(ev);
      const player = evPlayer(ev);
      const civ = evCiv(ev);
      if (!civ || civ === "Hidden") return;
      const exclusivity = String(turns[i]?.exclusivity || 'EXCLUSIVE').toUpperCase();

      if (t === 'pick' && player === side) {
        pickNo += 1;
        const w = pickWeight(pickNo);
        allCivs.forEach(c => { if (!removed.has(c)) { stats[c].exposure += w; stats[c].seen += 1; totalExposure += w; } });
        if (stats[civ]) { stats[civ].picks += w; stats[civ].rawPicks += 1; totalPicks += w; }
        removed.add(civ);
      } else if (t === 'pick') {
        if (exclusivity !== 'NONEXCLUSIVE') removed.add(civ);
      } else if (t === 'ban') {
        removed.add(civ);
      } else if (t === 'snipe') {
        if (player === side && stats[civ]) stats[civ].snipes += 1;
      }
    });
  });

  const base = totalExposure > 0 ? totalPicks / totalExposure : 0;
  const pref = {};
  allCivs.forEach(c => {
    const s = stats[c];
    pref[c] = (s.picks + ALPHA * base) / (s.exposure + ALPHA);
  });
  return { stats, pref, base, draftCount: (storedDrafts || []).length };
};

/*
  How many EXCLUSIVE rival picks happen between our pick we are deciding now
  and our following pick? That is the window in which a civ we postpone can be taken.
*/
export const rivalPicksInWindow = (turns, nextIndex, ourSide) => {
  if (!turns || turns.length === 0) return 2; // unknown format: assume a snake draft (2 rival picks)
  const rivalSide = ourSide === 'HOST' ? 'GUEST' : 'HOST';
  const isPick = (t) => String(t?.action || "").toUpperCase() === 'PICK';
  const who = (t) => String(t?.player || "").toUpperCase();

  let a = -1;
  for (let i = nextIndex; i < turns.length; i++) { if (isPick(turns[i]) && who(turns[i]) === ourSide) { a = i; break; } }
  if (a === -1) return 0;
  let n = 0;
  for (let i = a + 1; i < turns.length; i++) {
    const t = turns[i];
    if (isPick(t) && who(t) === ourSide) break;
    if (isPick(t) && who(t) === rivalSide && String(t.exclusivity || 'EXCLUSIVE').toUpperCase() !== 'NONEXCLUSIVE') n += 1;
  }
  return n;
};

// Probability that the rival takes this civ before our following pick
export const pickRisk = (civ, model, availableCivs, n) => {
  if (!model || model.draftCount === 0 || n <= 0) return 0;
  const total = availableCivs.reduce((acc, c) => acc + (model.pref[c] || 0), 0);
  if (total <= 0) return 0;
  const share = (model.pref[civ] || 0) / total;
  return 1 - Math.pow(1 - share, n);
};

// Preference against an average civ (x1.0), the same number shown in the rival profile
export const preferenceRatio = (civ, model) => (model && model.base > 0) ? (model.pref[civ] || 0) / model.base : 0;

/*
  Label = how much the rival favours the civ (x3 or more: NOW, x1.5 or more: SOON).
  If the rival has no exclusive pick before our following pick, nothing can be taken: CAN WAIT.
*/
export const riskLabel = (ratio, n) => {
  if (n > 0 && ratio >= 3) return { label: 'NOW', color: '#ff4444' };
  if (n > 0 && ratio >= 1.5) return { label: 'SOON', color: '#ff9800' };
  return { label: 'CAN WAIT', color: '#888' };
};
