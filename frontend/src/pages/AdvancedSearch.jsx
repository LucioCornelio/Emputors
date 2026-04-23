import { useState, useEffect, useMemo } from 'react'

function AdvancedSearch() {
  const [techtree, setTechtree] = useState(null)
  const [filters, setFilters] = useState([])
  const [pendingType, setPendingType] = useState('unit')
  const [pendingId, setPendingId] = useState('')
  const [pendingNot, setPendingNot] = useState(false)
  const [pendingOperator, setPendingOperator] = useState('AND')

  useEffect(() => {
    fetch('/techtree.json')
      .then(res => res.json())
      .then(data => setTechtree(data))
      .catch(() => console.error('Could not load techtree.json'))
  }, [])

  // Build sorted option lists
  const unitOptions = useMemo(() => {
    if (!techtree) return []
    return Object.entries(techtree.units).map(([id, name]) => ({ id: parseInt(id), name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [techtree])

  const techOptions = useMemo(() => {
    if (!techtree) return []
    return Object.entries(techtree.techs).map(([id, name]) => ({ id: parseInt(id), name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [techtree])

  // Compute results
  const results = useMemo(() => {
    if (!techtree || filters.length === 0) return null

    const civNames = Object.keys(techtree.civs)
    
    return civNames.filter(civ => {
      const civData = techtree.civs[civ]
      let result = null

      for (let i = 0; i < filters.length; i++) {
        const f = filters[i]
        const list = f.type === 'unit' ? civData.units : civData.techs
        let match = list.includes(f.id)
        if (f.not) match = !match

        if (i === 0) {
          result = match
        } else {
          if (f.operator === 'AND') result = result && match
          else result = result || match
        }
      }
      return result
    }).sort()
  }, [techtree, filters])

  const addFilter = () => {
    if (!pendingId) return
    const id = parseInt(pendingId)
    const type = pendingType
    const name = type === 'unit' ? techtree.units[pendingId] : techtree.techs[pendingId]
    if (!name) return

    setFilters(prev => [...prev, {
      type,
      id,
      name,
      not: pendingNot,
      operator: prev.length === 0 ? null : pendingOperator
    }])
    setPendingId('')
    setPendingNot(false)
  }

  const removeFilter = (index) => {
    setFilters(prev => {
      const newFilters = prev.filter((_, i) => i !== index)
      if (newFilters.length > 0 && newFilters[0].operator !== null) {
        newFilters[0] = { ...newFilters[0], operator: null }
      }
      return newFilters
    })
  }

  const clearAll = () => setFilters([])

  if (!techtree) {
    return <div style={{ padding: '3rem', color: '#888', textAlign: 'center' }}>Loading tech tree data...</div>
  }

  return (
    <div style={{ backgroundColor: '#161920', color: '#e0e0e0', minHeight: '100vh', padding: '0', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 2rem' }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#ffd700', fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Advanced Search</h1>
          <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Find civilizations by unit and technology availability</p>
        </div>

        {/* FILTER BUILDER */}
        <div style={{ backgroundColor: '#1a1c23', borderRadius: '6px', border: '1px solid #333', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ color: '#ffd700', fontSize: '11px', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #444', paddingBottom: '6px' }}>Build Your Query</h3>

          {/* Active filters */}
          {filters.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              {filters.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#161920', padding: '6px 10px', borderRadius: '4px', border: '1px solid #2a2d36' }}>
                  {f.operator && (
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: f.operator === 'AND' ? '#4caf50' : '#66b2ff', backgroundColor: f.operator === 'AND' ? '#4caf5022' : '#66b2ff22', padding: '2px 6px', borderRadius: '3px', minWidth: '30px', textAlign: 'center' }}>{f.operator}</span>
                  )}
                  {!f.operator && <span style={{ minWidth: '30px' }}></span>}
                  <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', minWidth: '35px' }}>{f.type}</span>
                  {f.not && <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#ff4444', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px' }}>NOT</span>}
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: f.type === 'unit' ? '#66b2ff' : '#4caf50' }}>{f.name}</span>
                  <span style={{ flex: 1 }}></span>
                  <span onClick={() => removeFilter(i)} style={{ color: '#ff4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '0 4px' }}>✗</span>
                </div>
              ))}
            </div>
          )}

          {/* New filter row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Operator (only if not first filter) */}
            {filters.length > 0 && (
              <select value={pendingOperator} onChange={e => setPendingOperator(e.target.value)} style={{ backgroundColor: '#1e212b', color: pendingOperator === 'AND' ? '#4caf50' : '#66b2ff', border: '1px solid #444', padding: '6px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', width: '65px' }}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}

            {/* NOT toggle */}
            <button onClick={() => setPendingNot(!pendingNot)} style={{ backgroundColor: pendingNot ? '#ff444433' : '#1e212b', color: pendingNot ? '#ff4444' : '#555', border: `1px solid ${pendingNot ? '#ff4444' : '#444'}`, padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>NOT</button>

            {/* Type selector */}
            <select value={pendingType} onChange={e => { setPendingType(e.target.value); setPendingId('') }} style={{ backgroundColor: '#1e212b', color: pendingType === 'unit' ? '#66b2ff' : '#4caf50', border: `1px solid ${pendingType === 'unit' ? '#66b2ff55' : '#4caf5055'}`, padding: '6px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', width: '80px' }}>
              <option value="unit">Unit</option>
              <option value="tech">Tech</option>
            </select>

            {/* Item selector */}
            <select value={pendingId} onChange={e => setPendingId(e.target.value)} style={{ backgroundColor: '#1e212b', color: '#e0e0e0', border: '1px solid #444', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', outline: 'none', cursor: 'pointer', flex: 1, minWidth: '200px' }}>
              <option value="">— Select {pendingType === 'unit' ? 'Unit' : 'Technology'} —</option>
              {(pendingType === 'unit' ? unitOptions : techOptions).map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>

            {/* Add button */}
            <button onClick={addFilter} disabled={!pendingId} style={{ backgroundColor: pendingId ? '#ffd700' : '#333', color: pendingId ? '#161920' : '#555', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: pendingId ? 'pointer' : 'not-allowed', letterSpacing: '1px', transition: 'all 0.2s' }}>+ ADD</button>

            {/* Clear all */}
            {filters.length > 0 && (
              <button onClick={clearAll} style={{ backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff444444', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
            )}
          </div>
        </div>

        {/* RESULTS */}
        {results !== null && (
          <div style={{ backgroundColor: '#1a1c23', borderRadius: '6px', border: '1px solid #333', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#ffd700', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Results</h3>
              <span style={{ fontSize: '12px', color: results.length > 0 ? '#4caf50' : '#ff4444', fontWeight: 'bold' }}>
                {results.length} / {Object.keys(techtree.civs).length} civilizations
              </span>
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#555', fontSize: '12px', fontStyle: 'italic' }}>No civilizations match all criteria.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {results.map(civ => (
                  <div key={civ} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#161920', padding: '8px 10px', borderRadius: '4px', border: '1px solid #2a2d36', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#ffd70055'} onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2d36'}>
                    <img src={`/civs/${civ.toLowerCase()}.png`} alt={civ} style={{ width: '28px', height: '28px', borderRadius: '3px', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e0e0e0' }}>{civ}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Excluded civs */}
            {results.length > 0 && results.length < Object.keys(techtree.civs).length && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #2a2d36' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>Excluded</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.keys(techtree.civs).filter(c => !results.includes(c)).sort().map(civ => (
                    <span key={civ} style={{ fontSize: '10px', color: '#555', padding: '2px 6px', backgroundColor: '#1e212b', borderRadius: '3px' }}>{civ}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EMPTY STATE */}
        {results === null && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚔️</div>
            <div style={{ fontSize: '13px', marginBottom: '6px' }}>Add filters above to search civilizations</div>
            <div style={{ fontSize: '11px', color: '#444' }}>Example: Unit → Paladin AND Tech → Bloodlines AND Tech → Husbandry</div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AdvancedSearch
