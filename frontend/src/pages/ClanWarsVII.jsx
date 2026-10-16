import { useState, useEffect, useMemo, useRef } from 'react';

const MAP_POOL = ["Socotra", "Colosseum", "Grand Bara", "Nomad", "Fortress", "Crescent", "Tres Leches"].sort();
const CIVS = ["Armenians", "Aztecs", "Bengalis", "Berbers", "Bohemians", "Britons", "Bulgarians", "Burgundians", "Burmese", "Byzantines", "Celts", "Chinese", "Cumans", "Danes", "Dravidians", "Ethiopians", "Franks", "Georgians", "Goths", "Gurjaras", "Hindustanis", "Huns", "Incas", "Italians", "Japanese", "Jurchens", "Khitans", "Khmer", "Koreans", "Lithuanians", "Magyars", "Malay", "Malians", "Mapuche", "Mayans", "Mongols", "Muisca", "Persians", "Poles", "Portuguese", "Romans", "Saracens", "Saxons", "Shu", "Sicilians", "Slavs", "Spanish", "Tatars", "Teutons", "Tupi", "Turks", "Varangians", "Vietnamese", "Vikings", "Wei", "Wu"].sort();

const C = {
  bg: '#161920', card: '#1a1c23', border: '#2a2d36', textMain: '#e0e0e0',
  gold: '#ffd700', cyan: '#00c8c8', red: '#ff6666', green: '#4caf50'
};

function ClanWarsVII() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState("Fortress");
  const [activeTooltip, setActiveTooltip] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.title = 'Clan Wars VII Assistant | Emputors';
    fetch('/db_3v3.json')
      .then(res => res.json())
      .then(data => {
        setDb(data);
        if (data && data.maps) {
            const preferred = ["Fortress", "Tres Leches", "Grand Bara", "Crescent"];
            const defaultMap = preferred.find(m => data.maps[m]) || Object.keys(data.maps)[0];
            if (defaultMap) setSelectedMap(defaultMap);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading 3v3 db:", err);
        setLoading(false);
      });
  }, []);

  const mapData = db?.maps?.[selectedMap];
  const isNomad = selectedMap.toLowerCase() === "nomad" || selectedMap.toLowerCase() === "nómada";
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

  if (loading) return <div style={{ color: C.gold, textAlign: 'center', padding: '40px' }}>Cargando Motor 3v3...</div>;

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '5px' }}>
          <h1 style={{ color: C.gold, fontSize: '24px', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Clan Wars VII Assistant</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Advanced 3v3 Map Meta & Matchup Explorer</p>
        </div>

        {/* SELECTOR DE MAPA Y MUESTRA */}
        <div style={{ backgroundColor: C.card, padding: '12px 20px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Map:</span>
            <select value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)} style={{ backgroundColor: '#1e212b', color: C.gold, border: '1px solid #444', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}>
              {MAP_POOL.map(m => <option key={m} value={m} disabled={!db?.maps?.[m]}>{m}</option>)}
            </select>
          </div>
          <div style={{ color: '#a0aab5', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#1e212b', padding: '6px 12px', borderRadius: '4px', border: '1px solid #333' }}>
            Sample Size: <span style={{ color: totalMatches < 20 ? C.red : C.gold }}>{totalMatches} Matches</span>
          </div>
        </div>

        {!mapData ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>No hay datos suficientes para {selectedMap} todavía. ¡Extrae más JSON de Liquipedia!</div>
        ) : (
          <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            
            {/* TABLA FLANCOS / FLEX */}
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
                        <td 
                          style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff', position: 'relative', cursor: 'pointer' }}
                          onClick={(e) => toggleTooltip(tooltipId, e)}
                        >
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

            {/* TABLA POCKETS */}
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
                          <td 
                            style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff', position: 'relative', cursor: 'pointer' }}
                            onClick={(e) => toggleTooltip(tooltipId, e)}
                          >
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

            {/* TABLA COMBOS */}
            <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '12px', gridColumn: isNomad ? 'span 2' : 'span 1' }}>
              <h3 style={{ color: '#a0aab5', margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 10 Synergies</h3>
              <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th style={{padding:'4px'}}>Composition</th><th style={{padding:'4px'}}>Picks</th><th style={{padding:'4px'}}>WR</th><th style={{padding:'4px'}}>CDPS</th></tr></thead>
                <tbody>
                  {meta.topCombos.map((c, i) => {
                    const tooltipId = `combo-${c.name}`;
                    return (
                      <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                        <td 
                          style={{ padding: '6px 4px', fontWeight: 'bold', color: '#66b2ff', position: 'relative', cursor: 'pointer' }}
                          onClick={(e) => toggleTooltip(tooltipId, e)}
                        >
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

      </div>
    </div>
  );
}

export default ClanWarsVII;