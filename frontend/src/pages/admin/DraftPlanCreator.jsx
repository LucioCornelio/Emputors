import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const MAP_POOL = ["Colosseum", "Crescent", "Fortress", "Grand Bara", "Nomad", "Socotra", "Tres Leches"].sort();
const CIVS = ["Armenians", "Aztecs", "Bengalis", "Berbers", "Bohemians", "Britons", "Bulgarians", "Burgundians", "Burmese", "Byzantines", "Celts", "Chinese", "Cumans", "Danes", "Dravidians", "Ethiopians", "Franks", "Georgians", "Goths", "Gurjaras", "Hindustanis", "Huns", "Incas", "Italians", "Japanese", "Jurchens", "Khitans", "Khmer", "Koreans", "Lithuanians", "Magyars", "Malay", "Malians", "Mapuche", "Mayans", "Mongols", "Muisca", "Persians", "Poles", "Portuguese", "Romans", "Saracens", "Saxons", "Shu", "Sicilians", "Slavs", "Spanish", "Tatars", "Teutons", "Tupi", "Turks", "Varangians", "Vietnamese", "Vikings", "Wei", "Wu"].sort();

const C = {
  bg: '#161920', card: '#1a1c23', border: '#2a2d36', textMain: '#e0e0e0',
  gold: '#ffd700', cyan: '#00c8c8', red: '#ff6666', green: '#4caf50', blue: '#66b2ff'
};

const getCivImage = (civName) => {
  const specials = { "Danes": "danes.png", "Saxons": "saxons.png", "Varangians": "varangians.png" };
  return specials[civName] ? specials[civName] : `${civName.toLowerCase()}.png`;
};

function DraftPlanCreator() {
  const [planName, setPlanName] = useState("");
  const [selectedMap, setSelectedMap] = useState(MAP_POOL[0]);
  const [roles, setRoles] = useState([
    { role: "Flank 1", priority: [] },
    { role: "Flank 2", priority: [] },
    { role: "Pocket", priority: [] }
  ]);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [existingPlans, setExistingPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase.from('cw7_draft_plans').select('*').order('map_name');
    if (data) setExistingPlans(data);
  };

  const handleSelectPlan = (id) => {
    setSelectedPlanId(id);
    if (!id) {
      setPlanName("");
      setRoles([{ role: "Flank 1", priority: [] }, { role: "Flank 2", priority: [] }, { role: "Pocket", priority: [] }]);
      setActiveRoleIndex(0);
      return;
    }
    const plan = existingPlans.find(p => p.id === id);
    if (plan) {
      setPlanName(plan.plan_name);
      setSelectedMap(plan.map_name);
      const loadedRoles = plan.roles.slice(0, 3);
      while (loadedRoles.length < 3) loadedRoles.push({ role: `Role ${loadedRoles.length + 1}`, priority: [] });
      setRoles(loadedRoles);
      setActiveRoleIndex(0);
    }
  };

  const handleClearRole = (index) => {
    const newRoles = [...roles];
    newRoles[index] = { role: `Role ${index + 1}`, priority: [], essential: [] };
    setRoles(newRoles);
  };

  const updateRoleName = (index, newName) => {
    const newRoles = [...roles];
    newRoles[index].role = newName;
    setRoles(newRoles);
  };

  const toggleCivInActiveRole = (civ) => {
    if (activeRoleIndex === null || !roles[activeRoleIndex]) return;
    const newRoles = [...roles];
    const currentPriority = newRoles[activeRoleIndex].priority;
    
    if (currentPriority.includes(civ)) {
      newRoles[activeRoleIndex].priority = currentPriority.filter(c => c !== civ);
      newRoles[activeRoleIndex].essential = (newRoles[activeRoleIndex].essential || []).filter(c => c !== civ);
    } else {
      newRoles[activeRoleIndex].priority = [...currentPriority, civ];
    }
    setRoles(newRoles);
  };

  const removeCivFromRole = (roleIdx, civIdx) => {
    const newRoles = [...roles];
    const [removed] = newRoles[roleIdx].priority.splice(civIdx, 1);
    newRoles[roleIdx].essential = (newRoles[roleIdx].essential || []).filter(c => c !== removed);
    setRoles(newRoles);
  };

  // Ctrl+click (Cmd+click on Mac) toggles a civ as ESSENTIAL for this strategy
  const toggleEssential = (roleIdx, civ) => {
    const newRoles = [...roles];
    const current = newRoles[roleIdx].essential || [];
    newRoles[roleIdx] = { ...newRoles[roleIdx], essential: current.includes(civ) ? current.filter(c => c !== civ) : [...current, civ] };
    setRoles(newRoles);
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      setMessage({ text: "⚠️ Plan name is required", type: "error" });
      return;
    }
    if (roles.length === 0 || roles.some(r => !r.role.trim() || r.priority.length === 0)) {
      setMessage({ text: "⚠️ Every role needs a name and at least one civilization", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });

    const payload = { map_name: selectedMap, plan_name: planName.trim(), roles: roles };
    let error;

    let savedRows = 0;
    if (selectedPlanId) {
      const res = await supabase.from('cw7_draft_plans').update(payload).eq('id', selectedPlanId).select();
      error = res.error;
      savedRows = res.data ? res.data.length : 0;
    } else {
      const res = await supabase.from('cw7_draft_plans').insert(payload).select();
      error = res.error;
      savedRows = res.data ? res.data.length : 0;
    }

    setSaving(false);

    // Supabase silently ignores writes without permission (e.g. not logged in), so check that a row came back
    if (!error && savedRows === 0) {
      setMessage({ text: "❌ Not saved: no permission. Log in and try again.", type: "error" });
      return;
    }

    if (error) {
      setMessage({ text: `❌ Error saving: ${error.message}`, type: "error" });
    } else {
      setMessage({ text: selectedPlanId ? "✅ Plan updated" : "✅ Plan created", type: "success" });
      fetchPlans();
      if (!selectedPlanId) {
        setPlanName("");
        setRoles([{ role: "Flank 1", priority: [] }, { role: "Flank 2", priority: [] }, { role: "Pocket", priority: [] }]);
      }
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlanId || !window.confirm(`Permanently delete the plan "${planName}"?`)) return;
    
    setIsDeleting(true);
    const { data: deleted, error } = await supabase.from('cw7_draft_plans').delete().eq('id', selectedPlanId).select();
    setIsDeleting(false);

    if (!error && (!deleted || deleted.length === 0)) {
      setMessage({ text: "❌ Not deleted: no permission. Log in and try again.", type: "error" });
      return;
    }

    if (error) {
      setMessage({ text: `❌ Error deleting: ${error.message}`, type: "error" });
    } else {
      setMessage({ text: "✅ Plan deleted", type: "success" });
      fetchPlans();
      handleSelectPlan(""); 
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    }
  };

  const handleDuplicate = () => {
    setSelectedPlanId(""); 
    setPlanName(planName + " (Copy)"); 
    setMessage({ text: "Copy mode on. Change what you need and click Save New.", type: "success" });
  };

  const handleExportWhatsApp = () => {
    let text = `🗺️ *Map:* ${selectedMap}\n📋 *Plan:* ${planName || 'Untitled'}\n\n`;
    roles.forEach((r, idx) => {
      text += `*${r.role}*\n`;
      if (r.priority.length > 0) {
        text += r.priority.map((c, i) => `${i + 1}. ${c}${(r.essential || []).includes(c) ? ' (ESSENTIAL)' : ''}`).join('\n') + '\n';
      } else {
        text += `_(No civilizations)_\n`;
      }
      if (idx < roles.length - 1) text += '\n';
    });

    navigator.clipboard.writeText(text);
    setMessage({ text: "📋 Copied to clipboard, ready to paste in WhatsApp.", type: "success" });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  // Drag & Drop handlers
  const handleDragStart = (e, roleIdx, civIdx) => {
    setDraggedItem({ type: 'INTERNAL', roleIdx, civIdx });
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => e.target.style.opacity = '0.4', 0);
  };

  const handleRosterDragStart = (e, civ) => {
    setDraggedItem({ type: 'ROSTER', civ });
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, targetRoleIdx, targetCivIdx) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newRoles = [...roles];
    const priorityList = [...newRoles[targetRoleIdx].priority];

    if (draggedItem.type === 'ROSTER') {
      const civ = draggedItem.civ;
      if (!priorityList.includes(civ)) {
        priorityList.splice(targetCivIdx, 0, civ);
        newRoles[targetRoleIdx].priority = priorityList;
        setRoles(newRoles);
        setActiveRoleIndex(targetRoleIdx); // Auto-select the role we dropped into
      }
    } else if (draggedItem.type === 'INTERNAL') {
      if (draggedItem.roleIdx !== targetRoleIdx) return; 
      if (draggedItem.civIdx === targetCivIdx) return; 

      const [draggedCiv] = priorityList.splice(draggedItem.civIdx, 1);
      priorityList.splice(targetCivIdx, 0, draggedCiv);
      
      newRoles[targetRoleIdx].priority = priorityList;
      setRoles(newRoles);
    }
    setDraggedItem(null);
  };

  return (
    // Clicking a neutral area deselects the active role
    <div style={{ padding: '30px 20px', fontFamily: 'Segoe UI, sans-serif', color: C.textMain }} onClick={() => setActiveRoleIndex(null)}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 style={{ color: C.gold, fontSize: '24px', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>DRAFT PLAN CREATOR</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Design execution priorities by map and role</p>
        </div>

        {message.text && (
          <div style={{ padding: '10px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', backgroundColor: message.type === 'error' ? 'rgba(255, 68, 68, 0.1)' : 'rgba(76, 175, 80, 0.1)', color: message.type === 'error' ? C.red : C.green, border: `1px solid ${message.type === 'error' ? C.red : C.green}` }}>
            {message.text}
          </div>
        )}

        {/* EXISTING PLAN SELECTOR */}
        <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e212b', padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '-10px' }}>
          <span style={{ fontSize: '12px', color: C.gold, fontWeight: 'bold', textTransform: 'uppercase' }}>Edit Existing Plan:</span>
          <select 
            value={selectedPlanId} 
            onChange={(e) => handleSelectPlan(e.target.value)}
            style={{ flex: 1, backgroundColor: '#161920', color: '#fff', border: '1px solid #444', padding: '6px 10px', borderRadius: '4px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">-- ✨ Create New Plan --</option>
            {existingPlans.map(p => (
              <option key={p.id} value={p.id}>[{p.map_name}] {p.plan_name}</option>
            ))}
          </select>
          {selectedPlanId && (
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ backgroundColor: C.red, color: '#161920', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
            >
              {isDeleting ? '...' : '🗑️ DELETE'}
            </button>
          )}
        </div>

        {/* PLAN CONTROLS (Name, Map, Save, WhatsApp) */}
        <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: C.card, padding: '20px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
            <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Plan Name (Strategy)</label>
            <input 
              type="text" 
              placeholder="E.g. Testudo" 
              value={planName} 
              onChange={(e) => setPlanName(e.target.value)}
              style={{ backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
            />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
            <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Target Map</label>
            <select 
              value={selectedMap} 
              onChange={(e) => setSelectedMap(e.target.value)}
              style={{ backgroundColor: '#1e212b', color: C.cyan, border: '1px solid #444', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
            >
              {MAP_POOL.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleExportWhatsApp} 
              title="Copy to clipboard for WhatsApp"
              style={{ backgroundColor: '#25D366', color: '#161920', border: 'none', padding: '10px 15px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📲 EXPORT
            </button>
            {selectedPlanId && (
              <button 
                onClick={handleDuplicate} 
                disabled={saving}
                title="Create a new plan using this one as a template"
                style={{ backgroundColor: C.gold, color: '#161920', border: 'none', padding: '10px 15px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                📑 DUPLICATE
              </button>
            )}
            <button 
              onClick={handleSave} 
              disabled={saving}
              style={{ backgroundColor: selectedPlanId ? C.blue : C.green, color: '#161920', border: 'none', padding: '10px 25px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'SAVING...' : selectedPlanId ? '🔄 UPDATE' : '💾 SAVE NEW'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* LEFT COLUMN: ROLE SETUP */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: C.cyan, fontSize: '13px', margin: 0, textTransform: 'uppercase' }}>Role Structure (Fixed)</h3>
            </div>

            {roles.map((r, idx) => {
              const isActive = activeRoleIndex === idx;
              return (
                <div key={idx} onClick={(e) => { e.stopPropagation(); setActiveRoleIndex(idx); }} style={{ backgroundColor: isActive ? 'rgba(102, 178, 255, 0.05)' : C.card, padding: '12px', borderRadius: '6px', border: `1px solid ${isActive ? C.blue : C.border}`, cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? `0 0 0 1px ${C.blue}` : 'none' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={r.role} 
                      onChange={(e) => updateRoleName(idx, e.target.value)}
                      placeholder="Role name (e.g. Pocket Boom)"
                      style={{ flex: 1, backgroundColor: isActive ? '#161920' : '#1e212b', color: isActive ? C.gold : '#fff', border: `1px solid ${isActive ? '#555' : '#333'}`, padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleClearRole(idx); }} title="Clear role" style={{ backgroundColor: 'transparent', color: C.red, border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>×</button>
                  </div>

                  <div 
                    style={{ minHeight: '40px', backgroundColor: '#161920', border: '1px dashed #444', borderRadius: '4px', padding: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedItem) {
                            handleDrop(e, idx, r.priority.length);
                        }
                    }}
                  >
                    {r.priority.length === 0 ? (
                      <span style={{ fontSize: '10px', color: '#666', fontStyle: 'italic', pointerEvents: 'none' }}>{isActive ? "Click the roster or drag civs here" : "No priority set"}</span>
                    ) : (
                      r.priority.map((civ, civIdx) => (
                        <div 
                          key={`${civ}-${civIdx}`} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx, civIdx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(e, idx, civIdx); }}
                          onClick={(e) => { e.stopPropagation(); if (e.ctrlKey || e.metaKey) toggleEssential(idx, civ); else removeCivFromRole(idx, civIdx); }} 
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: (r.essential || []).includes(civ) ? 'rgba(255, 68, 68, 0.15)' : '#2a2d36', padding: '2px 6px', borderRadius: '3px', border: (r.essential || []).includes(civ) ? '2px solid #ff4444' : '1px solid #555', cursor: 'grab' }}
                          title={(r.essential || []).includes(civ) ? "ESSENTIAL. Ctrl+click to unmark, drag to reorder, click to remove" : "Drag to reorder, click to remove, Ctrl+click to mark as ESSENTIAL"}
                        >
                          <span style={{ fontSize: '10px', color: '#888', fontWeight: 'bold' }}>{civIdx + 1}.</span>
                          <img src={`/civs/${getCivImage(civ)}`} alt={civ} style={{ width: '14px', height: '14px', borderRadius: '2px' }} onError={(e) => e.target.style.display='none'} />
                          <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{civ}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#1e212b', border: `1px solid ${C.border}`, borderRadius: '4px', padding: '8px 10px' }}>
              <span style={{ flexShrink: 0, width: '14px', height: '14px', border: '2px solid #ff4444', borderRadius: '3px', backgroundColor: 'rgba(255, 68, 68, 0.15)', marginTop: '1px' }}></span>
              <span style={{ fontSize: '11px', color: '#aaa', lineHeight: 1.4 }}>
                <strong style={{ color: '#ff4444' }}>Ctrl+click</strong> a civ in a role to mark it as <strong style={{ color: '#ff4444' }}>ESSENTIAL</strong> (red frame): a key civ for this strategy that must be secured early. A plan can have none or several. Ctrl+click again to unmark.
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: FULL ROSTER */}
          <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, backgroundColor: C.card, padding: '20px', borderRadius: '6px', border: `1px solid ${C.border}`, position: 'sticky', top: '20px' }}>
            <h3 style={{ color: C.gold, fontSize: '13px', margin: '0 0 15px 0', textTransform: 'uppercase' }}>Civilizations (Add to: {activeRoleIndex !== null ? roles[activeRoleIndex]?.role || 'None' : '---'})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {CIVS.map(c => {
                const isSelectedInActive = activeRoleIndex !== null && roles[activeRoleIndex]?.priority.includes(c);
                return (
                  <div 
                    key={c} 
                    draggable
                    onDragStart={(e) => handleRosterDragStart(e, c)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => { e.stopPropagation(); toggleCivInActiveRole(c); }}
                    style={{ position: 'relative', cursor: 'grab', border: `2px solid ${isSelectedInActive ? C.blue : 'transparent'}`, borderRadius: '4px', overflow: 'hidden', aspectRatio: '1/1', backgroundColor: '#1e212b', opacity: isSelectedInActive ? 0.5 : 1, transition: 'all 0.1s' }}
                    title={c}
                  >
                    <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display='none'} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '14px', backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', fontFamily: '"Arial Narrow", "Segoe UI Condensed", sans-serif', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>{c}</span>
                    </div>
                    {isSelectedInActive && <div style={{position: 'absolute', top:'-2px', right:'-2px'}}><span style={{color:C.blue, fontSize:'16px', fontWeight: '900', textShadow: '1px 1px 1px #000'}}>✓</span></div>}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default DraftPlanCreator;