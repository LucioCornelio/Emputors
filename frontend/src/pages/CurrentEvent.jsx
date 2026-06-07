import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Diccionario de jugadores por equipo (nicks de Discord en minúsculas)
const TEAM_MEMBERS = {
  "RaiSquad": ["squadrano", "ryzenvelos"],
  "CostalCanela": ["costalceleste", "ruizcanela"],
  "SarCornelio": ["luciocornelio", "panete"],
  "Sabaronte": ["ersabo", "caronte5865"]
};

const GROUP_SCHEDULE = [
  { t1: "CostalCanela", t2: "RaiSquad" },
  { t1: "Sabaronte", t2: "SarCornelio" },
  { t1: "CostalCanela", t2: "Sabaronte" },
  { t1: "RaiSquad", t2: "SarCornelio" },
  { t1: "CostalCanela", t2: "SarCornelio" },
  { t1: "RaiSquad", t2: "Sabaronte" }
];

const mapPool = ["Arabia", "Arena"];

const CurrentEvent = () => {
  const [activeTab, setActiveTab] = useState('standings');
  const [highlightTeam, setHighlightTeam] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  // SUPABASE: Estados de Usuario
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // ESTADO CIVILIZACIONES DINÁMICAS
  const [civs, setCivs] = useState([]);

  // SUPABASE: Estados de Base de Datos para Standings y Matches
  const [matchResults, setMatchResults] = useState([]);
  const [calculatedStandings, setCalculatedStandings] = useState([]);

  // SUPABASE: Estados del formulario de logueo
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [mapsData, setMapsData] = useState([
    { map: "Arabia", civA: "", civB: "", winner: "" },
    { map: "", civA: "", civB: "", winner: "" },
    { map: "", civA: "", civB: "", winner: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);const [isSubmitting, setIsSubmitting] = useState(false);

  // NUEVOS ESTADOS
  const [selectedMatchModal, setSelectedMatchModal] = useState(null);
  const [logStage, setLogStage] = useState('group');
  const [selectedGroupMatchIdx, setSelectedGroupMatchIdx] = useState("");

  // Cargar civilizaciones desde techtree.json
  useEffect(() => {
    fetch('/techtree.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.civs) {
          setCivs(Object.keys(data.civs).sort());
        }
      })
      .catch(() => console.error('Could not load techtree.json'));
  }, []);

  // Cargar Partidos desde Supabase y Calcular Standings
  const fetchMatches = async () => {
    const { data, error } = await supabase.from('match_results').select('*');
    if (error) {
      console.error("Error fetching matches:", error);
      return;
    }
    
    setMatchResults(data);

    // Calcular clasificación base
    let initialStandings = {
      "RaiSquad": { id: "raisquad", name: "RaiSquad", seriesW: 0, seriesL: 0, mapsW: 0, mapsL: 0, pts: 0 },
      "CostalCanela": { id: "costalcanela", name: "CostalCanela", seriesW: 0, seriesL: 0, mapsW: 0, mapsL: 0, pts: 0 },
      "SarCornelio": { id: "sarcornelio", name: "SarCornelio", seriesW: 0, seriesL: 0, mapsW: 0, mapsL: 0, pts: 0 },
      "Sabaronte": { id: "sabaronte", name: "Sabaronte", seriesW: 0, seriesL: 0, mapsW: 0, mapsL: 0, pts: 0 }
    };

    data.filter(m => m.stage === 'group' || !m.stage).forEach(match => {
      const { team_a, team_b, score_a, score_b } = match;
      
      if (initialStandings[team_a] && initialStandings[team_b]) {
        // Mapas
        initialStandings[team_a].mapsW += score_a;
        initialStandings[team_a].mapsL += score_b;
        initialStandings[team_b].mapsW += score_b;
        initialStandings[team_b].mapsL += score_a;

        // Series y Puntos (Opción 2 de la encuesta: Puntos = Mapas ganados + 1 pt extra por Serie ganada)
        // OJO: Asumiendo que es al mejor de 3, quien gane 2 mapas gana la serie.
        if (score_a > score_b) {
          initialStandings[team_a].seriesW += 1;
          initialStandings[team_b].seriesL += 1;
          initialStandings[team_a].pts += score_a + 1; // Mapas + Serie
          initialStandings[team_b].pts += score_b;     // Solo Mapas
        } else if (score_b > score_a) {
          initialStandings[team_b].seriesW += 1;
          initialStandings[team_a].seriesL += 1;
          initialStandings[team_b].pts += score_b + 1; // Mapas + Serie
          initialStandings[team_a].pts += score_a;     // Solo Mapas
        }
      }
    });

    // Convertir objeto a array y ordenar (Por Puntos, luego por Diff de mapas, luego Alfabético)
    const sortedStandings = Object.values(initialStandings).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts; // 1. Mayor Puntuación
      const diffA = a.mapsW - a.mapsL;
      const diffB = b.mapsW - b.mapsL;
      if (diffB !== diffA) return diffB - diffA; // 2. Mejor diferencia de mapas
      return a.name.localeCompare(b.name);       // 3. Orden alfabético
    }).map((team, index) => ({ ...team, pos: index + 1 }));

    setCalculatedStandings(sortedStandings);
  };

  // Ejecutar carga inicial de partidos y chequear usuario
  useEffect(() => {
    fetchMatches();

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const rawNick = session.user.user_metadata.preferred_username || session.user.user_metadata.name || '';
        const cleanNick = rawNick.split('#')[0].toLowerCase(); 
        
        const { data } = await supabase.from('clan_roles').select('role').ilike('discord_username', cleanNick).single();
        if (data) setUserRole(data.role);
      }
    };
    checkUser();
  }, []);

  // Lógica de Permisos
  const rawNickForAuth = user?.user_metadata?.preferred_username || user?.user_metadata?.name || '';
  const discordNick = rawNickForAuth.split('#')[0].toLowerCase();
  const isAdmin = userRole === 'admin';
  const isAuthorizedToLog = isAdmin || TEAM_MEMBERS[teamA]?.includes(discordNick) || TEAM_MEMBERS[teamB]?.includes(discordNick);
  
  const groupMatchesPlayedCount = matchResults.filter(m => m.stage === 'group' || !m.stage).length;
  const isGroupStageComplete = groupMatchesPlayedCount >= 6;

  const existingMatch = matchResults.find(m => 
    m.stage === logStage && teamA && teamB && 
    ((m.team_a === teamA && m.team_b === teamB) || (m.team_a === teamB && m.team_b === teamA))
  );

  const handleGroupMatchSelect = (e) => {
    const idx = e.target.value;
    setSelectedGroupMatchIdx(idx);
    if (idx !== "") {
      setTeamA(GROUP_SCHEDULE[idx].t1);
      setTeamB(GROUP_SCHEDULE[idx].t2);
    } else {
      setTeamA(""); setTeamB("");
    }
  };

  const resetAllResults = async () => {
    if (!window.confirm("CRITICAL WARNING: Are you sure you want to delete ALL match results? This cannot be undone.")) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('match_results').delete().neq('id', 0); // Borra todo
    setIsSubmitting(false);
    if (error) alert("Error resetting: " + error.message);
    else { alert("All results wiped."); fetchMatches(); }
  };

  const handleTeamClick = (teamId) => {
    setActiveTab('teams');
    setHighlightTeam(teamId);
    setTimeout(() => setHighlightTeam(null), 2000); 
  };

  const updateMapData = (index, field, value) => {
    const newMaps = [...mapsData];
    newMaps[index][field] = value;
    setMapsData(newMaps);
  };

  const handleSubmit = async (adminWinWinner = null) => {
    if (!teamA || !teamB || teamA === teamB) return alert("Select two different teams.");
    if (existingMatch && !isAdmin) return alert("This match is already logged. Only admins can modify it.");
    
    let scoreA = 0; let scoreB = 0;
    let payloadMaps = mapsData;

    if (adminWinWinner) {
      scoreA = adminWinWinner === 'A' ? 3 : 0;
      scoreB = adminWinWinner === 'B' ? 3 : 0;
      payloadMaps = mapsData.map(m => ({ map: m.map || "Admin Win", civA: "Admin", civB: "Admin", winner: adminWinWinner }));
    } else {
      for (let i = 0; i < 3; i++) {
        if (!mapsData[i].map || !mapsData[i].civA || !mapsData[i].civB || !mapsData[i].winner) {
          return alert(`Incomplete data on Map ${i + 1}`);
        }
      }
      mapsData.forEach(m => { if (m.winner === 'A') scoreA++; if (m.winner === 'B') scoreB++; });
    }

    setIsSubmitting(true);
    const payload = {
      team_a: teamA, team_b: teamB, score_a: scoreA, score_b: scoreB,
      map_1_data: payloadMaps[0], map_2_data: payloadMaps[1], map_3_data: payloadMaps[2],
      submitted_by: discordNick, stage: logStage
    };

    let error;
    if (existingMatch) {
      const res = await supabase.from('match_results').update(payload).eq('id', existingMatch.id);
      error = res.error;
    } else {
      const res = await supabase.from('match_results').insert([payload]);
      error = res.error;
    }

    setIsSubmitting(false);
    if (error) {
      alert("Error saving match: " + error.message);
    } else {
      alert(existingMatch ? "Match updated successfully!" : "Match logged successfully!");
      setTeamA(""); setTeamB(""); setSelectedGroupMatchIdx("");
      setMapsData([{ map: "Arabia", civA: "", civB: "", winner: "" }, { map: "", civA: "", civB: "", winner: "" }, { map: "", civA: "", civB: "", winner: "" }]);
      fetchMatches(); 
      setActiveTab('standings'); 
    }
  };

  // COMPACT STYLES
  const containerStyle = { backgroundColor: '#161920', color: '#e0e0e0', minHeight: '100vh', padding: '0', fontFamily: 'Segoe UI, sans-serif', position: 'relative' };
  const heroStyle = { backgroundImage: `linear-gradient(to bottom, rgba(22, 25, 32, 0.4), rgba(22, 25, 32, 1)), url('/fondo_torneo.png')`, backgroundSize: 'cover', backgroundPosition: 'center 15%', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '15px' };
  const getTabStyle = (tabName) => ({ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === tabName ? '#ffd700' : '#888', borderBottom: activeTab === tabName ? '3px solid #ffd700' : '3px solid transparent', transition: 'all 0.2s ease-in-out' });
  const cardStyle = { backgroundColor: '#1a1c23', borderRadius: '6px', border: '1px solid #333', overflow: 'hidden' };
  const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e212b', borderBottom: '1px solid #444', padding: '8px 12px' };
  const thStyle = { padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', color: '#a0aab5', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' };
  const tdStyle = { padding: '6px 8px', textAlign: 'center', color: '#e0e0e0', fontSize: '12px' };

  const teamsRoster = [
    { id: "costalcanela", name: "CostalCanela", player1: "Ruizcanela", player2: "Costalceleste" },
    { id: "raisquad", name: "RaiSquad", player1: "Ryzenvelos", player2: "Squadrano" },
    { id: "sabaronte", name: "Sabaronte", player1: "Caronte", player2: "Ersabo" },
    { id: "sarcornelio", name: "SarCornelio", player1: "LucioCornelio", player2: "Panete" }
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Generar la lista visual de partidos cruzando el calendario fijo con los resultados reales
  const generateGroupMatchesUI = () => {
    const schedule = [
      { t1: "CostalCanela", t2: "RaiSquad" },
      { t1: "Sabaronte", t2: "SarCornelio" },
      { t1: "CostalCanela", t2: "Sabaronte" },
      { t1: "RaiSquad", t2: "SarCornelio" },
      { t1: "CostalCanela", t2: "SarCornelio" },
      { t1: "RaiSquad", t2: "Sabaronte" }
    ];

    return schedule.map(match => {
      // Buscar si este partido ya se ha jugado
      const playedMatch = matchResults.find(m => 
        (m.team_a === match.t1 && m.team_b === match.t2) || 
        (m.team_a === match.t2 && m.team_b === match.t1)
      );

      let scoreStr = "- : -";
      if (playedMatch) {
        if (playedMatch.team_a === match.t1) {
          scoreStr = `${playedMatch.score_a} : ${playedMatch.score_b}`;
        } else {
          scoreStr = `${playedMatch.score_b} : ${playedMatch.score_a}`;
        }
      }

      return { team1: match.t1, team2: match.t2, score: scoreStr, isPlayed: !!playedMatch, dbData: playedMatch };
    });
  };

  const groupMatchesUI = generateGroupMatchesUI();

  return (
    <div style={containerStyle}>
      
      {/* BLOQUE DE ESTILOS PARA ANIMACIONES Y HOVERS */}
      <style>{`
        @keyframes pulseGlow { 0% { box-shadow: 0 0 0 rgba(255, 215, 0, 0.4); border-color: #ffd700; transform: scale(1); } 50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.8); border-color: #fff; transform: scale(1.03); } 100% { box-shadow: 0 0 0 rgba(255, 215, 0, 0); border-color: #333; transform: scale(1); } }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .highlight-card { animation: pulseGlow 1s ease-out 2; z-index: 10; }
        .clickable-name:hover { color: #ffd700 !important; }
        .clickable-logo { cursor: pointer; transition: transform 0.2s; }
        .clickable-logo:hover { transform: scale(1.15); }
        .match-row { transition: background 0.2s; }
        .match-row.played:hover { background-color: #2a2d36 !important; cursor: pointer; }
      `}</style>

      {/* HERO BANNER */}
      <div style={heroStyle}>
        <h1 style={{ fontSize: '2rem', margin: '0', color: '#ffd700', textShadow: '2px 2px 4px rgba(0,0,0,0.9)', textTransform: 'uppercase', letterSpacing: '2px' }}>Master of Puppets</h1>
        <p style={{ fontSize: '12px', color: '#a0aab5', margin: '5px 0 0 0', textShadow: '1px 1px 2px rgba(0,0,0,0.9)', fontWeight: 'bold', letterSpacing: '1px' }}>PULLING THE STRINGS. CARRYING THE DEAD WEIGHT.</p>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #2a2d36', backgroundColor: '#1e212b', padding: '0 1rem' }}>
        <div onClick={() => setActiveTab('standings')} style={getTabStyle('standings')}>Standings & Bracket</div>
        <div onClick={() => setActiveTab('teams')} style={getTabStyle('teams')}>Teams Roster</div>
        <div onClick={() => setActiveTab('rules')} style={getTabStyle('rules')}>Ruleset</div>
        {(userRole === 'admin' || userRole === 'member') && (
          <div onClick={() => setActiveTab('log')} style={getTabStyle('log')}>Log Match</div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* TAB 1: STANDINGS & BRACKET */}
        {activeTab === 'standings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
              
              {/* GROUP STAGE STANDINGS */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#ffd700', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>🏆 Group Stage Standings</h3>
                  <span style={{ color: '#888', fontSize: '11px', fontStyle: 'italic' }}>Format: 1v1 Round Robin</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      <th style={{ ...thStyle, width: '40px' }}>#</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Team</th>
                      <th style={{ ...thStyle }}>Series (W-L)</th>
                      <th style={{ ...thStyle }}>Maps (W-L)</th>
                      <th style={{ ...thStyle, width: '60px', color: '#ffd700' }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedStandings.map((team, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: index % 2 === 0 ? '#161920' : '#1a1c23', height: '54px' }}>
                        <td style={{ ...tdStyle, color: '#ffd700', fontWeight: 'bold', fontSize: '14px' }}>{team.pos}</td>
                        <td style={{ ...tdStyle, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px', height: '54px' }}>
                          <img src={`/teams/${team.id}.png`} alt={team.name} className="clickable-logo" onClick={() => setExpandedImage(`/teams/${team.id}.png`)} style={{ width: '48px', height: '48px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; }} />
                          <span className="clickable-name" onClick={() => handleTeamClick(team.id)} style={{ fontWeight: 'bold', color: '#e0e0e0', fontSize: '15px', cursor: 'pointer', transition: 'color 0.2s' }}>{team.name}</span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{team.seriesW} - {team.seriesL}</td>
                        <td style={{ ...tdStyle }}>{team.mapsW} - {team.mapsL}</td>
                        <td style={{ ...tdStyle, color: '#ffd700', fontWeight: 'bold', fontSize: '14px' }}>{team.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* LIGA: ENFRENTAMIENTOS */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#66b2ff', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>📅 Group Stage Matches</h3>
                </div>
                <div style={{ padding: '10px' }}>
                  {groupMatchesUI.map((match, idx) => (
                    <div 
                      key={idx} 
                      className={`match-row ${match.isPlayed ? 'played' : ''}`}
                      onClick={() => match.isPlayed && setSelectedMatchModal(match.dbData)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: idx % 2 === 0 ? '#161920' : 'transparent', borderBottom: idx === groupMatchesUI.length - 1 ? 'none' : '1px solid #2a2d36' }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '500', color: match.isPlayed ? '#888' : '#e0e0e0', flex: 1, textAlign: 'right' }}>{match.team1}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: match.isPlayed ? '#fff' : '#ffd700', margin: '0 15px', backgroundColor: match.isPlayed ? '#333' : '#1e212b', padding: '2px 8px', borderRadius: '4px', border: '1px solid #333' }}>{match.score}</span>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: match.isPlayed ? '#888' : '#e0e0e0', flex: 1, textAlign: 'left' }}>{match.team2}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PLAYOFFS BRACKET */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
              <div style={{ ...cardStyle, borderTop: '3px solid #888' }}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#888', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>🥉 Duel of Dwarves</h3>
                  <span style={{ color: '#888', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px' }}>BO3</span>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#a0aab5', fontSize: '13px', fontWeight: 'bold' }}>3rd Group Stage</span><span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#a0aab5', fontSize: '13px', fontWeight: 'bold' }}>4th Group Stage</span><span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
                  </div>
                </div>
              </div>

              <div style={{ ...cardStyle, borderTop: '3px solid #ffd700' }}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#ffd700', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>🏆 Grand Final</h3>
                  <span style={{ color: '#ffd700', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#ffd70033', padding: '2px 6px', borderRadius: '3px' }}>BO5</span>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold' }}>1st Group Stage</span><span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold' }}>2nd Group Stage</span><span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS ROSTER */}
        {activeTab === 'teams' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {teamsRoster.map((team, index) => (
              <div key={index} className={highlightTeam === team.id ? 'highlight-card' : ''} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '25px 20px', position: 'relative', borderTop: '3px solid #ffd700', transition: 'all 0.3s' }}>
                <img src={`/teams/${team.id}.png`} alt={team.name} className="clickable-logo" onClick={() => setExpandedImage(`/teams/${team.id}.png`)} style={{ width: '180px', height: '180px', objectFit: 'contain', marginBottom: '15px' }} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                <div style={{ display: 'none', width: '180px', height: '180px', backgroundColor: '#2a2d36', borderRadius: '50%', marginBottom: '15px' }}></div>
                <h2 style={{ color: '#e0e0e0', margin: '0 0 15px 0', fontSize: '18px', letterSpacing: '1px' }}>{team.name}</h2>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e212b', padding: '10px', borderRadius: '4px', border: '1px solid #2a2d36' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}><div style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Puppeteer</div><div style={{ color: '#66b2ff', fontSize: '13px', fontWeight: 'bold' }}>{team.player1}</div></div>
                  <div style={{ width: '1px', backgroundColor: '#333' }}></div>
                  <div style={{ textAlign: 'center', flex: 1 }}><div style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Puppet</div><div style={{ color: '#ff6666', fontSize: '13px', fontWeight: 'bold' }}>{team.player2}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: RULESET */}
        {activeTab === 'rules' && (
          <div style={{ ...cardStyle, maxWidth: '800px', margin: '0 auto' }}>
            <div style={cardHeaderStyle}><h3 style={{ color: '#ff6666', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>📜 Tournament Ruleset</h3></div>
            <div style={{ padding: '30px', fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6', textAlign: 'left' }}>
              <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #2a2d36' }}><h4 style={{ color: '#ffd700', fontSize: '16px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>1. Group Stage</h4><p style={{ margin: 0 }}><strong>1v1 with Live Coaching.</strong> Format: <strong>Play All 3</strong>. All 3 maps must be played to accumulate standings points.</p></div>
              <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #2a2d36' }}><h4 style={{ color: '#ffd700', fontSize: '16px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>2. Playoffs (2v2)</h4><p style={{ margin: '0 0 8px 0' }}>Played together as Puppeteer + Puppet.</p><ul style={{ margin: 0, paddingLeft: '20px', color: '#a0aab5', listStyleType: 'disc' }}><li style={{ marginBottom: '6px' }}><strong style={{ color: '#e0e0e0' }}>Duel of Dwarves (3rd vs 4th):</strong> Best of 3.</li><li><strong style={{ color: '#e0e0e0' }}>Grand Final (1st vs 2nd):</strong> Best of 5.</li></ul></div>
              <div><h4 style={{ color: '#ffd700', fontSize: '16px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>3. Maps & Civs</h4><ul style={{ margin: 0, paddingLeft: '20px', color: '#a0aab5', listStyleType: 'disc' }}><li style={{ marginBottom: '8px' }}>The first map is always <strong>Arabia</strong>.</li><li style={{ marginBottom: '8px' }}>The loser picks the next map (<strong>Arabia</strong> or <strong>Arena</strong>).</li><li style={{ marginBottom: '8px' }}><strong>Free civilization choice</strong> (no draft).</li><li style={{ marginBottom: '8px' }}><strong style={{ color: '#ff4444' }}>No civilization repeats</strong> allowed during the entire series.</li><li><strong style={{ color: '#ffd700' }}>Penalty for repeating civ:</strong> If noticed before 10 minutes in-game, RE and the opponent chooses the offending player's civilization. If noticed after 10 minutes, automatic loss for that map.</li></ul></div>
            </div>
          </div>
        )}

        {/* TAB 4: LOG MATCH */}
        {activeTab === 'log' && (userRole === 'admin' || userRole === 'member') && (
          <div style={{ ...cardStyle, maxWidth: '1000px', margin: '0 auto' }}>
            <div style={cardHeaderStyle}>
              <h3 style={{ color: '#ffd700', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>📝 Log Match Result</h3>
              {isAdmin && <button onClick={resetAllResults} style={{ backgroundColor: '#ff4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>RESET ALL DATA</button>}
            </div>
            <div style={{ padding: '30px' }}>
              
              {/* STAGE SLIDER */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', backgroundColor: '#1e212b', borderRadius: '8px', padding: '4px', border: '1px solid #333' }}>
                  <button onClick={() => {setLogStage('group'); setTeamA(""); setTeamB(""); setSelectedGroupMatchIdx("");}} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: logStage === 'group' ? '#ffd700' : 'transparent', color: logStage === 'group' ? '#161920' : '#888', transition: 'all 0.2s' }}>Group Stage</button>
                  <button onClick={() => {setLogStage('playoffs'); setTeamA(""); setTeamB("");}} disabled={!isGroupStageComplete && !isAdmin} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: isGroupStageComplete || isAdmin ? 'pointer' : 'not-allowed', backgroundColor: logStage === 'playoffs' ? '#ffd700' : 'transparent', color: logStage === 'playoffs' ? '#161920' : '#555', transition: 'all 0.2s' }}>Playoffs {(!isGroupStageComplete && !isAdmin) && '🔒'}</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                {logStage === 'group' ? (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#e0e0e0', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Select Match</label>
                    <select value={selectedGroupMatchIdx} onChange={handleGroupMatchSelect} style={{ width: '100%', padding: '10px', backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontSize: '14px' }}>
                      <option value="">- Choose Group Match -</option>
                      {GROUP_SCHEDULE.map((m, i) => <option key={i} value={i}>{m.t1} vs {m.t2}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', color: '#66b2ff', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Team A</label>
                      <select value={teamA} onChange={e => setTeamA(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                        <option value="">- Select Team A -</option>
                        {Object.keys(TEAM_MEMBERS).map(team => <option key={team} value={team} disabled={team === teamB}>{team}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', color: '#ff6666', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Team B</label>
                      <select value={teamB} onChange={e => setTeamB(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                        <option value="">- Select Team B -</option>
                        {Object.keys(TEAM_MEMBERS).map(team => <option key={team} value={team} disabled={team === teamA}>{team}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {teamA && teamB && [0, 1, 2].map(i => (
                <div key={i} style={{ backgroundColor: '#1e212b', padding: '15px', borderRadius: '4px', border: '1px solid #2a2d36', marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ width: '40px', color: '#888', fontWeight: 'bold', textAlign: 'center' }}>Map {i+1}</div>
                  
                  <select value={mapsData[i].map} onChange={e => updateMapData(i, 'map', e.target.value)} style={{ flex: 1, padding: '6px', backgroundColor: '#161920', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                    <option value="">- Map -</option>
                    {mapPool.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>

                  <select value={mapsData[i].civA} onChange={e => updateMapData(i, 'civA', e.target.value)} style={{ flex: 1, padding: '6px', backgroundColor: '#161920', color: '#66b2ff', border: '1px solid #66b2ff55', borderRadius: '4px' }}>
                    <option value="">- Civ A -</option>
                    {civs.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <div style={{ color: '#555', fontSize: '12px', fontWeight: 'bold' }}>VS</div>

                  <select value={mapsData[i].civB} onChange={e => updateMapData(i, 'civB', e.target.value)} style={{ flex: 1, padding: '6px', backgroundColor: '#161920', color: '#ff6666', border: '1px solid #ff666655', borderRadius: '4px' }}>
                    <option value="">- Civ B -</option>
                    {civs.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select value={mapsData[i].winner} onChange={e => updateMapData(i, 'winner', e.target.value)} style={{ width: '120px', padding: '6px', backgroundColor: '#161920', color: mapsData[i].winner === 'A' ? '#66b2ff' : mapsData[i].winner === 'B' ? '#ff6666' : '#fff', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold' }}>
                    <option value="">- Winner -</option>
                    <option value="A">{teamA}</option>
                    <option value="B">{teamB}</option>
                  </select>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {existingMatch && <span style={{ color: isAdmin ? '#ffd700' : '#ff4444', fontSize: '12px', fontWeight: 'bold' }}>{isAdmin ? '⚠️ Match exists. Submitting will overwrite.' : '🔒 Match already logged. Only Admins can modify.'}</span>}
                  {(!isAuthorizedToLog && !isAdmin && !existingMatch && teamA && teamB) && <span style={{ color: '#ff4444', fontSize: '12px', fontWeight: 'bold' }}>⚠️ Only {teamA} or {teamB} members can submit.</span>}
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  {isAdmin && teamA && teamB && (
                    <>
                      <button onClick={() => handleSubmit('A')} style={{ backgroundColor: '#1e212b', color: '#66b2ff', border: '1px solid #66b2ff', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ADMIN WIN {teamA}</button>
                      <button onClick={() => handleSubmit('B')} style={{ backgroundColor: '#1e212b', color: '#ff6666', border: '1px solid #ff6666', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ADMIN WIN {teamB}</button>
                    </>
                  )}
                  <button 
                    onClick={() => handleSubmit()} 
                    disabled={(!isAuthorizedToLog && !isAdmin) || (existingMatch && !isAdmin) || isSubmitting || !teamA || !teamB} 
                    style={{ backgroundColor: ((isAuthorizedToLog || isAdmin) && teamA && teamB && (!existingMatch || isAdmin)) ? '#ffd700' : '#333', color: '#161920', fontWeight: 'bold', border: 'none', padding: '10px 30px', borderRadius: '4px', cursor: ((isAuthorizedToLog || isAdmin) && teamA && teamB && (!existingMatch || isAdmin)) ? 'pointer' : 'not-allowed' }}
                  >
                    {isSubmitting ? 'SUBMITTING...' : existingMatch ? 'OVERWRITE MATCH' : 'SUBMIT MATCH'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

{/* MATCH DETAILS MODAL (LIQUIPEDIA STYLE) */}
      {selectedMatchModal && (
        <div onClick={() => setSelectedMatchModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#22252e', border: '1px solid #444', borderRadius: '8px', padding: '20px', width: '500px', maxWidth: '90vw', animation: 'zoomIn 0.2s ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
              <div style={{ flex: 1, textAlign: 'right', fontSize: '18px', fontWeight: 'bold', color: '#66b2ff' }}>{selectedMatchModal.team_a}</div>
              <div style={{ margin: '0 20px', fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{selectedMatchModal.score_a} : {selectedMatchModal.score_b}</div>
              <div style={{ flex: 1, textAlign: 'left', fontSize: '18px', fontWeight: 'bold', color: '#ff6666' }}>{selectedMatchModal.team_b}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[selectedMatchModal.map_1_data, selectedMatchModal.map_2_data, selectedMatchModal.map_3_data].map((m, i) => m && m.map && (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', borderRadius: '4px', border: '1px solid #2a2d36' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: m.winner === 'A' ? '#4caf50' : '#ff4444', backgroundColor: m.winner === 'A' ? '#4caf5033' : '#ff444433', padding: '2px 6px', borderRadius: '3px' }}>{m.winner === 'A' ? 'W' : 'L'}</span>
                    {m.civA !== 'Admin' && <img src={`/civs/${m.civA.toLowerCase()}.png`} alt={m.civA} style={{ width: '24px', height: '24px' }} title={m.civA} onError={e => e.target.style.display='none'} />}
                  </div>
                  
                  <div style={{ color: '#a0aab5', fontSize: '14px', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>{m.map}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100px', justifyContent: 'flex-end' }}>
                    {m.civB !== 'Admin' && <img src={`/civs/${m.civB.toLowerCase()}.png`} alt={m.civB} style={{ width: '24px', height: '24px' }} title={m.civB} onError={e => e.target.style.display='none'} />}
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: m.winner === 'B' ? '#4caf50' : '#ff4444', backgroundColor: m.winner === 'B' ? '#4caf5033' : '#ff444433', padding: '2px 6px', borderRadius: '3px' }}>{m.winner === 'B' ? 'W' : 'L'}</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setSelectedMatchModal(null)} style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>CLOSE</button>
          </div>
        </div>
      )}

      {/* MODAL PARA AMPLIAR IMAGEN DE EQUIPO */}
      {expandedImage && (
        <div onClick={() => setExpandedImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
          <img src={expandedImage} alt="Expanded Team Logo" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', animation: 'zoomIn 0.3s ease-out' }} />
        </div>
      )}
    </div>
  );
};

export default CurrentEvent;