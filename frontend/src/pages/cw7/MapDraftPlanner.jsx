import { useState, useEffect, useMemo } from 'react';
import { isMapDraft } from './mapDrafts';
import { fitRivalModel, analyzeScenarios } from './mapDraftEngine';

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
  const firstPick = (state.firstPick || {})[rival] || '';

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
  const seg = (on) => ({ padding: '5px 12px', fontSize: '12px', cursor: 'pointer', color: on ? '#111' : '#888', backgroundColor: on ? C.cyan : 'transparent', fontWeight: on ? 'bold' : 'normal' });
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

  const step = (s, i) => {
    const color = s.us ? C.cyan : C.red;
    return (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${color}`, backgroundColor: `${color}22`, borderRadius: '3px', overflow: 'hidden', fontSize: '11px' }}>
        <i style={{ fontStyle: 'normal', fontWeight: 'bold', backgroundColor: color, color: '#111', padding: '2px 5px' }}>{KIND[s.kind]}</i>
        <b style={{ padding: '2px 6px', color: '#fff' }}>{s.map}{!s.us && s.chance < 0.995 ? <span style={{ color: '#aaa', fontWeight: 'normal' }}> {pct(s.chance)}</span> : null}</b>
      </span>
    );
  };

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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={label}>First pick</span>
          <div style={{ display: 'inline-flex', border: '1px solid #444', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#1e212b' }}>
            <span style={seg(state.weFirst)} onClick={() => setState(s => ({ ...s, weFirst: true }))}>Emputors</span>
            <span style={seg(!state.weFirst)} onClick={() => setState(s => ({ ...s, weFirst: false }))}>Rival</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={label}>Our first pick</span>
          <select value={firstPick} onChange={(e) => setFirstPick(e.target.value)} style={{ backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '5px 8px', fontSize: '12px' }}>
            <option value="">Best ({result.firstPicks[0]?.map})</option>
            {result.firstPicks.map(f => <option key={f.map} value={f.map}>{f.map} ({pct(f.win)})</option>)}
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
                    <div style={{ display: 'flex', gap: '6px' }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '6px' }}>
              <thead>
                <tr style={{ color: '#888', fontSize: '11px' }}><th style={{ textAlign: 'left', padding: '4px', width: '150px' }}>Rival picks</th><th style={{ textAlign: 'left', padding: '4px' }}>Draft</th><th style={{ textAlign: 'left', padding: '4px', width: '50px' }}>Win</th></tr>
              </thead>
              <tbody>
                {result.lines.slice(0, 4).map(l => (
                  <tr key={l.theirPicks.join('+')} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '6px 4px', verticalAlign: 'middle' }}><b style={{ color: '#fff' }}>{l.theirPicks.join(' + ')}</b><div style={{ color: '#888' }}>{pct(l.prob)} likely</div></td>
                    <td style={{ padding: '6px 4px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        {l.steps.map(step)}
                        <span style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #888', borderRadius: '3px', overflow: 'hidden', fontSize: '11px' }}>
                          <i style={{ fontStyle: 'normal', fontWeight: 'bold', backgroundColor: '#888', color: '#111', padding: '2px 5px' }}>LEFT</i>
                          <b style={{ padding: '2px 6px', color: '#fff' }}>{l.start}</b>
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '6px 4px', fontWeight: 'bold', color: toneOf(l.win) }}>{pct(l.win)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: '10px', color: '#777', marginTop: '8px', lineHeight: 1.4 }}>
              Cyan = us, red = rival with the chance of their most likely move. Each row shows the most likely way the draft goes once the rival has those picks. Left = the map nobody chose; the match starts on it.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
