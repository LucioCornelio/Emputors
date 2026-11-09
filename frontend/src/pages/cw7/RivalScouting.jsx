import { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { loadFinishedDraft, sideSummary, buildRivalModel } from './forecast';
import { htmlToText, detectPasteType, parseMatchPage, parseTeamStats, civsPlayedBy } from './matchPage';

const NEW_RIVAL = '__new__';

function CivIcon({ civ, getCivImage, size = 22, faded = false }) {
  return (
    <img src={`/civs/${getCivImage(civ)}`} alt={civ} title={civ}
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '3px', border: '1px solid #444', objectFit: 'cover', opacity: faded ? 0.4 : 1 }}
      onError={(e) => e.target.style.display = 'none'} />
  );
}

function RivalPicker({ rivals, value, onChange, newName, onNewName, input }) {
  return (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, flex: 1, cursor: 'pointer' }}>
        <option value="">- Select rival -</option>
        {rivals.map(r => <option key={r} value={r}>{r}</option>)}
        <option value={NEW_RIVAL}>+ New rival</option>
      </select>
      {value === NEW_RIVAL && (
        <input type="text" placeholder="Rival name (our own label)" value={newName} onChange={(e) => onNewName(e.target.value)} style={{ ...input, flex: 1 }} />
      )}
    </>
  );
}

function RivalScouting({ C, CIVS, getCivImage, rivalDrafts, refreshRivalDrafts, rivalProfiles, refreshRivalProfiles }) {
  const [draftInput, setDraftInput] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loaded, setLoaded] = useState(null);
  const [side, setSide] = useState("");
  const [rivalChoice, setRivalChoice] = useState("");
  const [newRivalName, setNewRivalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [profileRival, setProfileRival] = useState("");

  const [matchParsed, setMatchParsed] = useState(null);
  const [rivalTeam, setRivalTeam] = useState("");
  const [statsParsed, setStatsParsed] = useState(null);
  const [statsRival, setStatsRival] = useState("");
  const [statsNewName, setStatsNewName] = useState("");

  const rivals = useMemo(() => Array.from(new Set([...rivalDrafts.map(d => d.rival_name), ...rivalProfiles.map(p => p.rival_name)])).sort((a, b) => a.localeCompare(b)), [rivalDrafts, rivalProfiles]);
  const findRival = (name) => rivals.find(r => r.toLowerCase() === String(name || "").trim().toLowerCase());

  const flash = (text, type) => { setMessage({ text, type }); if (type === 'success') setTimeout(() => setMessage({ text: "", type: "" }), 4000); };

  const handleLoad = async (source) => {
    const target = source || draftInput;
    setLoadingDraft(true); setLoaded(null); setSide(""); setMessage({ text: "", type: "" });
    try {
      const res = await loadFinishedDraft(target);
      if (rivalDrafts.some(d => d.draft_id === res.draftId)) flash("This draft is already stored (you can store it again for the other side).", "info");
      setLoaded(res);
    } catch (err) {
      flash(`❌ ${err.message}`, "error");
    }
    setLoadingDraft(false);
  };

  // One paste box: recognises a match page or a team statistics page
  const handlePaste = (e) => {
    const html = e.clipboardData.getData('text/html');
    const text = html ? htmlToText(html) : e.clipboardData.getData('text/plain');
    e.preventDefault();
    const type = detectPasteType(text);
    if (type === 'match') {
      const p = parseMatchPage(text);
      setMatchParsed(p); setRivalTeam(""); setStatsParsed(null);
      if (p.draftUrl) { setDraftInput(p.draftUrl); handleLoad(p.draftUrl); }
      else flash("Match page read, but no Draft Civis link was found. Paste the draft link in the box below.", "info");
    } else if (type === 'teamStats') {
      const st = parseTeamStats(text);
      setStatsParsed(st); setMatchParsed(null);
      const existing = findRival(st.team);
      if (existing) { setStatsRival(existing); setStatsNewName(""); } else { setStatsRival(NEW_RIVAL); setStatsNewName(st.team); }
      if (Object.keys(st.maps).length === 0) flash("No civs found. Open every map section on the statistics page before copying.", "error");
    } else {
      flash("Not recognised. Copy the whole match page or team statistics page (Ctrl+A, Ctrl+C).", "error");
    }
  };

  // Picking the rival team from a match page also works out its draft side from the civs it played
  const chooseRivalTeam = (team) => {
    setRivalTeam(team);
    const existing = findRival(team);
    if (existing) { setRivalChoice(existing); setNewRivalName(""); } else { setRivalChoice(NEW_RIVAL); setNewRivalName(team); }
    if (loaded && matchParsed) {
      const played = civsPlayedBy(matchParsed, team);
      const overlap = (s) => sideSummary(loaded.data.events, s).picks.filter(c => played.includes(c)).length;
      const h = overlap('HOST'), g = overlap('GUEST');
      if (h !== g) setSide(h > g ? 'HOST' : 'GUEST');
    }
  };

  const handleSave = async () => {
    const rivalName = rivalChoice === NEW_RIVAL ? newRivalName.trim() : rivalChoice;
    if (!loaded || !side || !rivalName) { flash("⚠️ Choose the side and the rival first", "error"); return; }
    setSaving(true);
    const payload = {
      rival_name: rivalName,
      draft_id: loaded.draftId,
      rival_side: side,
      host_name: loaded.data.nameHost || null,
      guest_name: loaded.data.nameGuest || null,
      events: loaded.data.events || [],
      turns: loaded.data.preset?.turns || [],
    };
    const { data, error } = await supabase.from('cw7_rival_drafts').insert(payload).select();
    setSaving(false);
    if (error) { flash(`❌ Error saving: ${error.message}`, "error"); return; }
    if (!data || data.length === 0) { flash("❌ Not saved: no permission. Log in and try again.", "error"); return; }
    flash(`✅ Draft stored for ${rivalName}`, "success");
    setLoaded(null); setDraftInput(""); setSide(""); setNewRivalName(""); setRivalChoice(rivalName); setMatchParsed(null); setRivalTeam("");
    setProfileRival(rivalName);
    refreshRivalDrafts();
  };

  const handleSaveStats = async () => {
    const rivalName = statsRival === NEW_RIVAL ? statsNewName.trim() : statsRival;
    if (!statsParsed || !rivalName) { flash("⚠️ Choose the rival first", "error"); return; }
    setSaving(true);
    const payload = { rival_name: rivalName, team_name: statsParsed.team || null, map_stats: statsParsed.maps, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('cw7_rival_profiles').upsert(payload, { onConflict: 'rival_name' }).select();
    setSaving(false);
    if (error) { flash(`❌ Error saving: ${error.message}`, "error"); return; }
    if (!data || data.length === 0) { flash("❌ Not saved: no permission. Log in and try again.", "error"); return; }
    flash(`✅ Map statistics stored for ${rivalName}`, "success");
    setStatsParsed(null); setProfileRival(rivalName);
    refreshRivalProfiles();
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove draft ${row.draft_id} from ${row.rival_name}?`)) return;
    const { data, error } = await supabase.from('cw7_rival_drafts').delete().eq('id', row.id).select();
    if (error) { flash(`❌ Error deleting: ${error.message}`, "error"); return; }
    if (!data || data.length === 0) { flash("❌ Not deleted: no permission. Log in and try again.", "error"); return; }
    refreshRivalDrafts();
  };

  const profileDrafts = rivalDrafts.filter(d => d.rival_name === profileRival);
  const profileStats = rivalProfiles.find(p => p.rival_name === profileRival);
  const model = useMemo(() => (profileDrafts.length || profileStats) ? buildRivalModel(profileDrafts, CIVS, [], profileStats?.map_stats || null) : null, [profileDrafts, profileStats, CIVS]);
  const topCivs = model ? CIVS.filter(c => model.stats[c].rawPicks > 0 || model.stats[c].snipes > 0 || Object.keys(model.stats[c].playedOn).length > 0).sort((a, b) => (model.pref[b] - model.pref[a]) || (Object.keys(model.stats[b].playedOn).length - Object.keys(model.stats[a].playedOn).length)) : [];

  const box = { backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}` };
  const label = { fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' };
  const input = { backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', outline: 'none' };
  const greenBtn = (busy) => ({ backgroundColor: busy ? '#555' : C.green, color: '#161920', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: busy ? 'not-allowed' : 'pointer' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: C.textMain }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: C.gold, fontSize: '22px', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Rival Scouting</h1>
        <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Drafts show what each rival picks; team statistics show what they play on each map. Both feed the forecast in Execution Draft.</p>
      </div>

      {message.text && (
        <div style={{ padding: '8px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: message.type === 'error' ? C.red : message.type === 'info' ? C.gold : C.green, border: `1px solid ${message.type === 'error' ? C.red : message.type === 'info' ? C.gold : C.green}` }}>{message.text}</div>
      )}

      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

          {/* PASTE BOX */}
          <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ ...label, color: C.cyan }}>Paste a results page</span>
            <textarea
              onPaste={handlePaste}
              value=""
              onChange={() => {}}
              placeholder={"Open a MATCH page or a TEAM STATISTICS page on the results site, press Ctrl+A, Ctrl+C, then click here and press Ctrl+V.\nOn the statistics page, open every map section first."}
              style={{ ...input, minHeight: '64px', resize: 'vertical', fontFamily: 'inherit' }}
            />
            {matchParsed && (
              <span style={{ fontSize: '11px', color: '#aaa' }}>Match read: <strong style={{ color: '#fff' }}>{matchParsed.teams.join(' vs ')}</strong>, {matchParsed.games.length} map{matchParsed.games.length === 1 ? '' : 's'} with civs{matchParsed.draftUrl ? ', draft link found' : ''}.</span>
            )}
          </div>

          {/* TEAM STATISTICS PREVIEW */}
          {statsParsed && (
            <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ ...label, color: C.cyan }}>Team statistics: {statsParsed.team}</span>
              {Object.entries(statsParsed.maps).map(([map, civs]) => (
                <div key={map} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: C.gold, fontWeight: 'bold', width: '90px' }}>{map}</span>
                  {Object.entries(civs).sort((a, b) => b[1] - a[1]).map(([civ, n]) => (
                    <span key={civ} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#ccc' }}><CivIcon civ={civ} getCivImage={getCivImage} size={16} />{civ}{n > 1 ? ` x${n}` : ''}</span>
                  ))}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <RivalPicker rivals={rivals} value={statsRival} onChange={setStatsRival} newName={statsNewName} onNewName={setStatsNewName} input={input} />
                <button onClick={handleSaveStats} disabled={saving} style={greenBtn(saving)}>{saving ? 'SAVING...' : 'SAVE STATS'}</button>
              </div>
              <span style={{ fontSize: '10px', color: '#666' }}>Saving replaces the previous statistics of that rival.</span>
            </div>
          )}

          {/* ADD A FINISHED DRAFT */}
          <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ ...label, color: C.cyan }}>Add a finished draft</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" placeholder="aoe2cm draft URL or ID" value={draftInput} onChange={(e) => setDraftInput(e.target.value)} style={{ ...input, flex: 1 }} />
              <button onClick={() => handleLoad()} disabled={loadingDraft || !draftInput.trim()} style={{ backgroundColor: loadingDraft ? '#555' : C.cyan, color: '#161920', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: loadingDraft ? 'not-allowed' : 'pointer' }}>{loadingDraft ? 'LOADING...' : 'LOAD'}</button>
            </div>

            {loaded && matchParsed && matchParsed.teams.length === 2 && (
              <>
                <span style={{ ...label, color: C.cyan }}>Which team is the rival?</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {matchParsed.teams.map(t => (
                    <button key={t} onClick={() => chooseRivalTeam(t)} style={{ flex: 1, backgroundColor: rivalTeam === t ? 'rgba(255, 215, 0, 0.1)' : '#1e212b', color: rivalTeam === t ? C.gold : '#fff', border: `1px solid ${rivalTeam === t ? C.gold : '#444'}`, padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t}</button>
                  ))}
                </div>
              </>
            )}

            {loaded && (
              <>
                <span style={{ ...label, color: C.cyan }}>Rival side in the draft</span>
                <span style={{ fontSize: '11px', color: '#888' }}>{matchParsed ? 'Pre-selected from the civs the team played. Check it.' : 'Names are shown only as a reference: teams often draft under a captain\'s nick.'}</span>
                {['HOST', 'GUEST'].map(s => {
                  const sum = sideSummary(loaded.data.events, s);
                  const name = s === 'HOST' ? loaded.data.nameHost : loaded.data.nameGuest;
                  const sel = side === s;
                  return (
                    <label key={s} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px', borderRadius: '4px', cursor: 'pointer', border: `1px solid ${sel ? C.gold : '#444'}`, backgroundColor: sel ? 'rgba(255, 215, 0, 0.06)' : '#1e212b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="radio" name="rival-side" checked={sel} onChange={() => setSide(s)} />
                        <strong style={{ fontSize: '12px', color: sel ? C.gold : '#fff' }}>{s}</strong>
                        <span style={{ fontSize: '12px', color: '#aaa' }}>{name || '(no name)'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold', width: '42px' }}>PICKS</span>
                        {sum.picks.map(c => <CivIcon key={`p-${c}`} civ={c} getCivImage={getCivImage} />)}
                      </div>
                      {(sum.bans.length > 0 || sum.snipes.length > 0) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold', width: '42px' }}>BANS</span>
                          {sum.bans.map(c => <CivIcon key={`b-${c}`} civ={c} getCivImage={getCivImage} size={18} faded />)}
                          {sum.snipes.length > 0 && <span style={{ fontSize: '9px', color: C.red, fontWeight: 'bold', marginLeft: '6px' }}>SNIPES</span>}
                          {sum.snipes.map(c => <CivIcon key={`s-${c}`} civ={c} getCivImage={getCivImage} size={18} faded />)}
                        </div>
                      )}
                    </label>
                  );
                })}

                <span style={{ ...label, color: C.cyan }}>Assign it to a rival</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <RivalPicker rivals={rivals} value={rivalChoice} onChange={setRivalChoice} newName={newRivalName} onNewName={setNewRivalName} input={input} />
                  <button onClick={handleSave} disabled={saving} style={greenBtn(saving)}>{saving ? 'SAVING...' : 'SAVE DRAFT'}</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIVAL PROFILE */}
        <div style={{ ...box, flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ ...label, color: C.gold }}>Rival profile</span>
            <select value={profileRival} onChange={(e) => setProfileRival(e.target.value)} style={{ ...input, flex: 1, cursor: 'pointer' }}>
              <option value="">- Select rival -</option>
              {rivals.map(r => <option key={r} value={r}>{r} ({rivalDrafts.filter(d => d.rival_name === r).length} drafts{rivalProfiles.some(p => p.rival_name === r) ? ', stats' : ''})</option>)}
            </select>
          </div>

          {profileRival && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {profileDrafts.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#aaa', backgroundColor: '#1e212b', padding: '4px 8px', borderRadius: '3px' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{d.draft_id}</span>
                    <span>{d.rival_side} {(d.rival_side === 'HOST' ? d.host_name : d.guest_name) ? `(${d.rival_side === 'HOST' ? d.host_name : d.guest_name})` : ''}</span>
                    <span style={{ marginLeft: 'auto', color: '#666' }}>{d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</span>
                    <button onClick={() => handleDelete(d)} title="Remove this draft" style={{ background: 'transparent', color: C.red, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>×</button>
                  </div>
                ))}
                {profileStats && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#aaa', backgroundColor: '#1e212b', padding: '4px 8px', borderRadius: '3px' }}>
                    <span style={{ color: C.cyan, fontWeight: 'bold' }}>Map statistics</span>
                    <span>{profileStats.team_name || ''}</span>
                    <span style={{ marginLeft: 'auto', color: '#666' }}>{profileStats.updated_at ? new Date(profileStats.updated_at).toLocaleDateString() : ''}</span>
                  </div>
                )}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ color: '#888', textAlign: 'left' }}>
                    <th style={{ padding: '4px' }}>Civ</th>
                    <th style={{ padding: '4px' }} title="Times picked / pick turns in which it was available">Picked / available</th>
                    <th style={{ padding: '4px' }} title="Preference against an average civ (availability-adjusted, earlier picks weigh more)">Preference</th>
                    <th style={{ padding: '4px' }} title="Maps where they played it (team statistics)">Played on</th>
                    <th style={{ padding: '4px' }}>Snipes</th>
                  </tr>
                </thead>
                <tbody>
                  {topCivs.length === 0 && <tr><td colSpan={5} style={{ padding: '8px', color: '#666', fontStyle: 'italic' }}>No data recorded</td></tr>}
                  {topCivs.map(c => {
                    const s = model.stats[c];
                    const ratio = model.base > 0 ? model.pref[c] / model.base : 0;
                    const played = Object.entries(s.playedOn);
                    return (
                      <tr key={c} style={{ borderTop: '1px solid #2a2d36' }}>
                        <td style={{ padding: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><CivIcon civ={c} getCivImage={getCivImage} size={18} /><span style={{ color: '#fff', fontWeight: 'bold' }}>{c}</span></td>
                        <td style={{ padding: '4px', color: '#aaa' }}>{model.draftCount > 0 ? `${s.rawPicks} / ${s.seen}` : '-'}</td>
                        <td style={{ padding: '4px', color: ratio >= 3 ? C.red : ratio >= 1.5 ? '#ff9800' : '#aaa', fontWeight: 'bold' }}>{model.draftCount > 0 ? `x${ratio.toFixed(1)}` : '-'}</td>
                        <td style={{ padding: '4px', color: '#aaa' }}>{played.length ? played.map(([m, n]) => `${m}${n > 1 ? ` x${n}` : ''}`).join(', ') : '-'}</td>
                        <td style={{ padding: '4px', color: s.snipes ? C.red : '#555' }}>{s.snipes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <span style={{ fontSize: '10px', color: '#666' }}>Preference is shown against an average civ (x1.0). Civs that were not available when they picked do not count for or against. In Execution Draft, civs they played on the maps of the match get an extra boost.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RivalScouting;
