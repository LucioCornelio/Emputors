import { useState, useEffect } from 'react';

// Civ Planner: offline sandbox to share out the suggested civs of each map's plan
// across the 3 (PA3) or 5 (BO5) maps, with no civ used twice. Saved in this browser only.
const STORAGE_KEY = 'cw7-civ-planner-v1';
const EMPTY = { mode: 'PA3', maps: [], plans: {}, assigned: {}, players: {} };
const ALT_COUNT = 3;

const load = () => {
  try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; } catch { return EMPTY; }
};

export default function CivPlanner({ C, MAP_POOL, draftPlans, getCivImage, getMapImageName }) {
  const [state, setState] = useState(load);
  const { mode, maps, plans, assigned } = state;
  const required = mode === 'PA3' ? 3 : 5;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state]);

  const planOf = (map) => {
    const names = draftPlans[map] ? Object.keys(draftPlans[map]) : [];
    return names.includes(plans[map]) ? plans[map] : names[0];
  };
  const rolesOf = (map) => { const p = planOf(map); return p ? draftPlans[map][p] || [] : []; };
  const slot = (map) => (assigned[map] || {})[planOf(map)] || {};

  // civ -> { map, role } for every civ assigned in the active plan of a selected map
  const usedBy = {};
  maps.forEach(map => Object.entries(slot(map)).forEach(([role, civ]) => { if (civ) usedBy[civ] = { map, role }; }));

  // civ -> number of selected maps whose plan suggests it (overlaps)
  const demand = {};
  maps.forEach(map => new Set(rolesOf(map).flatMap(r => r.priority || [])).forEach(c => { demand[c] = (demand[c] || 0) + 1; }));

  const setMode = (m) => setState(s => ({ ...s, mode: m, maps: s.maps.slice(0, m === 'PA3' ? 3 : 5) }));
  const toggleMap = (map) => setState(s => {
    if (s.maps.includes(map)) return { ...s, maps: s.maps.filter(x => x !== map) };
    if (s.maps.length >= required) return s;
    return { ...s, maps: [...s.maps, map] };
  });
  const setPlan = (map, p) => setState(s => ({ ...s, plans: { ...s.plans, [map]: p } }));

  const assign = (map, role, civ) => setState(s => {
    const next = { ...s.assigned };
    const write = (m, r, v) => {
      const p = planOf(m);
      const byPlan = { ...(next[m] || {}) };
      byPlan[p] = { ...(byPlan[p] || {}), [r]: v };
      next[m] = byPlan;
    };
    const current = slot(map)[role];
    if (current === civ) { write(map, role, null); return { ...s, assigned: next }; }
    const prev = usedBy[civ];
    if (prev) write(prev.map, prev.role, null);
    write(map, role, civ);
    return { ...s, assigned: next };
  });

  const clearAll = () => setState(s => {
    const next = { ...s.assigned };
    s.maps.forEach(m => {
      const p = planOf(m);
      if (next[m]?.[p]) next[m] = { ...next[m], [p]: {} };
    });
    return { ...s, assigned: next };
  });

  const civIcon = (civ, size, extra = {}) => (
    <img src={`/civs/${getCivImage(civ)}`} alt={civ} style={{ width: size, height: size, borderRadius: '3px', flexShrink: 0, ...extra }} onError={(e) => { e.target.style.display = 'none'; }} />
  );

  const totalRoles = maps.reduce((n, m) => n + rolesOf(m).length, 0);
  const filled = maps.reduce((n, m) => n + rolesOf(m).filter(r => slot(m)[r.role]).length, 0);
  const [copied, setCopied] = useState('');
  const playerOf = (map, role) => (state.players || {})[`${map}|${role}`] || '';
  const setPlayer = (map, role, v) => setState(s => ({ ...s, players: { ...(s.players || {}), [`${map}|${role}`]: v } }));

  // Favourite = assigned civ; second options = next civs of the role list not used anywhere
  const summaryOf = (map) => rolesOf(map).map(r => {
    const fav = slot(map)[r.role] || null;
    const alts = (r.priority || []).filter(c => c !== fav && !usedBy[c]).slice(0, ALT_COUNT);
    return { role: r.role, player: playerOf(map, r.role).trim(), fav, alts };
  });
  const mapText = (map) => {
    const lines = [`*${map.toUpperCase()}* (${planOf(map) || 'no plan'})`];
    summaryOf(map).forEach(x => {
      lines.push(`- ${x.role}${x.player ? ` (${x.player})` : ''}: *${x.fav || 'TBD'}*${x.alts.length ? `. Alt: ${x.alts.join(', ')}` : ''}`);
    });
    return lines.join('\n');
  };
  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard blocked */ }
  };
  const allText = () => [`*CW7 PLAN A* (${mode})`, ...maps.filter(m => rolesOf(m).length).map(mapText)].join('\n\n');
  const copyBtn = (key, text, txt) => (
    <button onClick={() => copy(key, text)} style={{ backgroundColor: copied === key ? C.green : 'transparent', color: copied === key ? '#161920' : C.cyan, border: `1px solid ${copied === key ? C.green : C.cyan}`, padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{copied === key ? 'COPIED' : txt}</button>
  );

  const label = { color: C.cyan, fontSize: '11px', margin: 0, textTransform: 'uppercase', fontWeight: 'bold' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={label}>Select maps ({maps.length}/{required})</h3>
          <div style={{ display: 'flex', backgroundColor: '#1e212b', borderRadius: '4px', border: '1px solid #444', overflow: 'hidden' }}>
            {['PA3', 'BO5'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ backgroundColor: mode === m ? C.cyan : 'transparent', color: mode === m ? '#161920' : '#888', border: 'none', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{m}</button>
            ))}
          </div>
          <span style={{ color: '#888', fontSize: '11px' }}>Click a suggested civ to put it in that role. A civ can only be used once: picking it again on another map moves it there. Saved in this browser.</span>
          <button onClick={clearAll} disabled={filled === 0} style={{ marginLeft: 'auto', backgroundColor: 'transparent', color: filled ? C.red : '#555', border: `1px solid ${filled ? C.red : '#444'}`, padding: '4px 12px', borderRadius: '4px', cursor: filled ? 'pointer' : 'default', fontSize: '10px', fontWeight: 'bold' }}>CLEAR ASSIGNMENTS</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MAP_POOL.map(map => {
            const sel = maps.includes(map);
            return (
              <div key={map} onClick={() => toggleMap(map)} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', border: `2px solid ${sel ? C.gold : '#444'}`, cursor: 'pointer', overflow: 'hidden', filter: sel ? 'brightness(1.1)' : 'grayscale(0.6)' }}>
                <img src={`/maps/${getMapImageName(map)}.png`} alt={map} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', color: sel ? C.gold : '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>{map}</div>
              </div>
            );
          })}
        </div>
      </div>

      {maps.length > 0 && (
        <div style={{ backgroundColor: C.card, padding: '10px 15px', borderRadius: '6px', border: `1px solid ${C.gold}55`, display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ ...label, color: C.gold }}>Plan A ({filled}/{totalRoles})</span>
          {maps.map(map => (
            <div key={map} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>{map}:</span>
              {rolesOf(map).map(r => {
                const civ = slot(map)[r.role];
                return civ
                  ? <span key={r.role} title={`${r.role}: ${civ}`}>{civIcon(civ, 22, { border: '1px solid #444' })}</span>
                  : <span key={r.role} title={`${r.role}: empty`} style={{ width: '22px', height: '22px', borderRadius: '3px', border: '1px dashed #555', display: 'inline-block' }} />;
              })}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maps.length > 3 ? 5 : 3}, minmax(0, 1fr))`, gap: '10px' }}>
        {Array.from({ length: required }).map((_, i) => {
          const map = maps[i];
          if (!map) return (
            <div key={`empty-${i}`} style={{ backgroundColor: C.card, borderRadius: '4px', border: '1px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
              <span style={{ color: '#555', fontSize: '11px', fontWeight: 'bold' }}>Select a map</span>
            </div>
          );
          const planNames = draftPlans[map] ? Object.keys(draftPlans[map]) : [];
          if (planNames.length === 0) return (
            <div key={map} style={{ backgroundColor: C.card, borderRadius: '4px', border: `1px solid ${C.red}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '8px' }}>
              <h4 style={{ color: '#fff', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>{map}</h4>
              <span style={{ color: C.red, fontSize: '11px', fontWeight: 'bold' }}>NO PLANS CREATED</span>
            </div>
          );
          const active = planOf(map);
          return (
            <div key={map} style={{ backgroundColor: C.card, borderRadius: '4px', border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ backgroundColor: '#1e212b', borderBottom: '1px solid #333', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={`/maps/${getMapImageName(map)}.png`} alt={map} style={{ width: '24px', height: '24px', borderRadius: '3px', border: '1px solid #444', objectFit: 'cover' }} />
                  <h4 style={{ color: '#fff', margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{map}</h4>
                </div>
                {planNames.length > 1 && (
                  <select value={active} onChange={(e) => setPlan(map, e.target.value)} style={{ width: '100%', backgroundColor: '#161920', color: C.cyan, border: '1px solid #444', padding: '2px 4px', borderRadius: '3px', fontSize: '10px', outline: 'none', cursor: 'pointer' }}>
                    {planNames.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
              </div>
              <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rolesOf(map).map(r => {
                  const civ = slot(map)[r.role];
                  const ess = r.essential || [];
                  return (
                    <div key={r.role} style={{ backgroundColor: '#161920', border: `1px solid ${civ ? C.blue + '88' : C.border}`, borderRadius: '4px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: C.gold, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{r.role}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {civ ? (<>{civIcon(civ, 22)}<span style={{ color: C.blue, fontSize: '11px', fontWeight: 'bold' }}>{civ}</span></>) : <span style={{ color: '#555', fontSize: '10px' }}>Empty</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(r.priority || []).map((c, pos) => {
                          const mine = civ === c;
                          const other = usedBy[c] && !mine ? usedBy[c] : null;
                          const shared = (demand[c] || 0) > 1;
                          const title = mine ? `${c} (#${pos + 1}): click to remove`
                            : other ? `${c} (#${pos + 1}): used on ${other.map} (${other.role}). Click to move it here`
                            : `${c} (#${pos + 1})${shared ? `: suggested on ${demand[c]} of these maps` : ''}`;
                          return (
                            <div key={c} onClick={() => assign(map, r.role, c)} title={title} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 4px 2px 2px', borderRadius: '3px', cursor: 'pointer', backgroundColor: mine ? C.blue + '33' : '#1e212b', border: `1px solid ${mine ? C.blue : shared && !other ? C.gold + '66' : '#333'}`, opacity: other ? 0.35 : 1 }}>
                              <span style={{ color: '#666', fontSize: '9px', width: '12px', textAlign: 'right' }}>{pos + 1}</span>
                              {civIcon(c, 20, { outline: ess.includes(c) ? '2px solid #ff4444' : 'none' })}
                              <span style={{ color: mine ? C.blue : '#ccc', fontSize: '10px', textDecoration: other ? 'line-through' : 'none' }}>{c}</span>
                              {other && <span style={{ color: C.gold, fontSize: '8px', fontWeight: 'bold' }}>{other.map}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {maps.some(m => rolesOf(m).length) && (
        <div style={{ backgroundColor: C.card, padding: '12px 15px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...label, color: C.gold }}>Summary</span>
            <span style={{ color: '#888', fontSize: '11px' }}>Favourite = assigned civ. Alternatives = next civs on the role list not used anywhere else. Type the player of each slot.</span>
            <span style={{ marginLeft: 'auto' }}>{copyBtn('all', allText(), 'COPY ALL MAPS')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '10px' }}>
            {maps.filter(m => rolesOf(m).length).map(map => (
              <div key={map} style={{ backgroundColor: '#161920', border: `1px solid ${C.border}`, borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{map}</span>
                  <span style={{ color: '#666', fontSize: '10px' }}>{planOf(map)}</span>
                  <span style={{ marginLeft: 'auto' }}>{copyBtn(map, mapText(map), 'COPY')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'max-content 90px 1fr', alignItems: 'center', gap: '5px 8px', textAlign: 'left' }}>
                {summaryOf(map).map(x => (
                  <div key={x.role} style={{ display: 'contents' }}>
                    <span style={{ color: C.gold, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{x.role}</span>
                    <input value={playerOf(map, x.role)} onChange={(e) => setPlayer(map, x.role, e.target.value)} placeholder="Player" style={{ minWidth: 0, backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '3px', padding: '2px 5px', fontSize: '11px', outline: 'none' }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                      {x.fav ? (<>{civIcon(x.fav, 18)}<strong style={{ color: C.blue, fontSize: '11px' }}>{x.fav}</strong></>) : <span style={{ color: '#555', fontSize: '11px' }}>TBD</span>}
                      {x.alts.length > 0 && <span style={{ color: '#666', fontSize: '10px', marginLeft: '4px' }}>Alt:</span>}
                      {x.alts.map(c => <span key={c} title={c} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#aaa', fontSize: '10px' }}>{civIcon(c, 14)}{c}</span>)}
                    </span>
                  </div>
                ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <span style={{ color: '#666', fontSize: '10px' }}>Gold frame: civ suggested on more than one of these maps. Red outline: essential. Crossed out: already used on another map.</span>
    </div>
  );
}
