import { useState } from 'react';

const CurrentEvent = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // COMPACT STYLES (PA Draft based)
  const containerStyle = {
    backgroundColor: '#161920',
    color: '#e0e0e0',
    minHeight: '100vh',
    padding: '0',
    fontFamily: 'Segoe UI, sans-serif'
  };

  // Compact Hero Banner
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

  // Temp Data
  const standings = [
    { pos: 1, name: "Squadryzen", players: "Ryzenvelos & Squadrano", series: "0 - 0", maps: "0 - 0", diff: 0 },
    { pos: 2, name: "Costalcanela", players: "Costalceleste & Ruizcanela", series: "0 - 0", maps: "0 - 0", diff: 0 },
    { pos: 3, name: "PanisCornelio", players: "Panete & LucioCornelio", series: "0 - 0", maps: "0 - 0", diff: 0 },
    { pos: 4, name: "SaborAverno", players: "Ersabo & Caronte", series: "0 - 0", maps: "0 - 0", diff: 0 }
  ];

  return (
    <div style={containerStyle}>
      
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
        <div onClick={() => setActiveTab('overview')} style={getTabStyle('overview')}>Overview Dashboard</div>
        <div onClick={() => setActiveTab('teams')} style={getTabStyle('teams')}>Teams Roster</div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            
            {/* LEFT COLUMN: STANDINGS & BRACKET */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* GROUP STAGE STANDINGS */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#ffd700', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>🏆 Group Stage Standings</h3>
                  <span style={{ color: '#888', fontSize: '11px', fontStyle: 'italic' }}>Format: 1v1 Round Robin (Play All 3)</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      <th style={{ ...thStyle, width: '40px' }}>#</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Team</th>
                      <th style={{ ...thStyle }}>Series (W-L)</th>
                      <th style={{ ...thStyle }}>Maps (W-L)</th>
                      <th style={{ ...thStyle, width: '60px' }}>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: index % 2 === 0 ? '#161920' : '#1a1c23', height: '36px' }}>
                        <td style={{ ...tdStyle, color: '#ffd700', fontWeight: 'bold' }}>{team.pos}</td>
                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                          <div style={{ fontWeight: 'bold', color: '#e0e0e0', fontSize: '13px' }}>{team.name}</div>
                          <div style={{ fontSize: '10px', color: '#888' }}>{team.players}</div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{team.series}</td>
                        <td style={{ ...tdStyle }}>{team.maps}</td>
                        <td style={{ ...tdStyle, color: team.diff > 0 ? '#4caf50' : team.diff < 0 ? '#ff4444' : '#888' }}>
                          {team.diff > 0 ? `+${team.diff}` : team.diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PLAYOFFS BRACKET */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#ffd700', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>🌳 Playoffs Bracket (2v2)</h3>
                </div>
                <div style={{ padding: '60px 15px', textAlign: 'center', color: '#555', fontSize: '12px', fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '30px', marginBottom: '10px' }}>🔐</span>
                  Bracket will unlock after the Group Stage is completed.
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: RULES & MATCHES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* TOURNAMENT RULESET */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#ff6666', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>📜 Tournament Ruleset</h3>
                </div>
                <div style={{ padding: '20px', fontSize: '13px', color: '#e0e0e0', lineHeight: '1.6', textAlign: 'left' }}>
                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #333' }}>
                    <strong style={{ color: '#ffd700', fontSize: '14px' }}>1. Group Stage (Liguilla)</strong><br />
                    1v1 with Live Coaching. Format: <strong style={{color: '#fff'}}>Play All 3 (Pa3)</strong>. All 3 maps must be played to accumulate standings points.
                  </div>
                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #333' }}>
                    <strong style={{ color: '#ffd700', fontSize: '14px' }}>2. Playoffs (2v2)</strong><br />
                    <span style={{ color: '#66b2ff' }}>3rd vs 4th Place:</span> Best of 3 (Bo3).<br />
                    <span style={{ color: '#66b2ff' }}>Grand Final (1st vs 2nd):</span> Best of 5 (Bo5).<br />
                    <span style={{ color: '#888', fontStyle: 'italic', fontSize: '12px' }}>Played together as Master + Pupil.</span>
                  </div>
                  <div>
                    <strong style={{ color: '#ffd700', fontSize: '14px' }}>3. Maps & Civs</strong><br />
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#a0aab5', listStyleType: 'square' }}>
                      <li style={{ marginBottom: '6px' }}>The first map is always <strong style={{color: '#fff'}}>Arabia</strong>.</li>
                      <li style={{ marginBottom: '6px' }}>The loser picks the next map (Arabia or Arena).</li>
                      <li style={{ marginBottom: '6px' }}>Free civilization choice (no draft).</li>
                      <li><strong style={{color: '#ff4444'}}>No civilization repeats</strong> allowed during the entire series.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* UPCOMING MATCHES */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <h3 style={{ color: '#66b2ff', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>📅 Upcoming Matches</h3>
                </div>
                <div style={{ padding: '30px 15px', textAlign: 'center', color: '#888', fontSize: '11px', fontStyle: 'italic' }}>
                  Schedule is being generated...
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TEAMS ROSTER TAB */}
        {activeTab === 'teams' && (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={{ color: '#ffd700', margin: 0, fontSize: '13px', textTransform: 'uppercase' }}>⚔️ Official Teams Roster</h3>
            </div>
            <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
              Teams grid in development.<br/>
              (Master/Pupil avatars and team logos will be mapped here soon).
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CurrentEvent;