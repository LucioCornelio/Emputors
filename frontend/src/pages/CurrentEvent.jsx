import { useState } from 'react';

const CurrentEvent = () => {
  const [activeTab, setActiveTab] = useState('standings');
  const [highlightTeam, setHighlightTeam] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  const handleTeamClick = (teamId) => {
    setActiveTab('teams');
    setHighlightTeam(teamId);
    setTimeout(() => setHighlightTeam(null), 2000); // Quita la clase tras terminar la animación
  };

  // COMPACT STYLES
  const containerStyle = {
    backgroundColor: '#161920',
    color: '#e0e0e0',
    minHeight: '100vh',
    padding: '0',
    fontFamily: 'Segoe UI, sans-serif',
    position: 'relative'
  };

  const heroStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(22, 25, 32, 0.4), rgba(22, 25, 32, 1)), url('/fondo_torneo.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center 15%',
    height: '180px', 
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: '15px',
  };

  const getTabStyle = (tabName) => ({
    padding: '10px 15px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: activeTab === tabName ? '#ffd700' : '#888',
    borderBottom: activeTab === tabName ? '3px solid #ffd700' : '3px solid transparent',
    transition: 'all 0.2s ease-in-out'
  });

  const cardStyle = {
    backgroundColor: '#1a1c23',
    borderRadius: '6px',
    border: '1px solid #333',
    overflow: 'hidden'
  };

  const cardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e212b',
    borderBottom: '1px solid #444',
    padding: '8px 12px'
  };

  const thStyle = {
    padding: '6px 8px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    color: '#a0aab5',
    fontWeight: 'bold',
    fontSize: '11px',
    textTransform: 'uppercase'
  };

  const tdStyle = {
    padding: '6px 8px',
    textAlign: 'center',
    color: '#e0e0e0',
    fontSize: '12px'
  };

  // Datos ordenados alfabéticamente
  const standings = [
    { id: "costalcanela", name: "CostalCanela", series: "0 - 0", maps: "0 - 0", pts: 0 },
    { id: "raisquad", name: "RaiSquad", series: "0 - 0", maps: "0 - 0", pts: 0 },
    { id: "sabaronte", name: "Sabaronte", series: "0 - 0", maps: "0 - 0", pts: 0 },
    { id: "sarcornelio", name: "SarCornelio", series: "0 - 0", maps: "0 - 0", pts: 0 }
  ].sort((a, b) => a.name.localeCompare(b.name)).map((team, i) => ({ ...team, pos: i + 1 }));

  const teamsRoster = [
    { id: "costalcanela", name: "CostalCanela", player1: "Ruizcanela", player2: "Costalceleste" },
    { id: "raisquad", name: "RaiSquad", player1: "Ryzenvelos", player2: "Squadrano" },
    { id: "sabaronte", name: "Sabaronte", player1: "Caronte", player2: "Ersabo" },
    { id: "sarcornelio", name: "SarCornelio", player1: "LucioCornelio", player2: "Panete" }
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Enfrentamientos de la liguilla (Play All 3)
  const groupMatches = [
    { team1: "CostalCanela", team2: "RaiSquad", score: "- : -" },
    { team1: "Sabaronte", team2: "SarCornelio", score: "- : -" },
    { team1: "CostalCanela", team2: "Sabaronte", score: "- : -" },
    { team1: "RaiSquad", team2: "SarCornelio", score: "- : -" },
    { team1: "CostalCanela", team2: "SarCornelio", score: "- : -" },
    { team1: "RaiSquad", team2: "Sabaronte", score: "- : -" }
  ];

  return (
    <div style={containerStyle}>
      
      {/* BLOQUE DE ESTILOS PARA ANIMACIONES Y HOVERS */}
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 rgba(255, 215, 0, 0.4); border-color: #ffd700; transform: scale(1); }
          50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.8); border-color: #fff; transform: scale(1.03); }
          100% { box-shadow: 0 0 0 rgba(255, 215, 0, 0); border-color: #333; transform: scale(1); }
        }
        @keyframes zoomIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .highlight-card {
          animation: pulseGlow 1s ease-out 2;
          z-index: 10;
        }
        .clickable-name:hover {
          color: #ffd700 !important;
        }
        .clickable-logo {
          cursor: pointer;
          transition: transform 0.2s;
        }
        .clickable-logo:hover {
          transform: scale(1.15);
        }
      `}</style>

      {/* HERO BANNER */}
      <div style={heroStyle}>
        <h1 style={{ fontSize: '2rem', margin: '0', color: '#ffd700', textShadow: '2px 2px 4px rgba(0,0,0,0.9)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          Master of Puppets
        </h1>
        <p style={{ fontSize: '12px', color: '#a0aab5', margin: '5px 0 0 0', textShadow: '1px 1px 2px rgba(0,0,0,0.9)', fontWeight: 'bold', letterSpacing: '1px' }}>
          PULLING THE STRINGS. CARRYING THE DEAD WEIGHT.
        </p>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #2a2d36', backgroundColor: '#1e212b', padding: '0 1rem' }}>
        <div onClick={() => setActiveTab('standings')} style={getTabStyle('standings')}>Standings & Bracket</div>
        <div onClick={() => setActiveTab('teams')} style={getTabStyle('teams')}>Teams Roster</div>
        <div onClick={() => setActiveTab('rules')} style={getTabStyle('rules')}>Ruleset</div>
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
                    {standings.map((team, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: index % 2 === 0 ? '#161920' : '#1a1c23', height: '54px' }}>
                        <td style={{ ...tdStyle, color: '#ffd700', fontWeight: 'bold', fontSize: '14px' }}>{team.pos}</td>
                        <td style={{ ...tdStyle, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px', height: '54px' }}>
                          <img 
                            src={`/teams/${team.id}.png`} 
                            alt={team.name} 
                            className="clickable-logo"
                            onClick={() => setExpandedImage(`/teams/${team.id}.png`)}
                            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display='none'; }}
                          />
                          <span 
                            className="clickable-name"
                            onClick={() => handleTeamClick(team.id)}
                            style={{ fontWeight: 'bold', color: '#e0e0e0', fontSize: '15px', cursor: 'pointer', transition: 'color 0.2s' }}
                          >
                            {team.name}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{team.series}</td>
                        <td style={{ ...tdStyle }}>{team.maps}</td>
                        <td style={{ ...tdStyle, color: '#ffd700', fontWeight: 'bold', fontSize: '14px' }}>
                          {team.pts}
                        </td>
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
                  {groupMatches.map((match, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: idx % 2 === 0 ? '#161920' : 'transparent', borderBottom: idx === groupMatches.length - 1 ? 'none' : '1px solid #2a2d36' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#e0e0e0', flex: 1, textAlign: 'right' }}>{match.team1}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffd700', margin: '0 15px', backgroundColor: '#1e212b', padding: '2px 8px', borderRadius: '4px', border: '1px solid #333' }}>{match.score}</span>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#e0e0e0', flex: 1, textAlign: 'left' }}>{match.team2}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PLAYOFFS BRACKET */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
              
              {/* DUEL OF DWARVES (3rd vs 4th) */}
              <div style={{ ...cardStyle, borderTop: '3px solid #888' }}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#888', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>🥉 Duel of Dwarves</h3>
                  <span style={{ color: '#888', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px' }}>BO3</span>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#a0aab5', fontSize: '13px', fontWeight: 'bold' }}>3rd Group Stage</span>
                    <span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#a0aab5', fontSize: '13px', fontWeight: 'bold' }}>4th Group Stage</span>
                    <span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
                  </div>
                </div>
              </div>

              {/* GRAND FINAL (1st vs 2nd) */}
              <div style={{ ...cardStyle, borderTop: '3px solid #ffd700' }}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#ffd700', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>🏆 Grand Final</h3>
                  <span style={{ color: '#ffd700', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#ffd70033', padding: '2px 6px', borderRadius: '3px' }}>BO5</span>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold' }}>1st Group Stage</span>
                    <span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161920', padding: '10px 15px', border: '1px solid #2a2d36', borderRadius: '4px' }}>
                    <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold' }}>2nd Group Stage</span>
                    <span style={{ color: '#555', fontWeight: 'bold' }}>-</span>
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
              <div 
                key={index} 
                className={highlightTeam === team.id ? 'highlight-card' : ''}
                style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '25px 20px', position: 'relative', borderTop: '3px solid #ffd700', transition: 'all 0.3s' }}
              >
                <img 
                  src={`/teams/${team.id}.png`} 
                  alt={team.name} 
                  className="clickable-logo"
                  onClick={() => setExpandedImage(`/teams/${team.id}.png`)}
                  style={{ width: '180px', height: '180px', objectFit: 'contain', marginBottom: '15px' }}
                  onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                />
                <div style={{ display: 'none', width: '180px', height: '180px', backgroundColor: '#2a2d36', borderRadius: '50%', marginBottom: '15px' }}></div>
                
                <h2 style={{ color: '#e0e0e0', margin: '0 0 15px 0', fontSize: '18px', letterSpacing: '1px' }}>{team.name}</h2>
                
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', backgroundColor: '#1e212b', padding: '10px', borderRadius: '4px', border: '1px solid #2a2d36' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Puppeteer</div>
                    <div style={{ color: '#66b2ff', fontSize: '13px', fontWeight: 'bold' }}>{team.player1}</div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#333' }}></div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ color: '#888', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Puppet</div>
                    <div style={{ color: '#ff6666', fontSize: '13px', fontWeight: 'bold' }}>{team.player2}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: RULESET */}
        {activeTab === 'rules' && (
          <div style={{ ...cardStyle, maxWidth: '800px', margin: '0 auto' }}>
            <div style={cardHeaderStyle}>
              <h3 style={{ color: '#ff6666', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>📜 Tournament Ruleset</h3>
            </div>
            <div style={{ padding: '30px', fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6', textAlign: 'left' }}>
              
              <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #2a2d36' }}>
                <h4 style={{ color: '#ffd700', fontSize: '16px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>1. Group Stage</h4>
                <p style={{ margin: 0 }}>
                  <strong>1v1 with Live Coaching.</strong> Format: <strong>Play All 3</strong>. All 3 maps must be played to accumulate standings points.
                </p>
              </div>

              <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #2a2d36' }}>
                <h4 style={{ color: '#ffd700', fontSize: '16px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>2. Playoffs (2v2)</h4>
                <p style={{ margin: '0 0 8px 0' }}>Played together as Puppeteer + Puppet.</p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#a0aab5', listStyleType: 'disc' }}>
                  <li style={{ marginBottom: '6px' }}><strong style={{ color: '#e0e0e0' }}>Duel of Dwarves (3rd vs 4th):</strong> Best of 3.</li>
                  <li><strong style={{ color: '#e0e0e0' }}>Grand Final (1st vs 2nd):</strong> Best of 5.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#ffd700', fontSize: '16px', margin: '0 0 10px 0', textTransform: 'uppercase' }}>3. Maps & Civs</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#a0aab5', listStyleType: 'disc' }}>
                  <li style={{ marginBottom: '8px' }}>The first map is always <strong>Arabia</strong>.</li>
                  <li style={{ marginBottom: '8px' }}>The loser picks the next map (<strong>Arabia</strong> or <strong>Arena</strong>).</li>
                  <li style={{ marginBottom: '8px' }}><strong>Free civilization choice</strong> (no draft).</li>
                  <li style={{ marginBottom: '8px' }}><strong style={{ color: '#ff4444' }}>No civilization repeats</strong> allowed during the entire series.</li>
                  <li><strong style={{ color: '#ffd700' }}>Penalty for repeating civ:</strong> If noticed before 10 minutes in-game, RE and the opponent chooses the offending player's civilization. If noticed after 10 minutes, automatic loss for that map.</li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL PARA AMPLIAR IMAGEN DE EQUIPO */}
      {expandedImage && (
        <div 
          onClick={() => setExpandedImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
        >
          <img 
            src={expandedImage} 
            alt="Expanded Team Logo" 
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', animation: 'zoomIn 0.3s ease-out' }} 
          />
        </div>
      )}
    </div>
  );
};

export default CurrentEvent;