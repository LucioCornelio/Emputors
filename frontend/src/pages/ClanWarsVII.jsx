import { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';

const MAP_POOL = ["Socotra", "Colosseum", "Grand Bara", "Nomad", "Fortress", "Crescent", "Tres Leches"].sort();

const C = {
  bg: '#161920', card: '#1a1c23', border: '#2a2d36', textMain: '#e0e0e0',
  gold: '#ffd700', cyan: '#00c8c8', red: '#ff6666', green: '#4caf50', blue: '#66b2ff'
};

const DRAFT_PLAN = {
  "Socotra": [
    { role: "Flank Pure Archers", priority: ["Britons", "Mayans", "Ethiopians", "Vietnamese"] },
    { role: "Flank MAA Archer", priority: ["Japanese", "Dravidians", "Vikings", "Malians"] },
    { role: "Pocket Siege/Meat", priority: ["Slavs", "Bohemians", "Gurjaras", "Celts", "Persians"] }
  ],
  "Nomad": [
    { role: "Water Control", priority: ["Persians", "Italians", "Malians", "Dravidians"] },
    { role: "FC UU Cav", priority: ["Spanish", "Berbers", "Portuguese", "Turks"] },
    { role: "FC UU Arrow", priority: ["Koreans", "Mongols", "Vietnamese", "Burmese"] }
  ],
  "Tres Leches": [
    { role: "Flank 1", priority: ["Britons", "Mayans", "Italians", "Persians"] },
    { role: "Flank 2", priority: ["Franks", "Lithuanians", "Magyars"] },
    { role: "Pocket", priority: ["Hindustanis", "Gurjaras", "Berbers"] }
  ]
};

function ClanWarsVII() {
  const [activeTab, setActiveTab] = useState('metaExplorer');

  // --- ESTADOS: META EXPLORER ---
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetaMap, setSelectedMetaMap] = useState("Fortress");
  const [activeTooltip, setActiveTooltip] = useState(null);
  const containerRef = useRef(null);

  // --- ESTADOS: EXECUTION DRAFT ---
  const [selectedExecMaps, setSelectedExecMaps] = useState([]);
  const [cmId, setCmId] = useState("");
  const [isHost, setIsHost] = useState(true);
  const [roleAssigned, setRoleAssigned] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [liveSocket, setLiveSocket] = useState(null);
  const [execDraft, setExecDraft] = useState({ picks: [], bans: [], oppPicks: [], snipes: [] });
  const [assigned, setAssigned] = useState({});
  const isHostRef = useRef(isHost);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => {
    return () => { if (liveSocket) liveSocket.disconnect(); };
  }, [liveSocket]);

  // Cerrar tooltips al hacer clic fuera (Meta)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cargar DB (Meta)
  useEffect(() => {
    document.title = 'Clan Wars VII Assistant | Emputors';
    fetch('/db_3v3.json')
      .then(res => res.json())
      .then(data => {
        setDb(data);
        if (data && data.maps) {
            const preferred = ["Fortress", "Tres Leches", "Grand Bara", "Crescent"];
            const defaultMap = preferred.find(m => data.maps[m]) || Object.keys(data.maps)[0];
            if (defaultMap) setSelectedMetaMap(defaultMap);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading 3v3 db:", err);
        setLoading(false);
      });
  }, []);

  // --- LÓGICA: META EXPLORER ---
  const mapData = db?.maps?.[selectedMetaMap];
  const isNomad = selectedMetaMap.toLowerCase() === "nomad" || selectedMetaMap.toLowerCase() === "nómada";
  const totalMatches = mapData ? mapData.total_matches : 0;

  const meta = useMemo(() => {
    if (!mapData) return { topFlanks: [], topPockets: [], topCombos: [], topFlex: [] };
    
    const civsArray = Object.entries(mapData.civs).map(([name, stats]) => ({ name, ...stats }));
    const combosArray = Object.entries(mapData.combos).map(([name, stats]) => ({ name, ...stats }));

    const getScore = (picks, wins, cdps) => {
      if (picks === 0) return -1;
      const wr = wins / picks;
      if (picks >= 4 && wr < 0.45) return -100 + wins; 
      if (picks > 0 && wins === 0) return -50; 
      return (cdps * wr) + (wins * 0.5);
    };

    return {
      topFlanks: civsArray.filter(c => c.flank_picks > 0 && getScore(c.flank_picks, c.flank_wins, c.cdps_flank) > 0).sort((a, b) => getScore(b.flank_picks, b.flank_wins, b.cdps_flank) - getScore(a.flank_picks, a.flank_wins, a.cdps_flank)).slice(0, 10),
      topPockets: civsArray.filter(c => c.pocket_picks > 0 && getScore(c.pocket_picks, c.pocket_wins, c.cdps_pocket) > 0).sort((a, b) => getScore(b.pocket_picks, b.pocket_wins, b.cdps_pocket) - getScore(a.pocket_picks, a.pocket_wins, a.cdps_pocket)).slice(0, 10),
      topFlex: civsArray.filter(c => c.flex_picks > 0 && getScore(c.flex_picks, c.flex_wins, c.cdps_flex) > 0).sort((a, b) => getScore(b.flex_picks, b.flex_wins, b.cdps_flex) - getScore(a.flex_picks, a.flex_wins, a.cdps_flex)).slice(0, 10),
      topCombos: combosArray.filter(c => c.picks > 1 && (c.wins / c.picks) >= 0.5).sort((a, b) => (b.cdps * (b.wins/b.picks) + b.wins) - (a.cdps * (a.wins/a.picks) + a.wins)).slice(0, 10)
    };
  }, [mapData]);

  const toggleTooltip = (id, e) => {
    e.stopPropagation();
    setActiveTooltip(prev => prev === id ? null : id);
  };

  const getMapImageName = (mapName) => {
    if (mapName === "Tres Leches") return "Tres_leches";
    if (mapName === "Grand Bara") return "Grand_Bara";
    return mapName;
  };

  // --- LÓGICA: EXECUTION DRAFT ---
  const toggleExecMap = (map) => {
    setSelectedExecMaps(prev => prev.includes(map) ? prev.filter(m => m !== map) : [...prev, map]);
  };

  const formatCiv = (c) => {
      if (!c) return "";
      const clean = String(c).trim();
      if (clean.toLowerCase().startsWith("hidd")) return "Hidden";
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const syncCaptainMode = () => {
    if (!cmId || !roleAssigned) return;
    setSyncing(true);
    
    try {
      const match = cmId.match(/draft\/([a-zA-Z0-9_-]+)/);
      const cleanId = match ? match[1] : cmId.trim();

      if (liveSocket) liveSocket.disconnect();

      const socket = io('https://aoe2cm.net', { query: { draftId: cleanId }, transports: ['websocket'] });
      
      socket.on('connect', () => {
          setSyncing(false);
          const fetchState = () => {
              socket.emit('set_role', { name: "LEAT11_Exec", role: "SPECTATOR" }, (res) => {
                  const data = Array.isArray(res) ? res[0] : res;
                  if (data && data.events) processEvents(data.events);
              });
          };
          fetchState();
          setInterval(fetchState, 3000);
      });

      socket.on('playerEvent', (payload) => {
          setTimeout(() => {
              socket.emit('set_role', { name: "LEAT11_Exec", role: "SPECTATOR" }, (res) => {
                  const data = Array.isArray(res) ? res[0] : res;
                  if (data && data.events) processEvents(data.events);
              });
          }, 500);
      });

      setLiveSocket(socket);
    } catch (e) { setSyncing(false); }
  };

  const processEvents = (events) => {
      let temp = { picks: [], bans: [], oppPicks: [], snipes: [] };
      events.forEach(ev => {
          const type = String(ev.actionType || ev.type || "").toLowerCase();
          const player = String(ev.player || ev.executingPlayer || "").toUpperCase();
          const civRaw = formatCiv(ev.chosenOptionId || ev.drafted || ev.civ || ev.optionId || ev.revealedOptionId || "");
          
          if (!civRaw || civRaw === "Hidden" || type === "none") return;
          const isMyAction = (player === "HOST" && isHostRef.current) || (player === "GUEST" && !isHostRef.current);

          if (type === "ban") {
              if (!temp.bans.includes(civRaw)) temp.bans.push(civRaw);
          } else if (type === "pick" || type.includes("reveal")) {
              if (isMyAction) { if (!temp.picks.includes(civRaw)) temp.picks.push(civRaw); }
              else { if (!temp.oppPicks.includes(civRaw)) temp.oppPicks.push(civRaw); }
          } else if (type === "snipe") {
              if (!isMyAction && !temp.snipes.includes(civRaw)) temp.snipes.push(civRaw);
          }
      });
      setExecDraft(temp);
  };

  const getConfirmedCivs = () => Object.values(assigned).filter(civ => !execDraft.snipes.includes(civ));

  const evaluateRole = (mapName, roleData) => {
      const roleKey = `${mapName}_${roleData.role}`;
      const confirmedCiv = assigned[roleKey];
      const isSniped = execDraft.snipes.includes(confirmedCiv);

      if (confirmedCiv && !isSniped) return { status: 'LOCKED', civ: confirmedCiv };
      if (confirmedCiv && isSniped) return { status: 'SNIPED', civ: confirmedCiv };

      const confirmedList = getConfirmedCivs();
      const availablePicks = execDraft.picks.filter(c => !confirmedList.includes(c) && !execDraft.snipes.includes(c));
      
      const suggestedCiv = roleData.priority.find(c => availablePicks.includes(c));
      if (suggestedCiv) return { status: 'SUGGESTED', civ: suggestedCiv };

      const unavailable = [...execDraft.bans, ...execDraft.oppPicks, ...execDraft.snipes, ...execDraft.picks];
      const nextTarget = roleData.priority.find(c => !unavailable.includes(c));

      if (nextTarget) return { status: 'TARGET', civ: nextTarget };
      return { status: 'EMPTY', civ: null };
  };

  const confirmAssignment = (mapName, roleName, civ) => setAssigned(prev => ({ ...prev, [`${mapName}_${roleName}`]: civ }));
  const clearAssignment = (mapName, roleName) => setAssigned(prev => { const next = { ...prev }; delete next[`${mapName}_${roleName}`]; return next; });

  if (loading) return <div style={{ color: C.gold, textAlign: 'center', padding: '40px' }}>Cargando Motor 3v3...</div>;

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '0', fontFamily: 'Segoe UI, sans-serif' }}>
      
      <style>{`
        .civ-tooltip {
          position: absolute; top: -5px; z-index: 50;
          background: #14161b; border: 1px solid #444; border-radius: 4px; padding: 2px;
          width: 280px; box-shadow: 0 4px 15px rgba(0,0,0,0.9); max-height: 350px; overflow-y: auto;
          cursor: default; font-weight: normal; text-align: left;
        }
        .civ-tooltip::-webkit-scrollbar { width: 4px; }
        .civ-tooltip::-webkit-scrollbar-track { background: #161920; }
        .civ-tooltip::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
      `}</style>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', borderBottom: '2px solid #2a2d36', backgroundColor: '#1e212b', padding: '0 1rem' }}>
        <div onClick={() => setActiveTab('metaExplorer')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'metaExplorer' ? C.gold : '#888', borderBottom: activeTab === 'metaExplorer' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Meta Explorer</div>
        <div onClick={() => setActiveTab('executionDraft')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'executionDraft' ? C.gold : '#888', borderBottom: activeTab === 'executionDraft' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Execution Draft</div>
      </div>

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* HEADER COMÚN */}
        <div style={{ textAlign: 'center', marginBottom: '5px' }}>
          <h1 style={{ color: C.gold, fontSize: '24px', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Clan Wars VII Assistant</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Advanced 3v3 Map Meta & Execution</p>
        </div>

        {/* --- VISTA: META EXPLORER --- */}
        {activeTab === 'metaExplorer' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <div style={{ filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.6))' }}>
                <img 
                  src={`/maps/${getMapImageName(selectedMetaMap)}.png`} 
                  alt={selectedMetaMap}
                  style={{ maxWidth: '400px', maxHeight: '250px', width: 'auto', height: 'auto', display: 'block' }}
                  onError={(e) => { e.target.src = 'https://liquipedia.net/commons/images/a/a2/Aoe2_random_map.png'; }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: C.card, padding: '8px 25px', borderRadius: '50px', border: `1px solid ${C.border}`, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Map:</span>
                  <select value={selectedMetaMap} onChange={(e) => setSelectedMetaMap(e.target.value)} style={{ backgroundColor: 'transparent', color: C.gold, border: 'none', fontSize: '16px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {MAP_POOL.map(m => <option key={m} value={m} disabled={!db?.maps?.[m]}>{m}</option>)}
                  </select>
                </div>
                <div style={{ width: '1px', height: '20px', backgroundColor: '#333' }}></div>
                <div style={{ color: '#a0aab5', fontSize: '12px', fontWeight: 'bold' }}>
                  Sample: <span style={{ color: totalMatches < 20 ? C.red : C.gold, marginLeft: '4px' }}>{totalMatches} Matches</span>
                </div>
              </div>
            </div>

            {!mapData ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>No hay datos suficientes para {selectedMetaMap} todavía. ¡Extrae más JSON de Liquipedia!</div>
            ) : (
              <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                
                <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '12px' }}>
                  <h3 style={{ color: '#a0aab5', margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 10 {isNomad ? 'Flex' : 'Flanks'}</h3>
                  <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th style={{padding:'4px'}}>Civ</th><th style={{padding:'4px'}}>Picks</th><th style={{padding:'4px'}}>WR</th><th style={{padding:'4px'}}>CDPS</th></tr></thead>
                    <tbody>
                      {(isNomad ? meta.topFlex : meta.topFlanks).map((c, i) => {
                        const picks = isNomad ? c.flex_picks : c.flank_picks;
                        const wins = isNomad ? c.flex_wins : c.flank_wins;
                        const tooltipId = `flank-${c.name}`;
                        return (
                          <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                            <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff', position: 'relative', cursor: 'pointer' }} onClick={(e) => toggleTooltip(tooltipId, e)}>
                              <span style={{ borderBottom: '1px dashed #66b2ff' }} title="Click para ver historial">{c.name}</span>
                              {activeTooltip === tooltipId && (
                                <div className="civ-tooltip" style={{ left: '105%' }} onClick={e => e.stopPropagation()}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '4px 6px', marginBottom: '2px', backgroundColor: '#1a1c23' }}>
                                      <span style={{color:C.gold, fontSize:'10px', fontWeight:'bold'}}>MATCHES</span>
                                      <span onClick={(e) => toggleTooltip(tooltipId, e)} style={{cursor: 'pointer', color: '#ff4444', fontWeight: 'bold', fontSize: '14px', lineHeight: '10px'}}>✕</span>
                                  </div>
                                  {c.history.length === 0 ? <div style={{color:'#888', fontSize:'9px', padding: '6px'}}>No records</div> : 
                                    c.history.map((h, idx) => (
                                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '4px 6px', backgroundColor: idx % 2 === 0 ? '#1a1c23' : 'transparent', borderLeft: `3px solid ${h.won ? C.green : C.red}`}}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                          <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>
                                            <span style={{color: h.won ? C.green : C.red, marginRight: '4px'}}>{h.won ? 'W' : 'L'}</span>
                                            {h.date} {h.game && <span style={{color:C.cyan, marginLeft:'2px'}}>{h.game}</span>}
                                          </span>
                                          {h.vod_url && <a href={h.vod_url} target="_blank" rel="noopener noreferrer" style={{color:'#ff4444', fontSize:'8px', textDecoration:'none', fontWeight:'bold', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px'}}>▶ VOD</a>}
                                        </div>
                                        <div style={{ fontSize: '9.5px', lineHeight: '1.25' }}>
                                          <span style={{color:'#555'}}>w/</span> <span style={{ color: '#9abfe6' }}>{h.allies}</span><br/>
                                          <span style={{color:'#555'}}>vs</span> <span style={{ color: '#ff8888' }}>{h.opponents}</span>
                                        </div>
                                      </div>
                                    ))
                                  }
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '6px 4px', color: '#aaa' }}>{picks}</td>
                            <td style={{ padding: '6px 4px', color: (wins/picks) >= 0.5 ? C.green : C.red }}>{((wins/picks)*100).toFixed(0)}%</td>
                            <td style={{ padding: '6px 4px', color: C.gold, fontWeight: 'bold' }}>{isNomad ? c.cdps_flex : c.cdps_flank}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {!isNomad && (
                  <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '12px' }}>
                    <h3 style={{ color: '#a0aab5', margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 10 Pockets</h3>
                    <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th style={{padding:'4px'}}>Civ</th><th style={{padding:'4px'}}>Picks</th><th style={{padding:'4px'}}>WR</th><th style={{padding:'4px'}}>CDPS</th></tr></thead>
                      <tbody>
                        {meta.topPockets.map((c, i) => {
                          const tooltipId = `pocket-${c.name}`;
                          return (
                            <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                              <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff', position: 'relative', cursor: 'pointer' }} onClick={(e) => toggleTooltip(tooltipId, e)}>
                                <span style={{ borderBottom: '1px dashed #66b2ff' }} title="Click para ver historial">{c.name}</span>
                                {activeTooltip === tooltipId && (
                                  <div className="civ-tooltip" style={{ left: '105%' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '4px 6px', marginBottom: '2px', backgroundColor: '#1a1c23' }}>
                                        <span style={{color:C.gold, fontSize:'10px', fontWeight:'bold'}}>MATCHES</span>
                                        <span onClick={(e) => toggleTooltip(tooltipId, e)} style={{cursor: 'pointer', color: '#ff4444', fontWeight: 'bold', fontSize: '14px', lineHeight: '10px'}}>✕</span>
                                    </div>
                                    {c.history.length === 0 ? <div style={{color:'#888', fontSize:'9px', padding: '6px'}}>No records</div> : 
                                      c.history.map((h, idx) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '4px 6px', backgroundColor: idx % 2 === 0 ? '#1a1c23' : 'transparent', borderLeft: `3px solid ${h.won ? C.green : C.red}`}}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>
                                              <span style={{color: h.won ? C.green : C.red, marginRight: '4px'}}>{h.won ? 'W' : 'L'}</span>
                                              {h.date} {h.game && <span style={{color:C.cyan, marginLeft:'2px'}}>{h.game}</span>}
                                            </span>
                                            {h.vod_url && <a href={h.vod_url} target="_blank" rel="noopener noreferrer" style={{color:'#ff4444', fontSize:'8px', textDecoration:'none', fontWeight:'bold', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px'}}>▶ VOD</a>}
                                          </div>
                                          <div style={{ fontSize: '9.5px', lineHeight: '1.25' }}>
                                            <span style={{color:'#555'}}>w/</span> <span style={{ color: '#9abfe6' }}>{h.allies}</span><br/>
                                            <span style={{color:'#555'}}>vs</span> <span style={{ color: '#ff8888' }}>{h.opponents}</span>
                                          </div>
                                        </div>
                                      ))
                                    }
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '6px 4px', color: '#aaa' }}>{c.pocket_picks}</td>
                              <td style={{ padding: '6px 4px', color: (c.pocket_wins/c.pocket_picks) >= 0.5 ? C.green : C.red }}>{((c.pocket_wins/c.pocket_picks)*100).toFixed(0)}%</td>
                              <td style={{ padding: '6px 4px', color: C.gold, fontWeight: 'bold' }}>{c.cdps_pocket}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '12px', gridColumn: isNomad ? 'span 2' : 'span 1' }}>
                  <h3 style={{ color: '#a0aab5', margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 10 Synergies</h3>
                  <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th style={{padding:'4px'}}>Composition</th><th style={{padding:'4px'}}>Picks</th><th style={{padding:'4px'}}>WR</th><th style={{padding:'4px'}}>CDPS</th></tr></thead>
                    <tbody>
                      {meta.topCombos.map((c, i) => {
                        const tooltipId = `combo-${c.name}`;
                        return (
                          <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                            <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#66b2ff', position: 'relative', cursor: 'pointer' }} onClick={(e) => toggleTooltip(tooltipId, e)}>
                              <span style={{ borderBottom: '1px dashed #66b2ff' }} title="Click para ver partidas">{c.name}</span>
                              {activeTooltip === tooltipId && (
                                <div className="civ-tooltip" style={{ right: '105%', left: 'auto' }} onClick={e => e.stopPropagation()}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '4px 6px', marginBottom: '2px', backgroundColor: '#1a1c23' }}>
                                      <span style={{color:C.gold, fontSize:'10px', fontWeight:'bold'}}>COMBO MATCHES</span>
                                      <span onClick={(e) => toggleTooltip(tooltipId, e)} style={{cursor: 'pointer', color: '#ff4444', fontWeight: 'bold', fontSize: '14px', lineHeight: '10px'}}>✕</span>
                                  </div>
                                  {c.history.length === 0 ? <div style={{color:'#888', fontSize:'9px', padding: '6px'}}>No records</div> : 
                                    c.history.map((h, idx) => (
                                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '4px 6px', backgroundColor: idx % 2 === 0 ? '#1a1c23' : 'transparent', borderLeft: `3px solid ${h.won ? C.green : C.red}`}}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                          <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>
                                            <span style={{color: h.won ? C.green : C.red, marginRight: '4px'}}>{h.won ? 'W' : 'L'}</span>
                                            {h.date} {h.game && <span style={{color:C.cyan, marginLeft:'2px'}}>{h.game}</span>}
                                          </span>
                                          {h.vod_url && <a href={h.vod_url} target="_blank" rel="noopener noreferrer" style={{color:'#ff4444', fontSize:'8px', textDecoration:'none', fontWeight:'bold', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px'}}>▶ VOD</a>}
                                        </div>
                                        <div style={{ fontSize: '9.5px', lineHeight: '1.25' }}>
                                          <span style={{color:'#555'}}>vs</span> <span style={{ color: '#ff8888' }}>{h.opponents}</span>
                                        </div>
                                      </div>
                                    ))
                                  }
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '6px 4px', color: '#aaa' }}>{c.picks}</td>
                            <td style={{ padding: '6px 4px', color: (c.wins/c.picks) >= 0.5 ? C.green : C.red }}>{((c.wins/c.picks)*100).toFixed(0)}%</td>
                            <td style={{ padding: '6px 4px', color: C.gold, fontWeight: 'bold' }}>{c.cdps}</td>
                          </tr>
                        )
                      })}
                      {meta.topCombos.length === 0 && <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#555' }}>No hay composiciones repetidas (2+ partidas).</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- VISTA: EXECUTION DRAFT --- */}
        {activeTab === 'executionDraft' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                <h3 style={{ color: C.cyan, fontSize: '12px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>1. Selecciona los mapas a jugar ({selectedExecMaps.length})</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {MAP_POOL.filter(m => DRAFT_PLAN[m]).map(map => {
                        const isSel = selectedExecMaps.includes(map);
                        return (
                            <div key={map} onClick={() => toggleExecMap(map)} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '6px', border: `2px solid ${isSel ? C.gold : '#444'}`, cursor: 'pointer', overflow: 'hidden', filter: isSel ? 'brightness(1.1)' : 'grayscale(0.6)' }}>
                                <img src={`/maps/${getMapImageName(map)}.png`} alt={map} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', color: isSel ? C.gold : '#fff', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '2px 0' }}>{map}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ backgroundColor: '#1a1c23', padding: '10px 15px', borderRadius: '6px', border: '1px solid #333', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span style={{ color: C.gold, fontSize: '12px', fontWeight: 'bold' }}>CAPTAINS MODE:</span>
                <input type="text" placeholder="URL o ID del Draft..." value={cmId} onChange={(e) => setCmId(e.target.value)} style={{ backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', width: '250px', outline: 'none' }} />
                
                {!roleAssigned ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { setIsHost(true); setRoleAssigned(true); }} style={{ backgroundColor: C.blue, color: '#161920', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>SOY HOST</button>
                    <button onClick={() => { setIsHost(false); setRoleAssigned(true); }} style={{ backgroundColor: C.red, color: '#161920', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>SOY GUEST</button>
                </div>
                ) : (
                <button onClick={() => setRoleAssigned(false)} style={{ backgroundColor: isHost ? C.blue : C.red, color: '#161920', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>ROLE: {isHost ? 'HOST' : 'GUEST'} ✎</button>
                )}

                <button onClick={syncCaptainMode} disabled={syncing || !roleAssigned} style={{ backgroundColor: (!roleAssigned || syncing) ? '#555' : C.green, color: '#161920', border: 'none', padding: '6px 20px', borderRadius: '4px', cursor: (!roleAssigned || syncing) ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                {syncing ? 'SYNCING...' : '↻ CONECTAR'}
                </button>
            </div>

            {selectedExecMaps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ color: C.cyan, fontSize: '12px', margin: '0', textTransform: 'uppercase' }}>3. Plan de Ejecución (En Vivo)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px' }}>
                        {selectedExecMaps.map(mapName => {
                            const roles = DRAFT_PLAN[mapName];
                            if (!roles) return null;
                            return (
                                <div key={mapName} style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e212b', borderBottom: '1px solid #333', padding: '8px 12px', gap: '10px' }}>
                                        <img src={`/maps/${getMapImageName(mapName)}.png`} alt={mapName} style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #444', objectFit: 'cover' }} />
                                        <h4 style={{ color: '#fff', margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>{mapName}</h4>
                                    </div>
                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {roles.map((roleData, idx) => {
                                            const { status, civ } = evaluateRole(mapName, roleData);
                                            let bg = '#161920'; let bd = '#2a2d36'; let icon = ''; let titleColor = '#888'; let actionBtn = null;
                                            
                                            if (status === 'TARGET') { bd = '#555'; titleColor = '#aaa'; icon = '🎯'; }
                                            else if (status === 'SUGGESTED') {
                                                bg = 'rgba(102, 178, 255, 0.1)'; bd = C.blue; titleColor = C.blue; icon = '💡';
                                                actionBtn = <button onClick={() => confirmAssignment(mapName, roleData.role, civ)} style={{ backgroundColor: C.blue, color: '#161920', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>✓ CONFIRMAR</button>;
                                            } else if (status === 'LOCKED') {
                                                bg = 'rgba(76, 175, 80, 0.1)'; bd = C.green; titleColor = C.green; icon = '🔒';
                                                actionBtn = <button onClick={() => clearAssignment(mapName, roleData.role)} style={{ backgroundColor: 'transparent', color: '#888', border: '1px solid #555', padding: '3px 6px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}>Deshacer</button>;
                                            } else if (status === 'SNIPED') {
                                                bg = 'rgba(255, 68, 68, 0.1)'; bd = C.red; titleColor = C.red; icon = '☠️';
                                                actionBtn = <button onClick={() => clearAssignment(mapName, roleData.role)} style={{ backgroundColor: C.red, color: '#161920', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>LIMPIAR</button>;
                                            }

                                            return (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: bg, border: `1px solid ${bd}`, borderRadius: '4px', padding: '6px 10px', minHeight: '45px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', width: '40%' }}>
                                                        <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>ROLE</span>
                                                        <span style={{ fontSize: '11px', color: '#e0e0e0', fontWeight: 'bold' }}>{roleData.role}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                        {civ ? (
                                                            <>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '4px', border: `1px solid ${bd}`, overflow: 'hidden', position: 'relative' }}>
                                                                    <img src={`/civs/${civ.toLowerCase()}.png`} alt={civ} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: status === 'SNIPED' ? 0.3 : 1 }} />
                                                                    {status === 'SNIPED' && <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><span style={{color:C.red, fontSize:'16px'}}>✗</span></div>}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '9px', color: titleColor, fontWeight: 'bold' }}>{icon} {status}</span>
                                                                    <span style={{ fontSize: '12px', color: status === 'SNIPED' ? C.red : '#fff', fontWeight: 'bold', textDecoration: status === 'SNIPED' ? 'line-through' : 'none' }}>{civ}</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>Sin opciones...</span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', flexShrink: 0 }}>{actionBtn}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClanWarsVII;