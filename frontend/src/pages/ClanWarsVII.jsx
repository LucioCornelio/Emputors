import { useState, useEffect, useMemo } from 'react';

const MAP_POOL = ["Socotra", "Colosseum", "Grand Bara", "Nomad", "Fortress", "Crescent", "Tres Leches"].sort();
const CIVS = ["Armenians", "Aztecs", "Bengalis", "Berbers", "Bohemians", "Britons", "Bulgarians", "Burgundians", "Burmese", "Byzantines", "Celts", "Chinese", "Cumans", "Danes", "Dravidians", "Ethiopians", "Franks", "Georgians", "Goths", "Gurjaras", "Hindustanis", "Huns", "Incas", "Italians", "Japanese", "Jurchens", "Khitans", "Khmer", "Koreans", "Lithuanians", "Magyars", "Malay", "Malians", "Mapuche", "Mayans", "Mongols", "Muisca", "Persians", "Poles", "Portuguese", "Romans", "Saracens", "Saxons", "Shu", "Sicilians", "Slavs", "Spanish", "Tatars", "Teutons", "Tupi", "Turks", "Varangians", "Vietnamese", "Vikings", "Wei", "Wu"].sort();

const C = {
  bg: '#161920', card: '#1a1c23', border: '#2a2d36', textMain: '#e0e0e0',
  gold: '#ffd700', cyan: '#00c8c8', red: '#ff6666', green: '#4caf50'
};

function ClanWarsVII() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState("Arabia");
  
  // Posiciones: [Flanco 1, Pocket, Flanco 2] (O Flex en Nomad)
  const [team1, setTeam1] = useState(["", "", ""]);
  const [team2, setTeam2] = useState(["", "", ""]);

  useEffect(() => {
    document.title = 'Clan Wars VII Assistant | Emputors';
    // Carga la nueva base de datos generada por Python
    fetch('/db_3v3.json')
      .then(res => res.json())
      .then(data => {
        setDb(data);
        // Si Arabia no está (porque no la hemos extraído aún), coge el primero que haya
        if (data && data.maps && Object.keys(data.maps).length > 0) {
            setSelectedMap(Object.keys(data.maps)[0]);
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

  // Función para obtener las estadísticas exactas de una civilización en un rol específico
  const getRoleStats = (civ, roleIndex) => {
    if (!mapData || !civ || !mapData.civs[civ]) return null;
    const stats = mapData.civs[civ];
    
    if (isNomad) {
      return { picks: stats.flex_picks, wins: stats.flex_wins, cdps: stats.cdps_flex, role: "FLEX" };
    }
    
    if (roleIndex === 1) { // Pocket
      return { picks: stats.pocket_picks, wins: stats.pocket_wins, cdps: stats.cdps_pocket, role: "POCKET" };
    } else { // Flancos (0 o 2)
      return { picks: stats.flank_picks, wins: stats.flank_wins, cdps: stats.cdps_flank, role: "FLANK" };
    }
  };

  // Extraer el Meta del Mapa (Mejores Flancos, Pockets y Combos)
  const meta = useMemo(() => {
    if (!mapData) return { topFlanks: [], topPockets: [], topCombos: [], topFlex: [] };
    
    const civsArray = Object.entries(mapData.civs).map(([name, stats]) => ({ name, ...stats }));
    const combosArray = Object.entries(mapData.combos).map(([name, stats]) => ({ name, ...stats }));

    return {
      topFlanks: civsArray.filter(c => c.flank_picks > 0).sort((a, b) => b.cdps_flank - a.cdps_flank || b.flank_picks - a.flank_picks).slice(0, 10),
      topPockets: civsArray.filter(c => c.pocket_picks > 0).sort((a, b) => b.cdps_pocket - a.cdps_pocket || b.pocket_picks - a.pocket_picks).slice(0, 10),
      topFlex: civsArray.filter(c => c.flex_picks > 0).sort((a, b) => b.cdps_flex - a.cdps_flex || b.flex_picks - a.flex_picks).slice(0, 10),
      topCombos: combosArray.filter(c => c.picks > 1).sort((a, b) => b.cdps - a.cdps || b.wins - a.wins).slice(0, 10)
    };
  }, [mapData]);

  const updateTeam = (teamSetter, teamState, index, value) => {
    const newState = [...teamState];
    newState[index] = value;
    teamSetter(newState);
  };

  const getComboStats = (teamState) => {
    if (!mapData || teamState.includes("")) return null;
    const sortedKey = [...teamState].sort().join(" + ");
    return mapData.combos[sortedKey] || { picks: 0, wins: 0, cdps: 0 };
  };

  const renderCivSlot = (teamNum, teamSetter, teamState, index) => {
    const civName = teamState[index];
    const stats = getRoleStats(civName, index);
    const roleName = isNomad ? "FLEX" : (index === 1 ? "POCKET" : `FLANK ${index === 0 ? 1 : 2}`);
    
    return (
      <div style={{ backgroundColor: '#1e212b', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>{roleName}</span>
          {stats && (
            <span style={{ fontSize: '11px', color: stats.wins / stats.picks >= 0.5 ? C.green : C.red, fontWeight: 'bold' }}>
              {stats.picks > 0 ? `${((stats.wins / stats.picks) * 100).toFixed(0)}% WR` : 'No Data'}
            </span>
          )}
        </div>
        
        <select value={civName} onChange={(e) => updateTeam(teamSetter, teamState, index, e.target.value)} style={{ backgroundColor: '#161920', color: teamNum === 1 ? C.cyan : C.red, border: `1px solid ${teamNum === 1 ? C.cyan+'55' : C.red+'55'}`, padding: '8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', outline: 'none' }}>
          <option value="">- Select Civ -</option>
          {CIVS.map(c => <option key={c} value={c} disabled={teamState.includes(c) && teamState[index] !== c}>{c}</option>)}
        </select>

        {stats ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a0aab5' }}>
            <span>Picks: <strong style={{color: '#fff'}}>{stats.picks}</strong></span>
            <span>CDPS: <strong style={{color: C.gold}}>{stats.cdps}</strong></span>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#555', textAlign: 'center' }}>{civName ? 'No tournament data for this role' : 'Waiting for pick...'}</div>
        )}
      </div>
    );
  };

  if (loading) return <div style={{ color: C.gold, textAlign: 'center', padding: '40px' }}>Cargando Motor 3v3...</div>;

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 style={{ color: C.gold, fontSize: '24px', margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Clan Wars VII Assistant</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Advanced 3v3 Matchup & Synergy Analyzer</p>
        </div>

        {/* CONTROLES GLOBALES */}
        <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <select value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)} style={{ backgroundColor: '#1e212b', color: C.gold, border: '1px solid #444', padding: '8px 15px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}>
            {MAP_POOL.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => { setTeam1(["","",""]); setTeam2(["","",""]); }} style={{ backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff444455', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>CLEAR DRAFT</button>
        </div>

        {/* ANALIZADOR DE DRAFT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* TEAM 1 */}
          <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, borderTop: `3px solid ${C.cyan}` }}>
            <h3 style={{ color: C.cyan, margin: '0 0 15px 0', textAlign: 'center', textTransform: 'uppercase' }}>Blue Team</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {renderCivSlot(1, setTeam1, team1, 0)}
              {renderCivSlot(1, setTeam1, team1, 1)}
              {renderCivSlot(1, setTeam1, team1, 2)}
            </div>
            
            {/* Combo Stats T1 */}
            {team1.every(c => c !== "") && (
              <div style={{ marginTop: '15px', backgroundColor: '#1e212b', padding: '10px', borderRadius: '4px', border: '1px dashed #444', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Synergy (Team Composition)</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '5px', fontSize: '13px', color: '#e0e0e0' }}>
                  <span>Matches: <strong>{getComboStats(team1)?.picks || 0}</strong></span>
                  <span style={{ color: C.gold }}>CDPS: <strong>{getComboStats(team1)?.cdps || 0}</strong></span>
                  <span style={{ color: (getComboStats(team1)?.wins / getComboStats(team1)?.picks) >= 0.5 ? C.green : C.red }}>
                    WR: <strong>{getComboStats(team1)?.picks > 0 ? ((getComboStats(team1)?.wins / getComboStats(team1)?.picks)*100).toFixed(0)+'%' : 'N/A'}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* TEAM 2 */}
          <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, borderTop: `3px solid ${C.red}` }}>
            <h3 style={{ color: C.red, margin: '0 0 15px 0', textAlign: 'center', textTransform: 'uppercase' }}>Red Team</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {renderCivSlot(2, setTeam2, team2, 0)}
              {renderCivSlot(2, setTeam2, team2, 1)}
              {renderCivSlot(2, setTeam2, team2, 2)}
            </div>
            
            {/* Combo Stats T2 */}
            {team2.every(c => c !== "") && (
              <div style={{ marginTop: '15px', backgroundColor: '#1e212b', padding: '10px', borderRadius: '4px', border: '1px dashed #444', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Synergy (Team Composition)</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '5px', fontSize: '13px', color: '#e0e0e0' }}>
                  <span>Matches: <strong>{getComboStats(team2)?.picks || 0}</strong></span>
                  <span style={{ color: C.gold }}>CDPS: <strong>{getComboStats(team2)?.cdps || 0}</strong></span>
                  <span style={{ color: (getComboStats(team2)?.wins / getComboStats(team2)?.picks) >= 0.5 ? C.green : C.red }}>
                    WR: <strong>{getComboStats(team2)?.picks > 0 ? ((getComboStats(team2)?.wins / getComboStats(team2)?.picks)*100).toFixed(0)+'%' : 'N/A'}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* METADATA DEL MAPA (LAS TABLAS TOP) */}
        {!mapData ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No hay datos suficientes para {selectedMap} todavía. ¡Extrae más JSON de Liquipedia!</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '10px' }}>
            
            {/* TABLA FLANCOS / FLEX */}
            <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '15px' }}>
              <h3 style={{ color: '#a0aab5', margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase' }}>Top 10 {isNomad ? 'Flex' : 'Flanks'}</h3>
              <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th>Civ</th><th>Picks</th><th>WR</th><th>CDPS</th></tr></thead>
                <tbody>
                  {(isNomad ? meta.topFlex : meta.topFlanks).map((c, i) => {
                    const picks = isNomad ? c.flex_picks : c.flank_picks;
                    const wins = isNomad ? c.flex_wins : c.flank_wins;
                    const cdps = isNomad ? c.cdps_flex : c.cdps_flank;
                    return (
                      <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                        <td style={{ padding: '4px', fontWeight: 'bold', color: '#fff' }}>{c.name}</td>
                        <td style={{ padding: '4px', color: '#aaa' }}>{picks}</td>
                        <td style={{ padding: '4px', color: (wins/picks) >= 0.5 ? C.green : C.red }}>{((wins/picks)*100).toFixed(0)}%</td>
                        <td style={{ padding: '4px', color: C.gold, fontWeight: 'bold' }}>{cdps}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* TABLA POCKETS */}
            {!isNomad && (
              <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '15px' }}>
                <h3 style={{ color: '#a0aab5', margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase' }}>Top 10 Pockets</h3>
                <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th>Civ</th><th>Picks</th><th>WR</th><th>CDPS</th></tr></thead>
                  <tbody>
                    {meta.topPockets.map((c, i) => (
                      <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                        <td style={{ padding: '4px', fontWeight: 'bold', color: '#fff' }}>{c.name}</td>
                        <td style={{ padding: '4px', color: '#aaa' }}>{c.pocket_picks}</td>
                        <td style={{ padding: '4px', color: (c.pocket_wins/c.pocket_picks) >= 0.5 ? C.green : C.red }}>{((c.pocket_wins/c.pocket_picks)*100).toFixed(0)}%</td>
                        <td style={{ padding: '4px', color: C.gold, fontWeight: 'bold' }}>{c.cdps_pocket}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLA COMBOS */}
            <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '15px', gridColumn: isNomad ? 'span 2' : 'span 1' }}>
              <h3 style={{ color: '#a0aab5', margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase' }}>Top 10 Synergies</h3>
              <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th>Composition</th><th>Picks</th><th>WR</th><th>CDPS</th></tr></thead>
                <tbody>
                  {meta.topCombos.map((c, i) => (
                    <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                      <td style={{ padding: '4px', fontWeight: 'bold', color: '#66b2ff' }}>{c.name}</td>
                      <td style={{ padding: '4px', color: '#aaa' }}>{c.picks}</td>
                      <td style={{ padding: '4px', color: (c.wins/c.picks) >= 0.5 ? C.green : C.red }}>{((c.wins/c.picks)*100).toFixed(0)}%</td>
                      <td style={{ padding: '4px', color: C.gold, fontWeight: 'bold' }}>{c.cdps}</td>
                    </tr>
                  ))}
                  {meta.topCombos.length === 0 && <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#555' }}>No hay composiciones repetidas (2+ partidas) registradas aún.</td></tr>}
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