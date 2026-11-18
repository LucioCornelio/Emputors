import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

// Civ Planner: share out the suggested civs of each map's plan across the 3 (PA3) or 5 (BO5)
// maps, with no civ used twice.
// - Sandbox: saved in this browser only (localStorage).
// - Matches (cw7_civ_scenarios, one row per match): several scenarios, one per possible map
//   draft outcome, plus match-only edits of the role priority lists. Members read, admin writes.
const STORAGE_KEY = 'cw7-civ-planner-v1';
const MATCH_KEY = 'cw7-civ-planner-match';
const EMPTY_SCENARIO = { maps: [], plans: {}, assigned: {}, players: {} };
const EMPTY = { mode: 'PA3', ...EMPTY_SCENARIO, role_edits: {} };
const ALT_COUNT = 3;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TABLE = 'cw7_civ_scenarios';

const load = () => {
  try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; } catch { return EMPTY; }
};
const scenarioOnly = (s) => ({ maps: s.maps || [], plans: s.plans || {}, assigned: s.assigned || {}, players: s.players || {} });
const editKey = (map, plan, role) => `${map}|${plan}|${role}`;

// Everything the planner derives from one scenario (used for the active one, Compare and Copy)
const analyze = (sc, draftPlans, roleEdits) => {
  const planOf = (map) => {
    const names = draftPlans[map] ? Object.keys(draftPlans[map]) : [];
    return names.includes(sc.plans[map]) ? sc.plans[map] : names[0];
  };
  const rolesOf = (map) => {
    const p = planOf(map);
    if (!p) return [];
    return (draftPlans[map][p] || []).map(r => {
      const edit = roleEdits[editKey(map, p, r.role)];
      return edit ? { ...r, priority: edit, edited: true } : r;
    });
  };
  const slot = (map) => (sc.assigned[map] || {})[planOf(map)] || {};
  const usedBy = {};
  sc.maps.forEach(map => Object.entries(slot(map)).forEach(([role, civ]) => { if (civ) usedBy[civ] = { map, role }; }));
  const playerOf = (map, role) => (sc.players || {})[`${map}|${role}`] || '';
  // Favourite = assigned civ; alternatives = next civs of the role list not used anywhere
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
  const mapsText = () => sc.maps.filter(m => rolesOf(m).length).map(mapText).join('\n\n');
  return { planOf, rolesOf, slot, usedBy, playerOf, summaryOf, mapText, mapsText };
};

export default function CivPlanner({ C, MAP_POOL, CIVS, draftPlans, getCivImage, getMapImageName, isAdmin, rivalNames }) {
  const [sandbox, setSandbox] = useState(load);
  const [matches, setMatches] = useState([]);
  const [matchId, setMatchId] = useState(() => { try { return localStorage.getItem(MATCH_KEY) || ''; } catch { return ''; } });
  const [scIdx, setScIdx] = useState(0);
  const [view, setView] = useState('plan');
  const [saveStatus, setSaveStatus] = useState('');
  const [editing, setEditing] = useState(null); // editKey of the role whose list is being edited
  const [copied, setCopied] = useState('');
  const dirty = useRef(new Set());
  const timer = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sandbox)); } catch { /* storage unavailable */ }
  }, [sandbox]);
  useEffect(() => {
    try { localStorage.setItem(MATCH_KEY, matchId); } catch { /* storage unavailable */ }
  }, [matchId]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from(TABLE).select('*').order('match_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
      if (error) { console.error('Error loading civ planner matches:', error); return; }
      setMatches(data || []);
      if (data && !data.some(m => m.id === matchId)) setMatchId('');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const match = matches.find(m => m.id === matchId) || null;
  const scenarios = match ? (match.scenarios || []) : [];
  const activeIdx = match ? Math.min(scIdx, Math.max(scenarios.length - 1, 0)) : 0;
  const scenario = match ? scOrEmpty(scenarios[activeIdx]) : scenarioOnly(sandbox);
  const mode = match ? match.mode : sandbox.mode;
  const roleEdits = (match ? match.role_edits : sandbox.role_edits) || {};
  const editable = !match || isAdmin;
  const { maps } = scenario;
  const required = mode === 'PA3' ? 3 : 5;
  const A = analyze(scenario, draftPlans, roleEdits);
  const { planOf, rolesOf, slot, usedBy, playerOf } = A;

  // --- saving (matches only, debounced; RLS lets only the admin write) ---
  const flush = async () => {
    const ids = Array.from(dirty.current);
    dirty.current.clear();
    setSaveStatus('saving');
    let ok = true;
    for (const id of ids) {
      const m = matchesRef.current.find(x => x.id === id);
      if (!m) continue;
      const { data, error } = await supabase.from(TABLE).update({
        match_name: m.match_name, rival_name: m.rival_name || null, mode: m.mode, match_date: m.match_date || null,
        scenarios: m.scenarios, role_edits: m.role_edits, updated_at: new Date().toISOString(),
      }).eq('id', id).select('id');
      if (error || !data?.length) { ok = false; console.error('Save failed', error); }
    }
    setSaveStatus(ok ? 'saved' : 'error');
  };
  const matchesRef = useRef(matches);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  const patchMatch = (fn) => {
    if (!match || !isAdmin) return;
    const id = match.id;
    setMatches(ms => ms.map(m => (m.id === id ? fn(m) : m)));
    dirty.current.add(id);
    setSaveStatus('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };

  // setState for the active scenario (sandbox or match); fn receives { mode, ...scenario }
  const setState = (fn) => {
    if (!editable) return;
    if (!match) { setSandbox(s => ({ ...s, ...fn(s) })); return; }
    patchMatch(m => {
      const list = [...(m.scenarios || [])];
      const cur = { mode: m.mode, ...scOrEmpty(list[activeIdx]) };
      list[activeIdx] = scenarioOnly(fn(cur));
      return { ...m, scenarios: list };
    });
  };
  const setRoleEdits = (fn) => {
    if (!editable) return;
    if (!match) setSandbox(s => ({ ...s, role_edits: fn(s.role_edits || {}) }));
    else patchMatch(m => ({ ...m, role_edits: fn(m.role_edits || {}) }));
  };

  // civ -> number of selected maps whose plan suggests it (overlaps)
  const demand = {};
  maps.forEach(map => new Set(rolesOf(map).flatMap(r => r.priority || [])).forEach(c => { demand[c] = (demand[c] || 0) + 1; }));

  const setMode = (m) => {
    const n = m === 'PA3' ? 3 : 5;
    if (!match) setSandbox(s => ({ ...s, mode: m, maps: s.maps.slice(0, n) }));
    else patchMatch(x => ({ ...x, mode: m, scenarios: (x.scenarios || []).map(s => ({ ...s, maps: (s.maps || []).slice(0, n) })) }));
  };
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
  const setPlayer = (map, role, v) => setState(s => ({ ...s, players: { ...(s.players || {}), [`${map}|${role}`]: v } }));

  // --- role list edits (match only, or sandbox) ---
  const baseRole = (map, role) => ((draftPlans[map] || {})[planOf(map)] || []).find(r => r.role === role) || { priority: [] };
  const editList = (map, role, fn) => {
    const key = editKey(map, planOf(map), role);
    setRoleEdits(e => {
      const cur = e[key] || baseRole(map, role).priority || [];
      return { ...e, [key]: fn([...cur]) };
    });
  };
  const resetRole = (map, role) => {
    const key = editKey(map, planOf(map), role);
    setRoleEdits(e => { const n = { ...e }; delete n[key]; return n; });
  };
  const moveCiv = (map, role, i, d) => editList(map, role, l => { const j = i + d; if (j < 0 || j >= l.length) return l; [l[i], l[j]] = [l[j], l[i]]; return l; });
  const removeCiv = (map, role, i) => editList(map, role, l => { l.splice(i, 1); return l; });
  const addCiv = (map, role, civ) => civ && editList(map, role, l => (l.includes(civ) ? l : [...l, civ]));

  // --- matches and scenarios ---
  const scenarioName = (sc, i) => `${LETTERS[i] || i + 1} · ${sc.maps?.length ? sc.maps.join(', ') : 'No maps yet'}`;
  const newMatch = async () => {
    if (!isAdmin) return;
    const first = scenarioOnly(scenario);
    const { data, error } = await supabase.from(TABLE).insert({ match_name: 'New match', mode, scenarios: [first], role_edits: roleEdits }).select('*');
    if (error || !data?.length) { console.error('Create match failed', error); setSaveStatus('error'); return; }
    setMatches(ms => [data[0], ...ms]);
    setMatchId(data[0].id);
    setScIdx(0);
    setView('plan');
  };
  const deleteMatch = async () => {
    if (!match || !isAdmin || !window.confirm(`Permanently delete the match "${match.match_name}" and all its scenarios?`)) return;
    const { data, error } = await supabase.from(TABLE).delete().eq('id', match.id).select('id');
    if (error || !data?.length) { console.error('Delete match failed', error); setSaveStatus('error'); return; }
    setMatches(ms => ms.filter(m => m.id !== match.id));
    setMatchId('');
  };
  const addScenario = (copy) => {
    patchMatch(m => ({ ...m, scenarios: [...(m.scenarios || []), copy ? JSON.parse(JSON.stringify(scenarioOnly(scenario))) : { ...EMPTY_SCENARIO }] }));
    setScIdx(scenarios.length);
    setView('plan');
  };
  const deleteScenario = (i) => {
    if (scenarios.length <= 1 || !window.confirm(`Delete scenario ${scenarioName(scenarios[i], i)}?`)) return;
    patchMatch(m => ({ ...m, scenarios: m.scenarios.filter((_, k) => k !== i) }));
    setScIdx(Math.max(0, i - 1));
  };
  const setMatchField = (field, value) => patchMatch(m => ({ ...m, [field]: value }));
  const selectMatch = (id) => { setMatchId(id); setScIdx(0); setEditing(null); setView('plan'); };

  // --- texts ---
  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard blocked */ }
  };
  const title = match ? `*${(match.match_name || 'MATCH').toUpperCase()}*` : '*CW7 PLAN A*';
  const scenarioText = (sc, i) => {
    const head = match ? `${title} (${mode}), scenario ${scenarioName(sc, i)}` : `${title} (${mode})`;
    return [head, analyze(scOrEmpty(sc), draftPlans, roleEdits).mapsText()].filter(Boolean).join('\n\n');
  };
  const allScenariosText = () => scenarios.map((sc, i) => scenarioText(sc, i)).join('\n\n\n');

  const civIcon = (civ, size, extra = {}) => (
    <img src={`/civs/${getCivImage(civ)}`} alt={civ} style={{ width: size, height: size, borderRadius: '3px', flexShrink: 0, ...extra }} onError={(e) => { e.target.style.display = 'none'; }} />
  );
  const totalRoles = maps.reduce((n, m) => n + rolesOf(m).length, 0);
  const filled = maps.reduce((n, m) => n + rolesOf(m).filter(r => slot(m)[r.role]).length, 0);
  const copyBtn = (key, text, txt) => (
    <button onClick={() => copy(key, text)} style={{ backgroundColor: copied === key ? C.green : 'transparent', color: copied === key ? '#161920' : C.cyan, border: `1px solid ${copied === key ? C.green : C.cyan}`, padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{copied === key ? 'COPIED' : txt}</button>
  );
  const btn = (txt, onClick, color = C.cyan, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{ backgroundColor: 'transparent', color: disabled ? '#555' : color, border: `1px solid ${disabled ? '#444' : color}`, padding: '4px 12px', borderRadius: '4px', cursor: disabled ? 'default' : 'pointer', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{txt}</button>
  );
  const label = { color: C.cyan, fontSize: '11px', margin: 0, textTransform: 'uppercase', fontWeight: 'bold' };
  const input = { backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '3px', padding: '4px 6px', fontSize: '11px', outline: 'none' };
  const statusText = { pending: 'Unsaved changes', saving: 'Saving', saved: 'Saved', error: 'Not saved (log in as admin on this domain)' }[saveStatus] || '';

  // --- Compare: map/role rows across scenarios ---
  const compareRows = () => {
    const rows = [];
    const seen = new Set();
    const analyses = scenarios.map(sc => analyze(scOrEmpty(sc), draftPlans, roleEdits));
    MAP_POOL.forEach(map => {
      analyses.forEach((an, i) => {
        if (!scenarios[i].maps?.includes(map)) return;
        an.rolesOf(map).forEach(r => {
          const k = `${map}|${r.role}`;
          if (seen.has(k)) return;
          seen.add(k);
          const cells = analyses.map((a, j) => (scenarios[j].maps?.includes(map) ? { civ: a.slot(map)[r.role] || null, plan: a.planOf(map) } : null));
          const counts = {};
          cells.forEach(c => { if (c?.civ) counts[c.civ] = (counts[c.civ] || 0) + 1; });
          const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
          rows.push({ map, role: r.role, cells, common });
        });
      });
    });
    return rows;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {/* MATCH BAR */}
      <div style={{ backgroundColor: C.card, padding: '12px 15px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h3 style={label}>Match</h3>
          <select value={matchId} onChange={(e) => selectMatch(e.target.value)} style={{ ...input, color: C.cyan, padding: '5px 8px', fontSize: '12px', minWidth: '260px', cursor: 'pointer' }}>
            <option value="">Sandbox (this browser only)</option>
            {matches.map(m => <option key={m.id} value={m.id}>{m.match_name}{m.rival_name ? ` vs ${m.rival_name}` : ''} ({m.mode}{m.match_date ? `, ${m.match_date}` : ''}, {(m.scenarios || []).length} scenarios)</option>)}
          </select>
          {isAdmin && btn(match ? '+ NEW MATCH' : '+ SAVE AS MATCH', newMatch)}
          <span style={{ color: '#888', fontSize: '11px' }}>
            {match ? (isAdmin ? 'Saved for the clan. Changes save automatically.' : 'Read only: only the admin can change saved matches.') : (isAdmin ? 'Sandbox: only in this browser. "Save as match" stores it for the clan with this setup as scenario A.' : 'Sandbox: only in this browser.')}
          </span>
          {match && isAdmin && <span style={{ color: saveStatus === 'error' ? C.red : saveStatus === 'saved' ? C.green : '#888', fontSize: '11px', fontWeight: 'bold' }}>{statusText}</span>}
          {match && isAdmin && <span style={{ marginLeft: 'auto' }}>{btn('DELETE MATCH', deleteMatch, C.red)}</span>}
        </div>
        {match && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#888', fontSize: '11px' }}>Name</span>
            <input value={match.match_name || ''} disabled={!isAdmin} onChange={(e) => setMatchField('match_name', e.target.value)} style={{ ...input, width: '200px' }} />
            <span style={{ color: '#888', fontSize: '11px' }}>Rival</span>
            <select value={match.rival_name || ''} disabled={!isAdmin} onChange={(e) => setMatchField('rival_name', e.target.value || null)} style={{ ...input, cursor: 'pointer' }}>
              <option value="">None</option>
              {Array.from(new Set([...(rivalNames || []), ...(match.rival_name ? [match.rival_name] : [])])).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={{ color: '#888', fontSize: '11px' }}>Date</span>
            <input type="date" value={match.match_date || ''} disabled={!isAdmin} onChange={(e) => setMatchField('match_date', e.target.value || null)} style={{ ...input, colorScheme: 'dark' }} />
            <div style={{ display: 'flex', backgroundColor: '#1e212b', borderRadius: '4px', border: '1px solid #444', overflow: 'hidden' }}>
              {['PA3', 'BO5'].map(m => (
                <button key={m} disabled={!isAdmin} onClick={() => setMode(m)} style={{ backgroundColor: mode === m ? C.cyan : 'transparent', color: mode === m ? '#161920' : '#888', border: 'none', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', cursor: isAdmin ? 'pointer' : 'default' }}>{m}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SCENARIO TABS */}
      {match && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: `1px solid ${C.border}` }}>
          {scenarios.map((sc, i) => {
            const on = view === 'plan' && i === activeIdx;
            return (
              <div key={i} onClick={() => { setScIdx(i); setView('plan'); setEditing(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backgroundColor: on ? C.gold : C.card, color: on ? '#161920' : '#aaa', border: `1px solid ${on ? C.gold : C.border}`, borderBottom: 'none' }}>
                {scenarioName(sc, i)}
                {isAdmin && scenarios.length > 1 && on && <span onClick={(e) => { e.stopPropagation(); deleteScenario(i); }} title="Delete this scenario" style={{ color: '#161920', opacity: 0.6, fontSize: '13px' }}>✕</span>}
              </div>
            );
          })}
          {isAdmin && <div onClick={() => addScenario(false)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: C.cyan }}>+ Scenario</div>}
          {isAdmin && <div onClick={() => addScenario(true)} title="Copy the current scenario (maps, civs and players) as a new one" style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: C.cyan }}>Duplicate</div>}
          <div onClick={() => setView('compare')} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backgroundColor: view === 'compare' ? C.gold : 'transparent', color: view === 'compare' ? '#161920' : C.cyan }}>Compare</div>
        </div>
      )}

      {view === 'compare' && match ? (
        <div style={{ backgroundColor: C.card, padding: '12px 15px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ ...label, color: C.gold }}>Compare scenarios</span>
            <span style={{ color: '#888', fontSize: '11px' }}>Gold: same civ as most scenarios. Blue: this scenario uses a different civ for that map and role. Click a scenario to open it.</span>
            <span style={{ marginLeft: 'auto' }}>{copyBtn('scenarios', allScenariosText(), 'COPY ALL SCENARIOS')}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ ...label, textAlign: 'left', padding: '6px 8px', border: `1px solid ${C.border}` }}>Map / role</th>
                  {scenarios.map((sc, i) => (
                    <th key={i} onClick={() => { setScIdx(i); setView('plan'); }} style={{ ...label, textAlign: 'left', padding: '6px 8px', border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{scenarioName(sc, i)}</span>
                        <span style={{ marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>{copyBtn(`sc-${i}`, scenarioText(sc, i), 'COPY')}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows().map(row => (
                  <tr key={`${row.map}|${row.role}`}>
                    <td style={{ padding: '5px 8px', border: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{row.map}</span> <span style={{ color: C.gold, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{row.role}</span>
                    </td>
                    {row.cells.map((cell, i) => (
                      <td key={i} style={{ padding: '5px 8px', border: `1px solid ${C.border}` }}>
                        {!cell ? <span style={{ color: '#555' }}>Not played</span>
                          : !cell.civ ? <span style={{ color: '#666' }}>TBD</span>
                          : <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: cell.civ === row.common ? C.gold : C.blue, fontWeight: 'bold' }}>{civIcon(cell.civ, 18)}{cell.civ}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (<>
      <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={label}>Select maps ({maps.length}/{required})</h3>
          {!match && (
            <div style={{ display: 'flex', backgroundColor: '#1e212b', borderRadius: '4px', border: '1px solid #444', overflow: 'hidden' }}>
              {['PA3', 'BO5'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ backgroundColor: mode === m ? C.cyan : 'transparent', color: mode === m ? '#161920' : '#888', border: 'none', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{m}</button>
              ))}
            </div>
          )}
          <span style={{ color: '#888', fontSize: '11px' }}>Click a suggested civ to put it in that role. A civ can only be used once: picking it again on another map moves it there. "Edit list" changes a role's civ list for this {match ? 'match' : 'sandbox'} only, not the plan.</span>
          {editable && <span style={{ marginLeft: 'auto' }}>{btn('CLEAR ASSIGNMENTS', clearAll, C.red, filled === 0)}</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MAP_POOL.map(map => {
            const sel = maps.includes(map);
            return (
              <div key={map} onClick={() => toggleMap(map)} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', border: `2px solid ${sel ? C.gold : '#444'}`, cursor: editable ? 'pointer' : 'default', overflow: 'hidden', filter: sel ? 'brightness(1.1)' : 'grayscale(0.6)' }}>
                <img src={`/maps/${getMapImageName(map)}.png`} alt={map} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', color: sel ? C.gold : '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>{map}</div>
              </div>
            );
          })}
        </div>
      </div>

      {maps.length > 0 && (
        <div style={{ backgroundColor: C.card, padding: '10px 15px', borderRadius: '6px', border: `1px solid ${C.gold}55`, display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ ...label, color: C.gold }}>{match ? `Scenario ${LETTERS[activeIdx]}` : 'Plan A'} ({filled}/{totalRoles})</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${required > 3 ? 5 : 3}, minmax(0, 1fr))`, gap: '10px' }}>
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
                  <select value={active} disabled={!editable} onChange={(e) => setPlan(map, e.target.value)} style={{ width: '100%', backgroundColor: '#161920', color: C.cyan, border: '1px solid #444', padding: '2px 4px', borderRadius: '3px', fontSize: '10px', outline: 'none', cursor: 'pointer' }}>
                    {planNames.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
              </div>
              <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rolesOf(map).map(r => {
                  const civ = slot(map)[r.role];
                  const ess = r.essential || [];
                  const key = editKey(map, active, r.role);
                  const isEditing = editing === key;
                  const list = r.priority || [];
                  return (
                    <div key={r.role} style={{ backgroundColor: '#161920', border: `1px solid ${isEditing ? C.cyan : civ ? C.blue + '88' : C.border}`, borderRadius: '4px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: C.gold, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{r.role}</span>
                        {r.edited && <span title={`Civ list edited for this ${match ? 'match' : 'sandbox'} only. The plan in Plan Creator is unchanged.`} style={{ fontSize: '8px', fontWeight: 'bold', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: '3px', padding: '0 3px' }}>{match ? 'MATCH EDIT' : 'EDITED'}</span>}
                        {editable && <span onClick={() => setEditing(isEditing ? null : key)} style={{ color: C.cyan, fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}>{isEditing ? 'DONE' : 'EDIT LIST'}</span>}
                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {civ ? (<>{civIcon(civ, 22)}<span style={{ color: C.blue, fontSize: '11px', fontWeight: 'bold' }}>{civ}</span></>) : <span style={{ color: '#555', fontSize: '10px' }}>Empty</span>}
                        </span>
                      </div>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {list.map((c, pos) => (
                            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1e212b', borderRadius: '3px', padding: '2px 4px' }}>
                              <span style={{ color: '#666', fontSize: '9px', width: '12px', textAlign: 'right' }}>{pos + 1}</span>
                              {civIcon(c, 18)}
                              <span style={{ color: '#ccc', fontSize: '10px' }}>{c}</span>
                              <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px', fontSize: '11px' }}>
                                <span onClick={() => moveCiv(map, r.role, pos, -1)} title="Move up" style={{ cursor: 'pointer', color: pos ? C.cyan : '#444' }}>▲</span>
                                <span onClick={() => moveCiv(map, r.role, pos, 1)} title="Move down" style={{ cursor: 'pointer', color: pos < list.length - 1 ? C.cyan : '#444' }}>▼</span>
                                <span onClick={() => removeCiv(map, r.role, pos)} title="Remove from this list" style={{ cursor: 'pointer', color: C.red }}>✕</span>
                              </span>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <select value="" onChange={(e) => addCiv(map, r.role, e.target.value)} style={{ ...input, flex: 1, minWidth: 0, color: C.cyan, padding: '2px 4px', fontSize: '10px', cursor: 'pointer' }}>
                              <option value="">+ Add civ</option>
                              {(CIVS || []).filter(c => !list.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {r.edited && <span onClick={() => resetRole(map, r.role)} style={{ color: C.red, fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>RESET TO PLAN</span>}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {list.map((c, pos) => {
                            const mine = civ === c;
                            const other = usedBy[c] && !mine ? usedBy[c] : null;
                            const shared = (demand[c] || 0) > 1;
                            const tip = mine ? `${c} (#${pos + 1}): click to remove`
                              : other ? `${c} (#${pos + 1}): used on ${other.map} (${other.role}). Click to move it here`
                              : `${c} (#${pos + 1})${shared ? `: suggested on ${demand[c]} of these maps` : ''}`;
                            return (
                              <div key={c} onClick={() => assign(map, r.role, c)} title={tip} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 4px 2px 2px', borderRadius: '3px', cursor: editable ? 'pointer' : 'default', backgroundColor: mine ? C.blue + '33' : '#1e212b', border: `1px solid ${mine ? C.blue : shared && !other ? C.gold + '66' : '#333'}`, opacity: other ? 0.35 : 1 }}>
                                <span style={{ color: '#666', fontSize: '9px', width: '12px', textAlign: 'right' }}>{pos + 1}</span>
                                {civIcon(c, 20, { outline: ess.includes(c) ? '2px solid #ff4444' : 'none' })}
                                <span style={{ color: mine ? C.blue : '#ccc', fontSize: '10px', textDecoration: other ? 'line-through' : 'none' }}>{c}</span>
                                {other && <span style={{ color: C.gold, fontSize: '8px', fontWeight: 'bold' }}>{other.map}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
            <span style={{ marginLeft: 'auto' }}>{copyBtn('all', scenarioText(scenario, activeIdx), 'COPY ALL MAPS')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '10px' }}>
            {maps.filter(m => rolesOf(m).length).map(map => (
              <div key={map} style={{ backgroundColor: '#161920', border: `1px solid ${C.border}`, borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{map}</span>
                  <span style={{ color: '#666', fontSize: '10px' }}>{planOf(map)}</span>
                  <span style={{ marginLeft: 'auto' }}>{copyBtn(map, A.mapText(map), 'COPY')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'max-content 90px 1fr', alignItems: 'center', gap: '5px 8px', textAlign: 'left' }}>
                {A.summaryOf(map).map(x => (
                  <div key={x.role} style={{ display: 'contents' }}>
                    <span style={{ color: C.gold, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{x.role}</span>
                    <input value={playerOf(map, x.role)} disabled={!editable} onChange={(e) => setPlayer(map, x.role, e.target.value)} placeholder="Player" style={{ ...input, minWidth: 0, padding: '2px 5px' }} />
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
      </>)}
    </div>
  );
}

function scOrEmpty(sc) { return scenarioOnly(sc || EMPTY_SCENARIO); }
