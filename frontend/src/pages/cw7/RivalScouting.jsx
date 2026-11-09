import { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { loadFinishedDraft, sideSummary, buildRivalModel } from './forecast';

const NEW_RIVAL = '__new__';

function CivIcon({ civ, getCivImage, size = 22, faded = false }) {
  return (
    <img src={`/civs/${getCivImage(civ)}`} alt={civ} title={civ}
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '3px', border: '1px solid #444', objectFit: 'cover', opacity: faded ? 0.4 : 1 }}
      onError={(e) => e.target.style.display = 'none'} />
  );
}

function RivalScouting({ C, CIVS, getCivImage, rivalDrafts, refreshRivalDrafts }) {
  const [draftInput, setDraftInput] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loaded, setLoaded] = useState(null);
  const [side, setSide] = useState("");
  const [rivalChoice, setRivalChoice] = useState("");
  const [newRivalName, setNewRivalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [profileRival, setProfileRival] = useState("");

  const rivals = useMemo(() => Array.from(new Set(rivalDrafts.map(d => d.rival_name))).sort((a, b) => a.localeCompare(b)), [rivalDrafts]);

  const flash = (text, type) => { setMessage({ text, type }); if (type === 'success') setTimeout(() => setMessage({ text: "", type: "" }), 4000); };

  const handleLoad = async () => {
    setLoadingDraft(true); setLoaded(null); setSide(""); setMessage({ text: "", type: "" });
    try {
      const res = await loadFinishedDraft(draftInput);
      if (rivalDrafts.some(d => d.draft_id === res.draftId)) flash("This draft is already stored (you can store it again for the other side).", "info");
      setLoaded(res);
    } catch (err) {
      flash(`❌ ${err.message}`, "error");
    }
    setLoadingDraft(false);
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
    setLoaded(null); setDraftInput(""); setSide(""); setNewRivalName(""); setRivalChoice(rivalName);
    setProfileRival(rivalName);
    refreshRivalDrafts();
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove draft ${row.draft_id} from ${row.rival_name}?`)) return;
    const { data, error } = await supabase.from('cw7_rival_drafts').delete().eq('id', row.id).select();
    if (error) { flash(`❌ Error deleting: ${error.message}`, "error"); return; }
    if (!data || data.length === 0) { flash("❌ Not deleted: no permission. Log in and try again.", "error"); return; }
    refreshRivalDrafts();
  };

  const profileDrafts = rivalDrafts.filter(d => d.rival_name === profileRival);
  const model = useMemo(() => profileDrafts.length ? buildRivalModel(profileDrafts, CIVS) : null, [profileDrafts, CIVS]);
  const topCivs = model ? CIVS.filter(c => model.stats[c].rawPicks > 0 || model.stats[c].snipes > 0).sort((a, b) => model.pref[b] - model.pref[a]) : [];

  const box = { backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}` };
  const label = { fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' };
  const input = { backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: C.textMain }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: C.gold, fontSize: '22px', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Rival Scouting</h1>
        <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Store finished drafts of each rival. Their picks feed the pick forecast (NOW / SOON / CAN WAIT) in Execution Draft.</p>
      </div>

      {message.text && (
        <div style={{ padding: '8px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: message.type === 'error' ? C.red : message.type === 'info' ? C.gold : C.green, border: `1px solid ${message.type === 'error' ? C.red : message.type === 'info' ? C.gold : C.green}` }}>{message.text}</div>
      )}

      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ADD A PAST DRAFT */}
        <div style={{ ...box, flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ ...label, color: C.cyan }}>1. Add a finished draft</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="aoe2cm draft URL or ID" value={draftInput} onChange={(e) => setDraftInput(e.target.value)} style={{ ...input, flex: 1 }} />
            <button onClick={handleLoad} disabled={loadingDraft || !draftInput.trim()} style={{ backgroundColor: loadingDraft ? '#555' : C.cyan, color: '#161920', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: loadingDraft ? 'not-allowed' : 'pointer' }}>{loadingDraft ? 'LOADING...' : 'LOAD'}</button>
          </div>

          {loaded && (
            <>
              <span style={{ ...label, color: C.cyan }}>2. Which side was the rival?</span>
              <span style={{ fontSize: '11px', color: '#888' }}>Names are shown only as a reference: teams often draft under a captain's nick.</span>
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

              <span style={{ ...label, color: C.cyan }}>3. Assign it to a rival</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select value={rivalChoice} onChange={(e) => setRivalChoice(e.target.value)} style={{ ...input, flex: 1, cursor: 'pointer' }}>
                  <option value="">- Select rival -</option>
                  {rivals.map(r => <option key={r} value={r}>{r}</option>)}
                  <option value={NEW_RIVAL}>+ New rival</option>
                </select>
                {rivalChoice === NEW_RIVAL && (
                  <input type="text" placeholder="Rival name (our own label)" value={newRivalName} onChange={(e) => setNewRivalName(e.target.value)} style={{ ...input, flex: 1 }} />
                )}
                <button onClick={handleSave} disabled={saving} style={{ backgroundColor: saving ? '#555' : C.green, color: '#161920', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'SAVING...' : 'SAVE'}</button>
              </div>
            </>
          )}
        </div>

        {/* RIVAL PROFILE */}
        <div style={{ ...box, flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ ...label, color: C.gold }}>Rival profile</span>
            <select value={profileRival} onChange={(e) => setProfileRival(e.target.value)} style={{ ...input, flex: 1, cursor: 'pointer' }}>
              <option value="">- Select rival -</option>
              {rivals.map(r => <option key={r} value={r}>{r} ({rivalDrafts.filter(d => d.rival_name === r).length})</option>)}
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
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ color: '#888', textAlign: 'left' }}>
                    <th style={{ padding: '4px' }}>Civ</th>
                    <th style={{ padding: '4px' }} title="Times picked / times it was available when they picked">Picked / available</th>
                    <th style={{ padding: '4px' }} title="Preference score (availability-adjusted, earlier picks weigh more)">Preference</th>
                    <th style={{ padding: '4px' }}>Snipes</th>
                  </tr>
                </thead>
                <tbody>
                  {topCivs.length === 0 && <tr><td colSpan={4} style={{ padding: '8px', color: '#666', fontStyle: 'italic' }}>No picks recorded</td></tr>}
                  {topCivs.map(c => {
                    const s = model.stats[c];
                    const ratio = model.base > 0 ? model.pref[c] / model.base : 0;
                    return (
                      <tr key={c} style={{ borderTop: '1px solid #2a2d36' }}>
                        <td style={{ padding: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><CivIcon civ={c} getCivImage={getCivImage} size={18} /><span style={{ color: '#fff', fontWeight: 'bold' }}>{c}</span></td>
                        <td style={{ padding: '4px', color: '#aaa' }}>{s.rawPicks} / {s.seen}</td>
                        <td style={{ padding: '4px', color: ratio >= 3 ? C.red : ratio >= 1.5 ? '#ff9800' : '#aaa', fontWeight: 'bold' }}>x{ratio.toFixed(1)}</td>
                        <td style={{ padding: '4px', color: s.snipes ? C.red : '#555' }}>{s.snipes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <span style={{ fontSize: '10px', color: '#666' }}>Preference is shown against an average civ (x1.0). Civs that were not available when they picked do not count for or against.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RivalScouting;
