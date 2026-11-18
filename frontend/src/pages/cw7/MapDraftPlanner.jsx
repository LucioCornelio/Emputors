import { useState, useEffect, useMemo } from 'react';
import { isMapDraft } from './mapDrafts';
import { fitRivalModel, analyzeScenarios, PA3_TURNS } from './mapDraftEngine';

// Map Draft: likely final maps and our best line against one rival, before the match.
// Our win chances per map are saved in this browser only (clan base + per rival changes).
const STORAGE_KEY = 'cw7-map-draft-v1';
const DEFAULT_BASE = { Colosseum: 60, Socotra: 58, 'Tres Leches': 56, 'Grand Bara': 52, Nomad: 50, Fortress: 45, Crescent: 42 };
const EMPTY = { rival: '', weFirst: true, firstPick: {}, base: DEFAULT_BASE, ratings: {} };

const load = () => {
  try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; } catch { return EMPTY; }
};
const pct = (x) => `${Math.round(x * 100)}%`;

const KIND = { pick: 'PICK', ban: 'BAN', snipe: 'SNIPE' };

export default function MapDraftPlanner({ C, MAP_POOL, CIVS, rivalDrafts, getMapImageName, onSendToCivPlanner }) {
  const [state, setState] = useState(load);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state]);

  const mapDraftsByRival = useMemo(() => {
    const out = {};
    (rivalDrafts || []).filter(d => isMapDraft(d, CIVS)).forEach(d => { (out[d.rival_name] = out[d.rival_name] || []).push(d); });
    return out;
  }, [rivalDrafts, CIVS]);
  const rivals = Object.keys(mapDraftsByRival).sort((a, b) => a.localeCompare(b));
  const rival = rivals.includes(state.rival) ? state.rival : rivals[0] || '';
  const drafts = useMemo(() => mapDraftsByRival[rival] || [], [mapDraftsByRival, rival]);

  const base = { ...DEFAULT_BASE, ...(state.base || {}) };
  const own = (state.ratings || {})[rival] || {};
  const rating = (m) => own[m] ?? base[m] ?? 50;
  const ours = Object.fromEntries(MAP_POOL.map(m => [m, rating(m) / 100]));
  // Default first pick: our best rated map (the model's ranking is shown next to each option)
  const firstPick = (state.firstPick || {})[rival] || [...MAP_POOL].sort((a, b) => rating(b) - rating(a))[0];

  const model = useMemo(() => fitRivalModel(drafts, MAP_POOL), [drafts, MAP_POOL]);
  const oursKey = MAP_POOL.map(m => ours[m]).join(',');
  const result = useMemo(
    () => analyzeScenarios({ pool: MAP_POOL, ours, utility: model.utility, weFirst: state.weFirst, firstPick: firstPick || null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [MAP_POOL, model, oursKey, state.weFirst, firstPick]
  );

  const setRating = (m, v) => setState(s => {
    const r = { ...((s.ratings || {})[rival] || {}) };
    const val = Math.max(5, Math.min(95, v));
    if (val === (base[m] ?? 50)) delete r[m]; else r[m] = val;
    return { ...s, ratings: { ...(s.ratings || {}), [rival]: r } };
  });
  const resetRival = () => setState(s => ({ ...s, ratings: { ...(s.ratings || {}), [rival]: {} } }));
  const saveAsBase = () => setState(s => ({ ...s, base: { ...base, ...own }, ratings: { ...(s.ratings || {}), [rival]: {} } }));
  const setFirstPick = (m) => setState(s => ({ ...s, firstPick: { ...(s.firstPick || {}), [rival]: m } }));

  const u = model.utility;
  const rank = [...MAP_POOL].sort((a, b) => u[b] - u[a]);
  const rivalTag = (m) => {
    if (model.decisions === 0) return { text: 'No data', color: '#888' };
    if (u[m] >= 0.4) return { text: 'Favourite', color: C.green };
    if (u[m] <= -0.4) return { text: 'Low', color: C.red };
    return { text: 'Neutral', color: '#ff9800' };
  };
  const evidence = (m) => {
    const c = model.counts[m];
    const parts = [];
    if (c.available) parts.push(`picked ${c.pick} of ${c.available} times available`);
    if (c.ban) parts.push(`banned ${c.ban}`);
    if (c.snipe) parts.push(`sniped ${c.snipe}`);
    return parts.join(', ') || 'no decisions on this map';
  };

  const card = { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '14px 15px' };
  const label = { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: C.cyan, letterSpacing: '0.5px' };
  const seg = (on, color = C.cyan) => ({ padding: '5px 12px', fontSize: '12px', cursor: 'pointer', color: on ? '#111' : '#888', backgroundColor: on ? color : 'transparent', fontWeight: on ? 'bold' : 'normal' });
  const thumb = (m, w = 46, h = 30) => (
    <img src={`/maps/${getMapImageName(m)}.png`} alt={m} style={{ width: w, height: h, objectFit: 'cover', borderRadius: '3px', border: '1px solid #444', flexShrink: 0 }} onError={(e) => { e.target.src = '/maps/Any.png'; }} />
  );
  const smallBtn = { background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '3px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer' };
  const stepBtn = { ...smallBtn, padding: '0 6px', fontSize: '12px', lineHeight: '18px', color: '#ddd' };

  if (rivals.length === 0) {
    return (
      <div style={{ ...card, color: '#888', fontSize: '13px' }}>
        No map drafts recorded yet. Load a rival's map drafts in Rival Scouting (Register) and they will show up here.
      </div>
    );
  }

  const shownFinals = result.finals.slice(0, 4);
  const otherFinals = 1 - shownFinals.reduce((a, f) => a + f.prob, 0);
  const toneOf = (w) => (w >= result.winChance + 0.015 ? C.green : w <= result.winChance - 0.015 ? C.red : '#ddd');

  // Same colours as the Execution Draft: host blue, guest gold; picks green, bans red
  const weHost = state.weFirst;
  const rivalShort = (rival.split(/\s+/)[0] || 'Rival');
  const ACTION = { pick: { text: 'Pick', color: C.green }, ban: { text: 'Ban', color: C.red }, snipe: { text: 'Snipe', color: '#ddd' } };
  const tag3 = (name) => name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  // Turn columns: fixed order of the format, plus the Admin pick (map left over)
  const columns = [...PA3_TURNS.map(t => {
    const us = (t.side === 'A') === weHost;
    return { kind: t.kind, us, who: us ? 'EMP' : tag3(rivalShort), color: (t.side === 'A') ? C.blue : C.gold };
  }), { kind: 'pick', admin: true, who: 'ADM', color: '#888' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', color: C.textMain }}>
      <div style={{ ...card, display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 15px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={label}>Rival</span>
          <select value={rival} onChange={(e) => setState(s => ({ ...s, rival: e.target.value }))} style={{ backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '5px 8px', fontSize: '12px' }}>
            {rivals.map(r => <option key={r} value={r}>{r} ({mapDraftsByRival[r].length})</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={label}>Format</span>
          <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>PA3</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} title="The host has the first pick">
          <span style={label}>Emputors are</span>
          <div style={{ display: 'inline-flex', border: '1px solid #444', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#1e212b' }}>
            <span style={seg(state.weFirst, C.blue)} onClick={() => setState(s => ({ ...s, weFirst: true }))}>Host</span>
            <span style={seg(!state.weFirst, C.gold)} onClick={() => setState(s => ({ ...s, weFirst: false }))}>Guest</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={label}>Our first pick</span>
          <select value={firstPick} onChange={(e) => setFirstPick(e.target.value)} style={{ backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '5px 8px', fontSize: '12px' }}>
            {result.firstPicks.map((f, i) => <option key={f.map} value={f.map}>{f.map} ({(f.win * 100).toFixed(1)}%{i === 0 ? ', model best' : ''})</option>)}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#888' }} title="Chance to win at least 2 of the 3 maps">Match win</span>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: C.gold }}>{pct(result.winChance)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: '16px', alignItems: 'start' }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <span style={label}>Maps: us vs them</span>
            <span style={{ display: 'flex', gap: '4px' }}>
              <button style={smallBtn} onClick={resetRival} title="Use the clan base for every map against this rival">Reset to base</button>
              <button style={smallBtn} onClick={saveAsBase} title="Make these values the clan base for every rival">Save as base</button>
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '6px' }}>
            <thead>
              <tr style={{ color: '#888', fontSize: '11px' }}><th style={{ textAlign: 'left', padding: '4px' }}></th><th style={{ textAlign: 'left', padding: '4px' }}>Our win %</th><th style={{ textAlign: 'left', padding: '4px' }}>Rival</th></tr>
            </thead>
            <tbody>
              {[...MAP_POOL].sort((a, b) => rating(b) - rating(a)).map(m => {
                const changed = own[m] !== undefined;
                const tag = rivalTag(m);
                return (
                  <tr key={m} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '5px 4px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{thumb(m)}<span style={{ color: '#fff' }}>{m}</span></div></td>
                    <td style={{ padding: '5px 4px', whiteSpace: 'nowrap' }}>
                      <button style={stepBtn} onClick={() => setRating(m, rating(m) - 1)}>-</button>
                      <b style={{ display: 'inline-block', width: '26px', textAlign: 'center', color: changed ? '#ff9800' : '#fff' }}>{rating(m)}</b>
                      <button style={stepBtn} onClick={() => setRating(m, rating(m) + 1)}>+</button>
                      {changed && <div style={{ fontSize: '9px', color: C.cyan }}>base {base[m]}</div>}
                    </td>
                    <td style={{ padding: '5px 4px' }} title={evidence(m)}>
                      <span style={{ fontSize: '10px', color: '#aaa', marginRight: '4px' }}>#{rank.indexOf(m) + 1}</span>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', border: `1px solid ${tag.color}`, color: tag.color, borderRadius: '2px', padding: '1px 5px' }}>{tag.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: '10px', color: '#777', marginTop: '8px', lineHeight: 1.4 }}>
            Our win %: clan base, changes against this rival in orange. Rival: their preference order (#1 = most wanted), read from {model.decisions} decisions in {drafts.length} map drafts. Each pick, ban or snipe only counts against the maps they could choose at that moment. Hover for the details.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={card}>
            <span style={label}>Likely final maps</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginTop: '8px' }}>
              {shownFinals.map(f => {
                const tone = toneOf(f.win);
                return (
                  <div key={f.maps.join('|')} style={{ backgroundColor: '#1e212b', border: `1px solid ${tone === C.red ? '#ff666688' : '#444'}`, borderRadius: '5px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <b style={{ fontSize: '16px', color: '#fff' }}>{pct(f.prob)}</b>
                      <span style={{ fontSize: '12px', color: '#888' }}>win <b style={{ color: tone }}>{pct(f.win)}</b></span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct(Math.min(1, f.prob / Math.max(0.01, shownFinals[0].prob))), backgroundColor: tone === C.red ? C.red : C.gold }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {f.maps.map(m => (
                        <div key={m} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: '11px' }}>
                          {thumb(m, '100%', 42)}
                          <div style={{ color: '#ddd', marginTop: '2px', fontSize: '10px', lineHeight: 1.2 }}>{m}</div>
                          {m === f.start && <div style={{ fontSize: '9px', color: C.cyan, fontWeight: 'bold' }}>START</div>}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => onSendToCivPlanner(f.maps)} style={{ background: 'transparent', border: `1px solid ${C.gold}`, color: C.gold, borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Send to Civ Planner</button>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '10px', color: '#777', marginTop: '8px' }}>
              Win % = chance to win at least 2 of the 3 maps with our values. Start = the most likely starting map of that set. {otherFinals > 0.005 ? `Other final sets: ${pct(otherFinals)} in total.` : ''}
            </div>
          </div>

          <div style={card}>
            <span style={label}>Our line, by what the rival picks</span>
            <div style={{ overflowX: 'auto', marginTop: '8px' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '11px', minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px 6px', textAlign: 'left', color: '#888', fontSize: '10px', fontWeight: 'normal', verticalAlign: 'bottom' }}>Chance</th>
                    {columns.map((c, i) => (
                      <th key={i} style={{ padding: '4px 3px', textAlign: 'center', borderLeft: c.kind !== (columns[i - 1] || {}).kind ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ fontSize: '9px', color: '#666' }}>{i + 1}</div>
                        <div style={{ color: ACTION[c.kind].color, fontWeight: 'bold', fontSize: '11px' }}>{ACTION[c.kind].text}</div>
                        <div style={{ color: c.color, fontWeight: 'bold', fontSize: '11px' }}>{c.who}</div>
                      </th>
                    ))}
                    <th style={{ padding: '4px 6px', textAlign: 'center', color: '#888', fontSize: '10px', fontWeight: 'normal', verticalAlign: 'bottom', borderLeft: `1px solid ${C.border}` }}>Win</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.slice(0, 4).map(l => {
                    const sniped = new Set(l.steps.filter(s => s.kind === 'snipe').map(s => s.map));
                    const cells = [...l.steps, { kind: 'pick', admin: true, map: l.start }];
                    return (
                      <tr key={l.theirPicks.join('+')} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '6px', whiteSpace: 'nowrap' }}><b style={{ color: '#fff', fontSize: '13px' }}>{pct(l.prob)}</b></td>
                        {cells.map((s, i) => {
                          const lost = s.kind === 'pick' && !s.admin && sniped.has(s.map);
                          const out = s.kind !== 'pick' || lost;
                          return (
                            <td key={i} style={{ padding: '6px 3px', textAlign: 'center', verticalAlign: 'top', width: '64px', borderLeft: (columns[i] || {}).kind !== (columns[i - 1] || {}).kind ? `1px solid ${C.border}` : 'none' }} title={lost ? `${s.map}: sniped` : s.map}>
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                {thumb(s.map, 46, 30)}
                                {out && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(22,25,32,0.55)', borderRadius: '3px' }} />}
                                {(s.kind === 'ban' || lost) && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red, fontWeight: 900, fontSize: '16px' }}>✕</span>}
                              </div>
                              <div style={{ fontSize: '10px', lineHeight: 1.15, color: out ? '#777' : '#fff', textDecoration: lost ? 'line-through' : 'none', marginTop: '2px' }}>{s.map}</div>
                              {!s.us && !s.admin && s.chance < 0.995 && <div style={{ fontSize: '9px', color: '#888' }}>{pct(s.chance)}</div>}
                            </td>
                          );
                        })}
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: toneOf(l.win), borderLeft: `1px solid ${C.border}` }}>{pct(l.win)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: '10px', color: '#777', marginTop: '8px', lineHeight: 1.4 }}>
              One row per rival double pick, with the most likely way the draft goes from there. Blue = host, gold = guest. Small % = chance of the rival's move. Dimmed = banned, sniped or used to snipe; the maps left bright are the ones played. ADM = the map nobody chose; the match starts on it.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
