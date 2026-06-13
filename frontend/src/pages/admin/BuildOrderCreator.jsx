import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const C = {
  bg: '#161920', card: '#1a1c23', border: '#2a2d36', 
  textMain: '#e0e0e0', textDim: '#a0aab5', gold: '#ffd700', 
  cyan: '#00c8c8', red: '#ff4444', green: '#4caf50'
};

const RES_OPTIONS = ['sheep', 'boar', 'underTC', 'hunt', 'berries', 'farm', 'fish', 'wood', 'gold', 'stone', 'ship'];
const TASK_MAPPING = {
  sheep: 'food_sheep', boar: 'food_boar', underTC: 'food_tc', hunt: 'food_hunt',
  berries: 'food_berries', farm: 'food_farm', fish: 'food_fish',
  wood: 'wood', gold: 'gold', stone: 'stone', ship: 'food_fish'
};

const parseInitialAges = (build) => {
  if (!build?.ages) return [ { name: 'Dark Age', icon: 'DarkAgeIconDE', steps: [] } ];
  let lastVil = 0;
  let lastRes = {};

  return build.ages.map(age => ({
    ...age,
    steps: age.steps.map(step => {
      let actionType = 'action';
      let vilTotal = 3; 
      let resTarget = 'sheep';
      let moveAmount = 1;
      let resFrom = '';
      let resTo = '';

      const currRes = step.res || {};
      const currVil = step.vil !== null ? step.vil : lastVil;
      const diffVil = currVil - lastVil;

      let addedRes = null;
      let addedAmount = 0;
      let subtractedRes = null;

      const allKeys = new Set([...Object.keys(currRes), ...Object.keys(lastRes)]);
      allKeys.forEach(k => {
        const diff = (currRes[k] || 0) - (lastRes[k] || 0);
        if (diff > 0) { addedRes = k; addedAmount = diff; }
        if (diff < 0) { subtractedRes = k; }
      });

      if (diffVil > 0 && addedRes) {
        actionType = step.task === 'build_then_resource' ? 'build_res' : 'gather';
        vilTotal = diffVil;
        resTarget = addedRes;
      } else if (diffVil === 0 && addedRes && subtractedRes) {
        actionType = 'reallocate';
        moveAmount = addedAmount;
        resFrom = subtractedRes;
        resTo = addedRes;
      } else if (step.task === 'build_then_resource') {
        actionType = 'build_res';
        vilTotal = diffVil;
        resTarget = addedRes || 'wood'; // Fallback
      } else {
        actionType = 'action';
      }

      lastVil = currVil;
      lastRes = { ...currRes };

      return {
        ...step,
        actionType,
        vilTotal: vilTotal || 3, 
        resTarget, moveAmount, resFrom, resTo
      };
    })
  }));
};

const BuildOrderCreator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editBuild = location.state?.editBuild || null;

  const [id, setId] = useState(editBuild?.id || '');
  const [title, setTitle] = useState(editBuild?.title || '');
  const [civ, setCiv] = useState(editBuild?.civ || 'Any');
  const [map, setMap] = useState(editBuild?.map || 'Arabia');
  const [strategy, setStrategy] = useState(editBuild?.strategy || 'Scouts');
  const [difficulty, setDifficulty] = useState(editBuild?.difficulty || 'Beginner');
  const [popCount, setPopCount] = useState(editBuild?.popCount || 19);
  const [author, setAuthor] = useState(editBuild?.author || '');
  const [video, setVideo] = useState(editBuild?.video || '');
  const [description, setDescription] = useState(editBuild?.description || '');
  
  const [tags, setTags] = useState(editBuild?.tags || []);
  const [strategyIcons, setStrategyIcons] = useState(editBuild?.strategyIcons || []);
  const [whatsNext, setWhatsNext] = useState(editBuild?.whatsNext || []);
  
  const [ages, setAges] = useState(() => parseInitialAges(editBuild));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  const handleImportJson = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (data.id) setId(data.id);
      if (data.title) setTitle(data.title);
      if (data.civ) setCiv(data.civ);
      if (data.map) setMap(data.map);
      if (data.strategy) setStrategy(data.strategy);
      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.popCount) setPopCount(data.popCount);
      if (data.video !== undefined) setVideo(data.video);
      if (data.description) setDescription(data.description);
      if (data.author) setAuthor(data.author);
      if (data.tags) setTags(data.tags);
      if (data.strategyIcons) setStrategyIcons(data.strategyIcons);
      if (data.whatsNext) setWhatsNext(data.whatsNext);
      if (data.ages) setAges(data.ages); 
      
      setShowJsonImport(false);
      setJsonInput('');
      alert("✅ JSON imported successfully! Review the data and click Publish.");
    } catch (e) {
      alert("❌ Invalid JSON format. Make sure it's copied exactly.");
    }
  };

  const calculateSmartSteps = () => {
    let runningRes = {};
    let currentTotalVils = 0; 
    
    return ages.map(age => ({
      name: age.name,
      icon: age.icon,
      steps: age.steps.map(step => {
        let stepRes = { ...runningRes };
        let finalTask = step.task || 'action';
        let finalVil = null;

        if (step.actionType === 'manual') {
          if (step.res) runningRes = { ...step.res };
          if (step.vil) currentTotalVils = step.vil;
          return {
            vil: step.vil || null,
            task: step.task || 'action',
            desc: step.desc,
            res: step.res || {},
            note: step.note || null,
            icon: step.icon || null
          };
        }

        if (step.actionType === 'gather' || step.actionType === 'build_res') {
          const addedVils = parseInt(step.vilTotal) || 0; 
          if (addedVils > 0 && step.resTarget) {
            stepRes[step.resTarget] = (stepRes[step.resTarget] || 0) + addedVils;
            runningRes = { ...stepRes }; 
          }
          currentTotalVils += addedVils;
          finalVil = currentTotalVils;
          finalTask = step.actionType === 'build_res' ? 'build_then_resource' : (TASK_MAPPING[step.resTarget] || 'action');
        } 
        else if (step.actionType === 'reallocate') {
          const amt = parseInt(step.moveAmount) || 0;
          if (step.resFrom && step.resTo) {
            stepRes[step.resFrom] = Math.max(0, (stepRes[step.resFrom] || 0) - amt);
            stepRes[step.resTo] = (stepRes[step.resTo] || 0) + amt;
            runningRes = { ...stepRes }; 
          }
          finalVil = currentTotalVils; 
          finalTask = 'reallocate';
        }
        else {
           finalVil = currentTotalVils > 0 ? currentTotalVils : null;
           if (['research', 'age_up'].includes(step.task)) finalVil = null; 
        }

        return {
          vil: finalVil,
          task: finalTask,
          desc: step.desc,
          res: Object.keys(stepRes).length > 0 ? stepRes : {},
          note: step.note || null,
          icon: step.icon || null
        };
      })
    }));
  };

  const handleAddStep = (ageIndex) => {
    const newAges = [...ages];
    newAges[ageIndex].steps.push({
      actionType: 'gather', 
      vilTotal: 3, moveAmount: 1, resFrom: '', resTo: '', resTarget: 'sheep',
      desc: '', note: '', icon: '', task: ''
    });
    setAges(newAges);
  };

  const handleUpdateStep = (ageIndex, stepIndex, field, value) => {
    const newAges = [...ages];
    newAges[ageIndex].steps[stepIndex][field] = value;
    setAges(newAges);
  };

  const handleRemoveStep = (ageIndex, stepIndex) => {
    const newAges = [...ages];
    newAges[ageIndex].steps.splice(stepIndex, 1);
    setAges(newAges);
  };

  const handleAddAge = () => {
    setAges([...ages, { name: 'Feudal Age', icon: 'FeudalAgeIconDE', steps: [] }]);
  };

  const handleSubmit = async () => {
    if (!id || !title) return alert("ID and Title are required.");
    setIsSubmitting(true);
    
    const payload = {
      id, title, civ, map, strategy, difficulty,
      pop_count: parseInt(popCount), video, description, author,
      tags: tags, 
      strategy_icons: strategyIcons, 
      whats_next: whatsNext,
      ages: calculateSmartSteps()
    };

    const { error } = await supabase.from('build_orders').upsert([payload]);
    setIsSubmitting(false);
    
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Build Order saved successfully!");
      navigate(`/academy/build-orders/${id}`); 
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("⚠️ Are you sure you want to completely delete this build order? This cannot be undone.")) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('build_orders').update({ is_deleted: true }).eq('id', id);
    if (error) {
      alert("Error deleting: " + error.message);
      setIsSubmitting(false);
    } else {
      alert("Build Order deleted!");
      navigate('/academy/build-orders');
    }
  };

  const inputStyle = { width: '100%', padding: '8px', backgroundColor: '#1e212b', color: '#fff', border: `1px solid ${C.border}`, borderRadius: '4px', fontSize: '12px' };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'Segoe UI, sans-serif', color: C.textMain }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: C.gold, fontSize: '24px', margin: 0, textTransform: 'uppercase' }}>
          {editBuild ? '✏️ Edit Build Order' : '🛠️ Build Order Creator'}
        </h1>
        <button onClick={() => setShowJsonImport(!showJsonImport)} style={{ backgroundColor: '#2a2d36', color: '#fff', border: '1px solid #444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#333'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2a2d36'}>
          🤖 IMPORT AI JSON
        </button>
      </div>

      {showJsonImport && (
        <div style={{ backgroundColor: '#1e212b', padding: '15px', borderRadius: '8px', border: `1px solid ${C.cyan}`, marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: C.cyan, fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Paste the AI-generated JSON here:</label>
          <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} style={{ width: '100%', height: '150px', backgroundColor: '#161920', color: '#fff', border: '1px solid #444', padding: '8px', fontFamily: 'monospace', fontSize: '11px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button onClick={handleImportJson} style={{ backgroundColor: C.cyan, color: '#000', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', transition: 'filter 0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
              LOAD DATA
            </button>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: C.card, padding: '20px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '20px' }}>
        <h3 style={{ color: C.cyan, marginTop: 0, fontSize: '14px', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>1. Basic Info</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>ID (Unique Slug)</label>
            <input type="text" value={id} onChange={e => setId(e.target.value)} style={inputStyle} placeholder="e.g. any-arabia-18pop-scouts" />
            {editBuild && <div style={{ fontSize: '9px', color: C.gold, marginTop: '4px' }}>Change ID to save as a copy/clone</div>}
          </div>
          <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Legacy Title (Internal)</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="18 Vils | Any | Arabia | Scouts" /></div>
          <div><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Civilization</label><input type="text" value={civ} onChange={e => setCiv(e.target.value)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Map</label><input type="text" value={map} onChange={e => setMap(e.target.value)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Strategy</label><input type="text" value={strategy} onChange={e => setStrategy(e.target.value)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Pop Count (Vils)</label><input type="number" value={popCount} onChange={e => setPopCount(e.target.value)} style={inputStyle} /></div>
          <div><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </div>
          <div><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Author</label><input type="text" value={author} onChange={e => setAuthor(e.target.value)} style={inputStyle} /></div>
          <div style={{ gridColumn: 'span 3' }}><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: '60px' }} /></div>
          <div style={{ gridColumn: 'span 3' }}><label style={{ fontSize: '11px', color: C.textDim, fontWeight: 'bold' }}>YouTube VOD Link (Optional)</label><input type="text" value={video} onChange={e => setVideo(e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      <div style={{ backgroundColor: C.card, padding: '20px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px', marginBottom: '20px' }}>
          <h3 style={{ color: C.cyan, margin: 0, fontSize: '14px', textTransform: 'uppercase' }}>2. Ages & Smart Steps</h3>
          <button onClick={handleAddAge} style={{ backgroundColor: '#2a2d36', color: '#fff', border: '1px solid #444', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>+ ADD AGE</button>
        </div>

        {ages.map((age, aIdx) => (
          <div key={aIdx} style={{ backgroundColor: '#161920', border: '1px solid #333', borderRadius: '6px', padding: '15px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" value={age.name} onChange={e => {const a = [...ages]; a[aIdx].name = e.target.value; setAges(a);}} style={{ ...inputStyle, width: '200px', fontWeight: 'bold', color: C.gold }} placeholder="Age Name (e.g. Dark Age)" />
              <input type="text" value={age.icon} onChange={e => {const a = [...ages]; a[aIdx].icon = e.target.value; setAges(a);}} style={{ ...inputStyle, width: '200px' }} placeholder="Icon (e.g. DarkAgeIconDE)" />
            </div>

            {age.steps.map((step, sIdx) => (
              <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e212b', padding: '10px', borderRadius: '4px', marginBottom: '8px', borderLeft: '3px solid #66b2ff' }}>
                <select value={step.actionType} onChange={e => handleUpdateStep(aIdx, sIdx, 'actionType', e.target.value)} style={{ ...inputStyle, width: '130px', backgroundColor: '#161920', color: '#66b2ff', fontWeight: 'bold' }}>
                  <option value="gather">📥 Gather Res</option>
                  <option value="reallocate">🔄 Reallocate</option>
                  <option value="build_res">🔨 Build ➔ Res</option>
                  <option value="action">⚡ Generic Action</option>
                  <option value="manual">🛠️ Manual Override</option>
                </select>

                {step.actionType === 'manual' && (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>Vil #:</span>
                    <input type="number" value={step.vil || ''} onChange={e => handleUpdateStep(aIdx, sIdx, 'vil', parseInt(e.target.value) || null)} style={{ ...inputStyle, width: '50px' }} />
                    <input type="text" value={step.task || ''} onChange={e => handleUpdateStep(aIdx, sIdx, 'task', e.target.value)} style={{ ...inputStyle, width: '120px' }} placeholder="Task (e.g. wood)" />
                  </div>
                )}

                {(step.actionType === 'gather' || step.actionType === 'build_res') && (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>Add:</span>
                    <input type="number" value={step.vilTotal} onChange={e => handleUpdateStep(aIdx, sIdx, 'vilTotal', parseInt(e.target.value))} style={{ ...inputStyle, width: '50px' }} />
                    <span style={{ fontSize: '11px', color: '#888' }}>vils to</span>
                    <select value={step.resTarget} onChange={e => handleUpdateStep(aIdx, sIdx, 'resTarget', e.target.value)} style={{ ...inputStyle, width: '100px' }}>
                      {RES_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}

                {step.actionType === 'reallocate' && (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>Move</span>
                    <input type="number" value={step.moveAmount} onChange={e => handleUpdateStep(aIdx, sIdx, 'moveAmount', parseInt(e.target.value))} style={{ ...inputStyle, width: '50px' }} />
                    <span style={{ fontSize: '11px', color: '#888' }}>from</span>
                    <select value={step.resFrom} onChange={e => handleUpdateStep(aIdx, sIdx, 'resFrom', e.target.value)} style={{ ...inputStyle, width: '90px' }}>
                      <option value="">-Select-</option>{RES_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <span style={{ fontSize: '11px', color: '#888' }}>to</span>
                    <select value={step.resTo} onChange={e => handleUpdateStep(aIdx, sIdx, 'resTo', e.target.value)} style={{ ...inputStyle, width: '90px' }}>
                      <option value="">-Select-</option>{RES_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}

                {step.actionType === 'action' && (
                  <div style={{ width: '250px' }}>
                     <input type="text" value={step.task || ''} onChange={e => handleUpdateStep(aIdx, sIdx, 'task', e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="System task (e.g. research)" />
                  </div>
                )}

                <div style={{ flex: 1, display: 'flex', gap: '5px' }}>
                  <input type="text" value={step.desc} onChange={e => handleUpdateStep(aIdx, sIdx, 'desc', e.target.value)} style={{ ...inputStyle, flex: 2 }} placeholder="Description (e.g. 6 vils to sheep)" />
                  <input type="text" value={step.note || ''} onChange={e => handleUpdateStep(aIdx, sIdx, 'note', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Note (optional)" />
                  <input type="text" value={step.icon || ''} onChange={e => handleUpdateStep(aIdx, sIdx, 'icon', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Icon (e.g. LoomDE)" />
                </div>
                
                <button onClick={() => handleRemoveStep(aIdx, sIdx)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>✗</button>
              </div>
            ))}
            
            <button onClick={() => handleAddStep(aIdx)} style={{ backgroundColor: '#2a2d36', color: '#e0e0e0', border: '1px dashed #444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', width: '100%', marginTop: '5px', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.backgroundColor='#333'} onMouseLeave={e=>e.currentTarget.style.backgroundColor='#2a2d36'}>
              + ADD STEP
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: '#888', marginRight: '15px' }}>
            <strong>Auto-Calc Output:</strong> Total steps: {ages.reduce((sum, a) => sum + a.steps.length, 0)}
          </div>
          {editBuild && (
            <button onClick={handleDelete} disabled={isSubmitting} style={{ backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
              🗑️ DELETE BUILD
            </button>
          )}
        </div>
        <button onClick={handleSubmit} disabled={isSubmitting} style={{ backgroundColor: C.gold, color: '#161920', border: 'none', padding: '12px 30px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          {isSubmitting ? 'SAVING...' : (editBuild ? '💾 UPDATE BUILD ORDER' : '💾 PUBLISH BUILD ORDER')}
        </button>
      </div>
    </div>
  );
};

export default BuildOrderCreator;