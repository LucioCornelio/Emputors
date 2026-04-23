import { useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import builds from '../data/builds.json';

const C = {
  card: '#1a1c23', border: '#2a2d36', gold: '#ffd700', cyan: '#00c8c8',
  textMain: '#e0e0e0', textDim: '#a0aab5', textMute: '#888',
};

const diffColor = (d) => d === 'Beginner' ? '#4caf50' : d === 'Intermediate' ? '#fb923c' : '#ff4444';
const unique = (key) => [...new Set(builds.map((b) => b[key]))].sort();

const STRAT_ICONS = {
  'Men-at-Arms': ['/units/Manatarms_aoe2DE.png'],
  'Archers into Scouts': ['/units/Archer_aoe2DE.png', '➔', '/units/Scoutcavalry_aoe2DE.png'],
  'Archers': ['/units/Archer_aoe2DE.png'],
  'Scouts': ['/units/Scoutcavalry_aoe2DE.png']
};

const renderPremiumStratIcons = (strat) => {
  const icons = STRAT_ICONS[strat];
  if (!icons) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {icons.map((ic, i) => 
        ic === '➔' ? (
          <span key={i} style={{ fontSize: '10px', color: C.gold, margin: '0 2px' }}>➔</span> 
        ) : (
          <div key={i} style={{ padding: '2px', background: '#1e212b', borderRadius: '6px', border: `1px solid ${C.gold}`, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            <img src={ic} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', display: 'block' }} />
          </div>
        )
      )}
    </div>
  );
};

const BuildOrders = () => {
  useEffect(() => {
    document.title = 'Build Orders | Emputors';
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const civFilter = searchParams.get('civ') || 'All';
  const mapFilter = searchParams.get('map') || 'All';
  const stratFilter = searchParams.get('strat') || 'All';
  const diffFilter = searchParams.get('diff') || 'All';
  const search = searchParams.get('search') || '';

  const civs = unique('civ');
  const maps = unique('map');
  const strats = unique('strategy');
  const diffs = unique('difficulty');

  const setFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'All' || value === '') newParams.delete(key);
    else newParams.set(key, value);
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasFilters = civFilter !== 'All' || mapFilter !== 'All' || stratFilter !== 'All' || diffFilter !== 'All' || search !== '';

  const filtered = useMemo(() => {
    return builds.filter((b) => {
      if (civFilter !== 'All' && b.civ !== civFilter) return false;
      if (mapFilter !== 'All' && b.map !== mapFilter) return false;
      if (stratFilter !== 'All' && b.strategy !== stratFilter) return false;
      if (diffFilter !== 'All' && b.difficulty !== diffFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${b.title} ${b.civ} ${b.map} ${b.strategy}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [civFilter, mapFilter, stratFilter, diffFilter, search]);

  const sel = {
    backgroundColor: '#1e212b', color: C.textMain, border: `1px solid ${C.border}`,
    borderRadius: '4px', padding: '6px 8px', fontSize: '11px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', minWidth: '120px',
  };

  const handleTagClick = (e, key, val) => {
    e.preventDefault();
    setFilter(key, val);
  };

  const hoverProps = {
    onMouseEnter: (e) => e.currentTarget.style.filter = 'brightness(1.4) drop-shadow(0 0 2px rgba(255,255,255,0.2))',
    onMouseLeave: (e) => e.currentTarget.style.filter = 'none',
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '1.5rem 2rem 3.5rem', fontFamily: 'Segoe UI, sans-serif' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#ffd700', fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Build Orders</h1>
        <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Curated build order library for Age of Emputors clan members</p>
      </div>

      <div style={{ backgroundColor: '#1a1c23', borderRadius: '6px', border: '1px solid #333', padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <select value={civFilter} onChange={(e) => setFilter('civ', e.target.value)} style={sel}>
          <option value="All">All Civs</option>
          {civs.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={mapFilter} onChange={(e) => setFilter('map', e.target.value)} style={sel}>
          <option value="All">All Maps</option>
          {maps.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={stratFilter} onChange={(e) => setFilter('strat', e.target.value)} style={sel}>
          <option value="All">All Strategies</option>
          {strats.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={diffFilter} onChange={(e) => setFilter('diff', e.target.value)} style={sel}>
          <option value="All">All Levels</option>
          {diffs.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="text" placeholder="Search builds..." value={search} onChange={(e) => setFilter('search', e.target.value)}
          style={{ ...sel, minWidth: '180px', flex: '1 1 180px', backgroundColor: 'transparent' }} />
        
        {hasFilters && (
          <button onClick={clearAllFilters} style={{ backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff444444', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s', marginLeft: 'auto' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ff444422'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            CLEAR
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: C.textMute, fontSize: '14px', textAlign: 'center', padding: '3rem 1rem' }}>
          No builds match your filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {filtered.map((b) => (
            <Link key={b.id} to={`/academy/build-orders/${b.id}`} style={{
              position: 'relative', overflow: 'hidden',
              backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '8px',
              display: 'flex', flexDirection: 'column', height: '100%',
              transition: 'border-color 0.2s, transform 0.15s', cursor: 'pointer', textDecoration: 'none',
              textAlign: 'left'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Banner Fondo Mapa */}
              <div style={{
                height: '70px',
                backgroundImage: `url('/maps/${b.map}.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0
              }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(26,28,35,0.15) 0%, rgba(26,28,35,1) 100%)' }} />
              </div>

              {/* Contenido Real */}
              <div style={{ position: 'relative', zIndex: 1, padding: '16px 18px', paddingTop: '36px', display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <div style={{ padding: '2px', background: '#1e212b', borderRadius: '6px', border: `1px solid ${C.cyan}`, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    <img src={`/civs/${b.civ.toLowerCase()}.png`} alt="" style={{ width: '24px', height: '24px', display: 'block' }} onError={(e) => e.target.style.display='none'} />
                  </div>
                  {renderPremiumStratIcons(b.strategy)}
                  <div style={{ marginLeft: 'auto', backgroundColor: '#2a2d36', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${C.borderLt}`, color: C.textMain, fontSize: '11px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    {b.popCount} Vils
                  </div>
                </div>

                <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{b.title}</div>
                
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span onClick={(e) => handleTagClick(e, 'civ', b.civ)} {...hoverProps} style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${C.cyan}1a`, border: `1px solid ${C.cyan}33`, color: C.cyan, cursor: 'pointer', transition: 'filter 0.2s' }}>{b.civ}</span>
                  <span onClick={(e) => handleTagClick(e, 'map', b.map)} {...hoverProps} style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: '#2a2d36', border: '1px solid #444', color: C.textMain, cursor: 'pointer', transition: 'filter 0.2s' }}>{b.map}</span>
                  <span onClick={(e) => handleTagClick(e, 'strat', b.strategy)} {...hoverProps} style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${C.gold}1a`, border: `1px solid ${C.gold}33`, color: C.gold, cursor: 'pointer', transition: 'filter 0.2s' }}>{b.strategy}</span>
                  <span onClick={(e) => handleTagClick(e, 'diff', b.difficulty)} {...hoverProps} style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${diffColor(b.difficulty)}1a`, border: `1px solid ${diffColor(b.difficulty)}33`, color: diffColor(b.difficulty), cursor: 'pointer', transition: 'filter 0.2s' }}>{b.difficulty}</span>
                </div>
                
                <div style={{ color: C.textDim, fontSize: '12px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left', marginTop: 'auto' }}>
                  {b.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuildOrders;