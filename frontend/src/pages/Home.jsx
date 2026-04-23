import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../public/logo_emputors.png'; // Asegúrate de que esta ruta es correcta

// Definición de Colores del Tema
const C = {
  bg: '#121418',       // Fondo ultra oscuro
  card: '#1a1c23',     // Fondo tarjetas (ligeramente más claro)
  border: '#2a2d36',   // Bordes sutiles
  text: '#e0e0e0',     // Texto principal
  textDim: '#a0aab5',  // Texto secundario desvanecido
  gold: '#ffd700',     // Oro Emputors para acentos
  goldDim: '#bfa300',  // Oro apagado
  white: '#ffffff',
};

// Estilos Comunes reutilizables
const s = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: C.text,
    backgroundColor: C.bg,
    minHeight: '100vh',
  },
  hero: {
    textAlign: 'center',
    padding: '80px 20px',
    background: `radial-gradient(circle, #1a1c23 0%, ${C.bg} 70%)`,
    borderRadius: '12px',
    marginBottom: '40px',
    border: `1px solid ${C.border}`,
  },
  heroLogo: {
    height: '150px', // Ajusta según el tamaño de tu logo
    marginBottom: '20px',
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: C.gold,
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  heroSubtitle: {
    fontSize: '20px',
    color: C.textDim,
    margin: 0,
    fontWeight: '300',
  },
  sectionTitle: {
    fontSize: '28px',
    color: C.white,
    borderBottom: `2px solid ${C.goldDim}`,
    paddingBottom: '10px',
    marginBottom: '30px',
    marginTop: '40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '20px',
    transition: 'transform 0.2s, border-color 0.2s',
    textDecoration: 'none',
    color: C.text,
    display: 'flex',
    flexDirection: 'column',
  },
  cardHover: {
    transform: 'translateY(-5px)',
    borderColor: C.goldDim,
  },
  cardTag: {
    fontSize: '12px',
    color: C.gold,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '20px',
    color: C.white,
    margin: '0 0 10px 0',
  },
  cardBody: {
    fontSize: '14px',
    color: C.textDim,
    margin: '0 0 15px 0',
    lineHeight: '1.5',
    flexGrow: 1,
  },
  cardDate: {
    fontSize: '12px',
    color: '#666',
    marginTop: 'auto',
  },
  quickLinks: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginTop: '20px',
  },
  btn: {
    display: 'inline-block',
    padding: '15px 30px',
    background: `linear-gradient(180deg, #2a2d36 0%, #1a1c23 100%)`,
    border: `1px solid ${C.border}`,
    color: C.white,
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'background 0.2s, border-color 0.2s',
    cursor: 'pointer',
  },
  btnGold: {
    background: `linear-gradient(180deg, ${C.gold} 0%, ${C.goldDim} 100%)`,
    color: '#000',
    borderColor: C.goldDim,
  },
};

// Componente para tarjetas de noticias con efecto hover
const NewsCard = ({ tag, title, body, date }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div 
      style={{...s.card, ...(hover ? s.cardHover : {})}}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={s.cardTag}>{tag}</div>
      <h3 style={s.cardTitle}>{title}</h3>
      <p style={s.cardBody}>{body}</p>
      <div style={s.cardDate}>{date}</div>
    </div>
  );
};

// Componente Principal Home
const Home = () => {
  return (
    <div style={s.container}>
      {/* SECCIÓN HERO - Bienvenida Principal */}
      <div style={s.hero}>
        <img src={logo} alt="Emputors Logo" style={s.heroLogo} />
        <h1 style={s.heroTitle}>Emputors</h1>
        <p style={s.heroSubtitle}>Age of Empires II Official Clan Portal</p>
      </div>

      {/* SECCIÓN NOTICIAS Y EVENTOS */}
      <h2 style={s.sectionTitle}>⚔️ Últimas Actualizaciones del Clan</h2>
      <div style={s.grid}>
        <NewsCard 
          tag="Torneo"
          title="Inscripciones Abiertas: Copa Emperador"
          body="Demuestra tu valía en el próximo torneo interno. Formato 1v1, mapas aleatorios. ¡Apúntate en el canal de Discord antes del viernes!"
          date="15 de Mayo, 2024"
        />
        <NewsCard 
          tag="Comunidad"
          title="Nuevas Build Orders Añadidas"
          body="Hemos actualizado la sección de Academia con estrategias frescas para Romanos y Japoneses cortesía de nuestros estrategas."
          date="10 de Mayo, 2024"
        />
        <NewsCard 
          tag="AoE2 News"
          title="Resumen del Parche 101.102..."
          body="Análisis de los cambios de equilibrio más importantes. ¿Cómo afectan los nerfs a los hunos en early game?"
          date="5 de Mayo, 2024"
        />
      </div>

      {/* SECCIÓN ACCESO RÁPIDO */}
      <h2 style={s.sectionTitle}>📚 Academia y Herramientas</h2>
      <p style={{color: C.textDim, marginBottom: '20px'}}>Accede rápidamente a nuestros recursos exclusivos para mejorar tu nivel.</p>
      <div style={s.quickLinks}>
        <Link to="/academy/build-orders" style={{...s.btn, ...s.btnGold}}>
          Consultar Build Orders
        </Link>
        <Link to="/tools" style={s.btn}>
          Herramientas de Civilización
        </Link>
        <Link to="/academy" style={s.btn}>
          Guías Generales
        </Link>
      </div>

      {/* SECCIÓN SOBRE EL CLAN / RECLUTAMIENTO (Opcional) */}
      <h2 style={s.sectionTitle}>🛡️ Sobre Emputors</h2>
      <div style={{...s.card, background: 'none', borderColor: 'transparent', padding: 0}}>
        <p style={{...s.cardBody, fontSize: '16px', lineHeight: '1.8'}}>
          Somos una comunidad apasionada de Age of Empires II, dedicada a la competición amistosa, el aprendizaje continuo y el buen ambiente. Ya seas un veterano de 2k+ ELO o un nuevo recluta aprendiendo el Fast Castle, aquí encontrarás un hogar. 
          Nuestros pilares son la lealtad, la estrategia y, por supuesto, la dominación del mapa.
        </p>
        <p style={{...s.cardBody, fontSize: '16px', fontStyle: 'italic', color: C.goldDim}}>
          "Que tus vellicos nunca falten y tus muros nunca caigan."
        </p>
      </div>

    </div>
  );
};

export default Home;