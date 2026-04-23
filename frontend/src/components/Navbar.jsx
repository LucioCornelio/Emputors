import { NavLink, Link } from 'react-router-dom';
import { useState } from 'react';

const Navbar = () => {
  const [dropdown, setDropdown] = useState(null);

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

  const handleMouseEnter = (menu) => setDropdown(menu);
  const handleMouseLeave = () => setDropdown(null);

  const handleLinkHover = (e, isEnter) => {
    e.target.style.color = isEnter ? '#ffd700' : '#e0e0e0';
    e.target.style.backgroundColor = isEnter ? '#2a2d36' : 'transparent';
  };

  return (
    <nav style={navStyle}>
      {/* Logo y Nombre */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
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
              <Link to="/tools/leat11" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>LEAT11 Draft</Link>
              <Link to="/tools/advanced-search" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Advanced Search</Link>
            </div>
          )}
        </div>

        {/* Build Orders (Direct Link) */}
        <div style={itemStyle}><NavLink to="/academy/build-orders" style={getLinkStyle}>Build Orders</NavLink></div>

        {/* Esports Dropdown */}
        <div style={itemStyle} onMouseEnter={() => handleMouseEnter('esports')} onMouseLeave={handleMouseLeave}>
          <span style={{ cursor: 'default', padding: '0 15px', color: '#a0aab5', fontSize: '14px' }}>Esports ▾</span>
          {dropdown === 'esports' && (
            <div style={dropdownStyle}>
              <Link to="/esports/tournaments" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Tournaments</Link>
              <Link to="/esports/hall-of-fame" style={dropLinkStyle} onMouseEnter={e => handleLinkHover(e, true)} onMouseLeave={e => handleLinkHover(e, false)}>Hall of Fame</Link>
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
    </nav>
  );
};

export default Navbar;