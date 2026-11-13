import { normalizeCiv } from './forecast';

// --- Map drafts (aoe2cm drafts whose options are maps) ---
// Works for any format (PA3 now, BO5 later): nothing depends on the number of turns.

const isPlayerEvent = (ev) => ev && (ev.actionType || ev.type);
const evType = (ev) => String(ev.actionType || ev.type || "").toLowerCase();
const evPlayer = (ev) => String(ev.player || ev.executingPlayer || "").toUpperCase();
const evOption = (ev) => String(ev.chosenOptionId || ev.drafted || ev.optionId || ev.revealedOptionId || "").trim();
const isHiddenOption = (id) => !id || id.toLowerCase().startsWith('hidd');

// aoe2cm map ids are slugs ("grand-bara"); names are title case ("Grand Bara")
export const mapName = (id) => String(id || "").replace(/[-_]+/g, ' ').trim().toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());

export const mapImage = (name) => {
  if (name === "Tres Leches") return "/maps/Tres_leches.png";
  if (name === "Grand Bara") return "/maps/Grand_Bara.png";
  return `/maps/${name}.png`;
};

// A draft is a map draft when none of its chosen options is a civ
export const isMapDraft = (draft, civs) => {
  const options = (draft?.events || []).filter(isPlayerEvent).map(evOption).filter(id => !isHiddenOption(id));
  if (options.length === 0) return false;
  return !options.some(id => civs.includes(normalizeCiv(id)));
};

// Picks, bans and snipes of one side, with map names (for the side chooser)
export const mapSideSummary = (events, side) => {
  const picks = [], bans = [], snipes = [];
  (events || []).forEach(ev => {
    if (!isPlayerEvent(ev) || evPlayer(ev) !== side) return;
    const id = evOption(ev);
    if (isHiddenOption(id)) return;
    const t = evType(ev);
    const m = mapName(id);
    if (t === 'pick') picks.push(m);
    else if (t === 'ban') bans.push(m);
    else if (t === 'snipe') snipes.push(m);
  });
  return { picks, bans, snipes };
};

// One stored map draft seen from the rival's side
export const readMapDraft = (d) => {
  const side = String(d.rival_side || "").toUpperCase();
  const opp = side === 'HOST' ? 'GUEST' : 'HOST';
  const mine = mapSideSummary(d.events, side);
  const theirs = mapSideSummary(d.events, opp);
  const starting = mapSideSummary(d.events, 'NONE').picks;
  const lost = mine.picks.filter(m => theirs.snipes.includes(m));
  const oppLost = theirs.picks.filter(m => mine.snipes.includes(m));
  const snipeTargets = mine.snipes.map(m => theirs.picks.indexOf(m) + 1).filter(n => n > 0);
  const finalMaps = [...starting, ...mine.picks.filter(m => !lost.includes(m)), ...theirs.picks.filter(m => !oppLost.includes(m))];
  return {
    id: d.id, draftId: d.draft_id, side,
    rivalName: side === 'HOST' ? d.host_name : d.guest_name,
    oppName: side === 'HOST' ? d.guest_name : d.host_name,
    picks: mine.picks, bans: mine.bans, snipes: mine.snipes, lost,
    oppPicks: theirs.picks, oppBans: theirs.bans, oppLost,
    starting, finalMaps, snipeTargets,
  };
};

const ordinal = (n) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][n - 1] || `#${n}`;

export const analyzeMapDrafts = (storedDrafts, mapPool = []) => {
  const drafts = (storedDrafts || []).map(readMapDraft);
  const n = drafts.length;
  const names = Array.from(new Set([...mapPool, ...drafts.flatMap(r => [...r.picks, ...r.bans, ...r.snipes, ...r.oppPicks, ...r.oppBans, ...r.starting])]));
  const stats = {};
  names.forEach(m => { stats[m] = { pick: 0, firstPick: 0, ban: 0, snipe: 0, lost: 0, start: 0, final: 0 }; });
  drafts.forEach(r => {
    r.picks.forEach((m, i) => { stats[m].pick += 1; if (i === 0) stats[m].firstPick += 1; });
    r.bans.forEach(m => { stats[m].ban += 1; });
    r.snipes.forEach(m => { stats[m].snipe += 1; });
    r.lost.forEach(m => { stats[m].lost += 1; });
    r.starting.forEach(m => { stats[m].start += 1; });
    new Set(r.finalMaps).forEach(m => { stats[m].final += 1; });
  });

  const maxPick = Math.max(0, ...names.map(m => stats[m].pick));
  const maxBan = Math.max(0, ...names.map(m => stats[m].ban));
  const tag = (s) => {
    if (s.ban > 0 && s.ban >= s.pick) return { text: s.ban === n && n > 1 ? 'Always banned' : 'Banned', tone: 'red' };
    if (s.pick > 0) return { text: s.pick === n && n > 1 ? 'Always picked' : s.pick === maxPick && s.pick > 1 ? 'Favourite pick' : 'Picked', tone: 'green' };
    if (s.snipe > 0) return { text: 'Sniped from rival', tone: 'orange' };
    if (s.final > 0) return { text: 'Played, never chosen', tone: 'grey' };
    return { text: 'No data', tone: 'grey' };
  };
  const order = (a, b) => (stats[b].pick - stats[a].pick) || (stats[b].ban - stats[a].ban) || (stats[b].snipe - stats[a].snipe) || (stats[b].final - stats[a].final) || a.localeCompare(b);
  const maps = names.sort(order).map(m => ({ map: m, ...stats[m], tag: tag(stats[m]) }));

  // Plain-language patterns
  const reads = [];
  if (n > 0) {
    maps.filter(s => maxBan > 0 && s.ban === maxBan).forEach(s => reads.push({ text: `Bans ${s.map} in ${s.ban} of ${n}`, strong: s.map }));
    maps.filter(s => maxPick > 0 && s.pick === maxPick).forEach(s => reads.push({ text: `Picks ${s.map} in ${s.pick} of ${n}${s.firstPick ? ` (first pick in ${s.firstPick})` : ''}`, strong: s.map }));
    const targets = {};
    drafts.forEach(r => r.snipeTargets.forEach(t => { targets[t] = (targets[t] || 0) + 1; }));
    const best = Object.entries(targets).sort((a, b) => b[1] - a[1])[0];
    if (best) reads.push({ text: `Snipes the rival's ${ordinal(Number(best[0]))} pick in ${best[1]} of ${n}`, strong: `${ordinal(Number(best[0]))} pick` });
    const lostTotal = drafts.reduce((a, r) => a + r.lost.length, 0);
    if (lostTotal > 0) {
      const lostMaps = maps.filter(s => s.lost > 0).map(s => s.map);
      reads.push({ text: `Lost to rival snipes: ${lostMaps.join(', ')}`, strong: lostMaps.join(', ') });
    }
  }
  return { n, drafts, maps, reads };
};
