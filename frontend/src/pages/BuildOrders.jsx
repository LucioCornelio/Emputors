import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import builds from '../data/builds.json';

const C = {
  card: '#1a1c23', border: '#2a2d36', gold: '#ffd700', cyan: '#00c8c8',
  textMain: '#e0e0e0', textDim: '#a0aab5', textMute: '#888',
};

const diffColor = (d) => d === 'Beginner' ? '#4caf50' : d === 'Intermediate' ? '#ffd700' : '#ff4444';
const unique = (key) => [...new Set(builds.map((b) => b[key]))].sort();

const BuildOrders = () => {
  const [civFilter, setCivFilter] = useState('All');
  const [mapFilter, setMapFilter] = useState('All');
  const [stratFilter, setStratFilter] = useState('All');
  const [diffFilter, setDiffFilter] = useState('All');
  const [search, setSearch] = useState('');

  const civs = unique('civ');
  const maps = unique('map');
  const strats = unique('strategy');
  const diffs = unique('difficulty');

  const filtered = useMemo(() => {
    return builds.filter((b) => {
      if (civFilter !== 'All' && b.civ !== civFilter) return false;
      if (mapFilter !== 'All' && b.map !== mapFilter) return false;
      if (stratFilter !== 'All' && b.strategy !== stratFilter) return false;
      if (diffFilter !== 'All' && b.difficulty !== diffFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${b.title} ${b.civ} ${b.map} ${b.strategy} ${b.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [civFilter, mapFilter, stratFilter, diffFilter, search]);

  const sel = {
    backgroundColor: C.card, color: C.textMain, border: `1px solid ${C.border}`,
    borderRadius: '6px', padding: '7px 10px', fontSize: '12px', outline: 'none', cursor: 'pointer', minWidth: '120px',
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '2rem 1.2rem 3.5rem', fontFamily: 'Segoe UI, sans-serif' }}>
      <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '3px' }}>📚 Build Orders</h1>
      <p style={{ color: C.textDim, fontSize: '13px', marginBottom: '22px' }}>
        Curated build order library for Age of Emputors clan members.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '22px', alignItems: 'center' }}>
        <select value={civFilter} onChange={(e) => setCivFilter(e.target.value)} style={sel}>
          <option value="All">All Civs</option>
          {civs.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={mapFilter} onChange={(e) => setMapFilter(e.target.value)} style={sel}>
          <option value="All">All Maps</option>
          {maps.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={stratFilter} onChange={(e) => setStratFilter(e.target.value)} style={sel}>
          <option value="All">All Strategies</option>
          {strats.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} style={sel}>
          <option value="All">All Levels</option>
          {diffs.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="text" placeholder="Search builds..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...sel, minWidth: '180px', flex: '1 1 180px' }} />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ color: C.textMute, fontSize: '14px', textAlign: 'center', padding: '3rem 1rem' }}>
          No builds match your filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {filtered.map((b) => (
            <Link key={b.id} to={`/academy/build-orders/${b.id}`} style={{
              backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '8px',
              padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px',
              transition: 'border-color 0.2s, transform 0.15s', cursor: 'pointer', textDecoration: 'none',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{b.title}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${C.cyan}1a`, border: `1px solid ${C.cyan}33`, color: C.cyan }}>{b.civ}</span>
                <span style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: '#2a2d36', border: '1px solid #444', color: C.textMain }}>{b.map}</span>
                <span style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${C.gold}1a`, border: `1px solid ${C.gold}33`, color: C.gold }}>{b.strategy}</span>
                <span style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${diffColor(b.difficulty)}1a`, border: `1px solid ${diffColor(b.difficulty)}33`, color: diffColor(b.difficulty) }}>{b.difficulty}</span>
                <span style={{ color: C.textMute, fontSize: '11px' }}>{b.popCount} pop</span>
              </div>
              <div style={{ color: C.textDim, fontSize: '12px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {b.description}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {b.tags.map((t, i) => (
                  <span key={i} style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '600', backgroundColor: '#2a2d3688', border: `1px solid ${C.border}`, color: C.textDim }}>{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuildOrders;