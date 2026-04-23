import React from 'react';

const C = {
  bg: '#121418',
  border: '#2a2d36',
  textDim: '#a0aab5',
};

const s = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    minHeight: '80vh',
  },
  hero: {
    textAlign: 'center',
    padding: '100px 20px',
    background: `radial-gradient(circle, #1a1c23 0%, ${C.bg} 70%)`,
    borderRadius: '12px',
    border: `1px solid ${C.border}`,
  },
  heroLogo: {
    height: '180px', // Aumentado un poco al quitar el texto
    marginBottom: '20px',
    objectFit: 'contain'
  },
  heroSubtitle: {
    fontSize: '20px',
    color: C.textDim,
    margin: 0,
    fontWeight: '300',
  },
};

const Home = () => {
  return (
    <div style={s.container}>
      <div style={s.hero}>
        <img src="/logo_emputors.png" alt="Emputors Logo" style={s.heroLogo} />
        <p style={s.heroSubtitle}>Age of Empires II Official Clan Portal</p>
      </div>
    </div>
  );
};

export default Home;