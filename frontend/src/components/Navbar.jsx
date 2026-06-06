import { NavLink, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Importamos la conexión a Supabase

const Navbar = () => {
  const [dropdown, setDropdown] = useState(null);
  const [user, setUser] = useState(null); // Estado para guardar el usuario

  // Efecto para escuchar si el usuario inicia o cierra sesión
  useEffect(() => {
    // Buscar la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Escuchar cambios (cuando hace click en login o logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'discord',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navStyle = {
    backgroundColor: '#161920',
    borderBottom: '1px solid #2a2d36',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem',
    height: '65px',
    position: 'relative',
    zIndex: 1000
  };

  const menuContainerStyle = {
    display: 'flex',
    gap: '5px',
    height: '100%'
  };

  const itemStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    height: '100%'
  };

  const getLinkStyle = ({ isActive }) => ({
    padding: '0 15px',
    color: isActive ? '#ffd700' : '#a0aab5',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'color 0.2s'
  });

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: '0',
    backgroundColor: '#1a1c23',
    minWidth: '180px',
    padding: '8px 0',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    border: '1px solid #2a2d36',
    zIndex: 100,
  };

  const dropLinkStyle = {
    display: 'block',      
    textAlign: 'left',    
    padding: '10px 16px', 
    color: '#e0e0e0',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background 0.2s, color 0.2s'
  };

  // Estilos para la sección de Autenticación
  const authContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '150px',
    justifyContent: 'flex-end'
  };

  const loginBtnStyle = {
    backgroundColor: '#5865F2',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    transition: 'background 0.2s',
  };

  const logoutBtnStyle = {
    backgroundColor: 'transparent',
    color: '#a0aab5', // Gris azulado discreto como el resto del menú
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    textAlign: 'left',
    marginTop: '2px',
    transition: 'color 0.2s'
  };

  const handleMouseEnter = (menu) => setDropdown(menu);
  const handleMouseLeave = () => setDropdown(null);

  const handleLinkHover = (e, isEnter) => {
    e.target.style.color = isEnter ? '#ffd700' : '#e0e0e0';
    e.target.style.backgroundColor = isEnter ? '#2a2d36' : 'transparent';
  };

  return (
    <nav style={navStyle}>
      {/* Logo y Nombre */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', minWidth: '150px' }}>
        <img 
          src="/logo_emputors.png" 
          alt="Emputors" 
          style={{ height: '70px', objectFit: 'contain' }} 
        />
      </Link>

      {/* Navegación Estructurada */}
      <div style={menuContainerStyle}>
        <div style={itemStyle}><NavLink to="/" style={getLinkStyle}>Home</NavLink></div>

        {/* Tools Dropdown */}
        <div style={itemStyle} onMouseEnter={() => handleMouseEnter('tools')} onMouseLeave={handleMouseLeave}>
          <span style={{ cursor: 'default', padding: '0 15px', color: '#a0aab5', fontSize: '14px' }}>Tools ▾</span>
          {dropdown === 'tools' && (
            <div style={dropdownStyle}>
              {/* Aquí irán las herramientas activas en el futuro */}
              <Link to="/tools/advanced-search" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Advanced Search</Link>
            </div>
          )}
        </div>

        {/* Legacy / Archive Dropdown */}
        <div style={itemStyle} onMouseEnter={() => handleMouseEnter('legacy')} onMouseLeave={handleMouseLeave}>
          <span style={{ cursor: 'default', padding: '0 15px', color: '#a0aab5', fontSize: '14px' }}>Legacy ▾</span>
          {dropdown === 'legacy' && (
            <div style={dropdownStyle}>
              <Link to="/tools/leat11" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>LEAT11 Draft</Link>
            </div>
          )}
        </div>

        {/* Build Orders (Direct Link) */}
        <div style={itemStyle}><NavLink to="/academy/build-orders" style={getLinkStyle}>Build Orders</NavLink></div>

        {/* Tournaments Dropdown */}
        <div style={itemStyle} onMouseEnter={() => handleMouseEnter('tournaments')} onMouseLeave={handleMouseLeave}>
          <span style={{ cursor: 'default', padding: '0 15px', color: '#a0aab5', fontSize: '14px' }}>Tournaments ▾</span>
          {dropdown === 'tournaments' && (
            <div style={dropdownStyle}>
              <Link to="/tournaments/current" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Current Event</Link>
              <Link to="/tournaments/past-events" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Past Events</Link>
              <Link to="/tournaments/hall-of-fame" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Hall of Fame</Link>
            </div>
          )}
        </div>

        {/* Clan Dropdown */}
        <div style={itemStyle} onMouseEnter={() => handleMouseEnter('clan')} onMouseLeave={handleMouseLeave}>
          <span style={{ cursor: 'default', padding: '0 15px', color: '#a0aab5', fontSize: '14px' }}>Clan ▾</span>
          {dropdown === 'clan' && (
            <div style={dropdownStyle}>
              <Link to="/clan/roster" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Roster</Link>
              <Link to="/clan/about" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>About</Link>
            </div>
          )}
        </div>
      </div>

      {/* Sección de Autenticación (Usuario / Login) */}
      {/* Sección de Autenticación (Usuario / Login) */}
      <div style={authContainerStyle}>
        {!user ? (
          <button 
            onClick={handleLogin} 
            style={loginBtnStyle}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4752C4'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#5865F2'}
          >
            Login
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold' }}>
                {user.user_metadata.full_name || user.user_metadata.name || 'Guerrero'}
              </span>
              <button 
                onClick={handleLogout} 
                style={logoutBtnStyle}
                onMouseEnter={e => e.currentTarget.style.color = '#ff6666'}
                onMouseLeave={e => e.currentTarget.style.color = '#a0aab5'}
              >
                Log Out
              </button>
            </div>
            {user.user_metadata.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #2a2d36' }} 
              />
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;