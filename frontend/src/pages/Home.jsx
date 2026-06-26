import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const C = {
  bg: '#121418',
  card: '#1a1c23',
  border: '#2a2d36',
  textMain: '#e0e0e0',
  textDim: '#a0aab5',
  gold: '#ffd700',
  cyan: '#00c8c8',
  discord: '#5865F2',
};

const s = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    minHeight: '80vh',
    color: C.textMain,
  },
  hero: {
    textAlign: 'center',
    padding: '60px 20px',
    background: `radial-gradient(circle, #1a1c23 0%, ${C.bg} 70%)`,
    borderRadius: '12px',
    border: `1px solid ${C.border}`,
    marginBottom: '40px',
  },
  heroLogo: {
    height: '180px',
    marginBottom: '20px',
    objectFit: 'contain'
  },
  heroSubtitle: {
    fontSize: '20px',
    color: C.textDim,
    margin: '0 0 30px 0',
    fontWeight: '300',
  },
  buttonContainer: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnGold: {
    backgroundColor: C.gold,
    color: '#121418',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'filter 0.2s',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    color: C.gold,
    border: `1px solid ${C.gold}`,
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '25px',
  },
  cardTitle: {
    color: C.cyan,
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '16px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: `1px solid ${C.border}`,
    paddingBottom: '10px',
  },
  discordBtn: {
    backgroundColor: C.discord,
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  }
};

const Home = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkRole = async (u) => {
    const rawNick = u.user_metadata.preferred_username || u.user_metadata.name || '';
    const cleanNick = rawNick.split('#')[0].toLowerCase(); 
    const { data } = await supabase.from('clan_roles').select('role').ilike('discord_username', cleanNick).single();
    if (data) setRole(data.role);
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    });
  };

  return (
    <div style={s.container}>
      
      {/* 1. HERO SECTION */}
      <div style={s.hero}>
        <img src="/logo_emputors.png" alt="Emputors Logo" style={s.heroLogo} />
        <p style={s.heroSubtitle}>Age of Empires II Official Clan Portal</p>
        <div style={s.buttonContainer}>
          <Link to="/tournaments/current" style={s.btnGold}>CURRENT EVENT</Link>
          <Link to="/academy/build-orders" style={s.btnGhost}>BUILD ACADEMY</Link>
        </div>
      </div>

      <div style={s.grid}>
        
        {/* 2. DYNAMIC AUTH BLOCK */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>👤 Your Profile</h2>
          {!user ? (
            <div>
              <p style={{ color: C.textDim, marginBottom: '20px', lineHeight: '1.5', fontSize: '14px' }}>
                Log in to save your stats, participate in clan tournaments, and access exclusive tools.
              </p>
              <button 
                onClick={handleLogin} 
                style={s.discordBtn}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4752C4'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = C.discord}
              >
                Log in with Discord
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: C.textMain, fontSize: '15px', marginBottom: '15px' }}>
                Welcome back, <strong style={{ color: C.gold }}>{user.user_metadata.full_name || user.user_metadata.name}</strong>.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link to="/clan/roster" style={{ ...s.btnGhost, padding: '8px 12px', fontSize: '12px' }}>MY ROSTER</Link>
                {role === 'admin' && (
                  <Link to="/admin/creator" style={{ backgroundColor: '#2a2d36', color: '#fff', border: `1px solid ${C.border}`, padding: '8px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
                    ADMIN PANEL
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. ACTIVE TOURNAMENT WIDGET */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>🏆 Active Tournament</h2>
          <div style={{ backgroundColor: '#161920', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '20px', textAlign: 'center' }}>
            <h3 style={{ color: '#fff', margin: '0 0 5px 0', fontSize: '18px' }}>LEAT 11</h3>
            <p style={{ color: C.textDim, fontSize: '13px', margin: '0 0 15px 0' }}>Group Stage in progress</p>
            <Link to="/tournaments/current" style={{ color: C.cyan, textDecoration: 'none', fontSize: '13px', fontWeight: 'bold', borderBottom: `1px dashed ${C.cyan}`, paddingBottom: '2px' }}>
              View Bracket & Results →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;