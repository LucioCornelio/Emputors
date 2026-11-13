import { useMemo } from 'react';
import { analyzeMapDrafts, mapImage } from './mapDrafts';

const TONE = { red: '#ff6666', green: '#4caf50', orange: '#ff9800', grey: '#888' };

export function MapThumb({ map, struck = false, note = '', size = 34 }) {
  return (
    <span title={map} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '8px', whiteSpace: 'nowrap' }}>
      <img src={mapImage(map)} alt={map} style={{ width: `${size}px`, height: `${Math.round(size * 0.65)}px`, objectFit: 'cover', borderRadius: '3px', border: '1px solid #444', opacity: struck ? 0.35 : 1 }}
        onError={(e) => { e.target.src = '/maps/Any.png'; }} />
      <span style={{ fontSize: '11px', color: struck ? '#888' : '#ddd', textDecoration: struck ? 'line-through' : 'none' }}>{map}</span>
      {note && <span style={{ fontSize: '9px', color: '#00c8c8', fontWeight: 'bold', textTransform: 'uppercase' }}>{note}</span>}
    </span>
  );
}

function StatRow({ k, v, title }) {
  return (
    <div title={title} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: 1.4, padding: '0 6px', color: '#aaa' }}>
      <span>{k}</span><b style={{ color: v ? '#fff' : '#555' }}>{v || '-'}</b>
    </div>
  );
}

function MapDraftsView({ C, drafts, mapPool, onDelete }) {
  const a = useMemo(() => analyzeMapDrafts(drafts, mapPool), [drafts, mapPool]);
  const label = { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' };
  const th = { padding: '4px', color: '#888', textAlign: 'left', fontWeight: 'bold' };
  const td = { padding: '6px 4px', borderTop: '1px solid #2a2d36', verticalAlign: 'middle' };

  if (a.n === 0) {
    return <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No map drafts recorded. Load them in Register like any other draft.</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
      {a.reads.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {a.reads.map(r => {
            const i = r.text.indexOf(r.strong);
            return (
              <div key={r.text} style={{ fontSize: '12px', backgroundColor: '#1e212b', borderLeft: `3px solid ${C.cyan}`, padding: '6px 10px', borderRadius: '3px' }}>
                {i >= 0 ? <>{r.text.slice(0, i)}<b style={{ color: '#fff' }}>{r.strong}</b>{r.text.slice(i + r.strong.length)}</> : r.text}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
        {a.maps.map(s => (
          <div key={s.map} style={{ backgroundColor: '#1e212b', border: '1px solid #444', borderRadius: '5px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <img src={mapImage(s.map)} alt={s.map} style={{ width: '100%', height: '78px', objectFit: 'cover' }} onError={(e) => { e.target.src = '/maps/Any.png'; }} />
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', padding: '5px 6px 2px' }}>{s.map}</div>
            <StatRow k="Picked" v={s.pick} title={s.firstPick ? `First pick in ${s.firstPick}` : undefined} />
            <StatRow k="Banned" v={s.ban} />
            <StatRow k="Sniped (by them)" v={s.snipe} title="They sniped it from the rival's picks" />
            <StatRow k="Lost to snipe" v={s.lost} title="They picked it and the rival sniped it" />
            <StatRow k="Starting map" v={s.start} title="The map left over after picks, bans and snipes: the match starts on it" />
            <StatRow k="Final maps" v={s.final} title="Maps of the match after the draft" />
            <div style={{ fontSize: '9px', fontWeight: 'bold', borderRadius: '2px', padding: '1px 4px', margin: '4px 6px 6px', textAlign: 'center', color: TONE[s.tag.tone], border: `1px solid ${TONE[s.tag.tone]}` }}>{s.tag.text}</div>
          </div>
        ))}
      </div>

      <span style={{ ...label, color: C.cyan }}>Draft by draft</span>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}>
          <thead><tr><th style={th}>Draft</th><th style={th}>Side</th><th style={th}>Their picks</th><th style={th}>Ban</th><th style={th}>Snipe</th><th style={th}>Rival picks</th><th style={th}>Final maps</th><th style={th}></th></tr></thead>
          <tbody>
            {a.drafts.map(r => (
              <tr key={r.id || r.draftId}>
                <td style={{ ...td, color: '#fff', fontWeight: 'bold' }}><a href={`https://aoe2cm.net/draft/${r.draftId}`} target="_blank" rel="noreferrer" style={{ color: '#fff' }}>{r.draftId}</a></td>
                <td style={{ ...td, color: '#aaa' }}>{r.side === 'HOST' ? 'Host' : 'Guest'}{r.rivalName ? ` (${r.rivalName})` : ''}<br /><span style={{ color: '#666' }}>vs {r.oppName || 'rival'}</span></td>
                <td style={td}>{r.picks.map((m, i) => <div key={`${m}-${i}`}><MapThumb map={m} struck={r.lost.includes(m)} /></div>)}</td>
                <td style={td}>{r.bans.map(m => <div key={m}><MapThumb map={m} /></div>)}</td>
                <td style={td}>{r.snipes.map(m => <div key={m}><MapThumb map={m} /></div>)}</td>
                <td style={td}>{r.oppPicks.map((m, i) => <div key={`${m}-${i}`}><MapThumb map={m} struck={r.oppLost.includes(m)} /></div>)}</td>
                <td style={td}>{r.finalMaps.map((m, i) => <div key={`${m}-${i}`}><MapThumb map={m} note={r.starting.includes(m) ? 'start' : ''} /></div>)}</td>
                <td style={td}>{onDelete && <button onClick={() => onDelete(r)} title="Remove this draft" style={{ background: 'transparent', color: C.red, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>×</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span style={{ fontSize: '10px', color: '#666' }}>Crossed out = sniped. Starting map = the map left over after picks, bans and snipes; the match starts on it.</span>
    </div>
  );
}

export default MapDraftsView;
