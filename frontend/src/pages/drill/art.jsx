// Schematic map art for the build order simulator (flat SVG sprites, no external assets)

export const Pine = ({ shade = 0 }) => {
  const g = [['#244d22', '#2f6a2c', '#3d8236'], ['#1f4520', '#2a5f28', '#367531'], ['#2a5524', '#357230', '#46903c']][shade % 3];
  return (
    <svg viewBox="0 0 40 52" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="21" cy="49" rx="13" ry="3" fill="rgba(0,0,0,0.28)" />
      <rect x="18" y="38" width="4" height="11" rx="1" fill="#5b3a1e" />
      <polygon points="20,2 33,20 7,20" fill={g[2]} />
      <polygon points="20,9 36,31 4,31" fill={g[1]} />
      <polygon points="20,18 39,42 1,42" fill={g[0]} />
      <polygon points="20,18 39,42 20,42" fill="rgba(0,0,0,0.12)" />
    </svg>
  );
};

export const Oak = ({ shade = 0 }) => {
  const g = [['#2c5a26', '#3b7432', '#4d8c3f'], ['#27522a', '#356a33', '#467f40']][shade % 2];
  return (
    <svg viewBox="0 0 44 50" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="22" cy="47" rx="15" ry="3" fill="rgba(0,0,0,0.28)" />
      <rect x="19.5" y="30" width="5" height="17" rx="1.5" fill="#5b3a1e" />
      <circle cx="14" cy="24" r="11" fill={g[0]} />
      <circle cx="30" cy="24" r="11" fill={g[0]} />
      <circle cx="22" cy="15" r="13" fill={g[1]} />
      <circle cx="18" cy="11" r="6" fill={g[2]} />
    </svg>
  );
};

export const Sheep = () => (
  <svg viewBox="0 0 32 24" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="16" cy="22" rx="11" ry="2" fill="rgba(0,0,0,0.25)" />
    <g stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="16" x2="10" y2="21" /><line x1="20" y1="16" x2="20" y2="21" /></g>
    <g fill="#f3f0e6">
      <circle cx="10" cy="11" r="5" /><circle cx="16" cy="9" r="5.5" /><circle cx="21" cy="11" r="5" /><circle cx="15" cy="14" r="5" />
    </g>
    <ellipse cx="26" cy="10" rx="3.6" ry="2.8" fill="#3a3a3a" />
    <circle cx="27.3" cy="9.3" r="0.7" fill="#fff" />
  </svg>
);

export const Boar = () => (
  <svg viewBox="0 0 36 24" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="17" cy="22" rx="13" ry="2" fill="rgba(0,0,0,0.25)" />
    <g stroke="#2b1c13" strokeWidth="2.4" strokeLinecap="round"><line x1="10" y1="15" x2="10" y2="21" /><line x1="22" y1="15" x2="22" y2="21" /></g>
    <ellipse cx="16" cy="12" rx="11" ry="6.5" fill="#4a3022" />
    <path d="M6 7 L9 4 L11 7 L14 3.5 L16 7 L19 4 L21 7" fill="#3a241a" />
    <ellipse cx="28" cy="13" rx="5.5" ry="4.2" fill="#55382a" />
    <ellipse cx="32.5" cy="14" rx="1.8" ry="1.6" fill="#7a5243" />
    <path d="M30 16 Q33 17 33.5 13.5" stroke="#f3eadb" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <circle cx="28" cy="11" r="0.8" fill="#000" />
  </svg>
);

export const Deer = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="15" cy="30" rx="10" ry="1.8" fill="rgba(0,0,0,0.25)" />
    <g stroke="#6b4423" strokeWidth="1.8" strokeLinecap="round"><line x1="9" y1="20" x2="8" y2="29" /><line x1="12" y1="20" x2="12" y2="29" /><line x1="18" y1="20" x2="19" y2="29" /><line x1="21" y1="20" x2="22" y2="29" /></g>
    <ellipse cx="15" cy="18" rx="9" ry="4.6" fill="#a5672f" />
    <path d="M21 17 L24 9 L27 10 L24.5 18 Z" fill="#a5672f" />
    <ellipse cx="26.5" cy="9" rx="3.3" ry="2.2" fill="#b0743a" />
    <g stroke="#e8d7b5" strokeWidth="1.1" strokeLinecap="round" fill="none"><path d="M25 7 L23 2 M24 4 L22 3" /><path d="M27 7 L28 2 M27.6 4 L30 3" /></g>
    <ellipse cx="13" cy="16.5" rx="4" ry="1.4" fill="#c58a4f" opacity="0.6" />
  </svg>
);

export const BerryBush = () => (
  <svg viewBox="0 0 30 26" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="15" cy="24" rx="12" ry="2" fill="rgba(0,0,0,0.25)" />
    <circle cx="9" cy="15" r="7" fill="#2f6b2a" /><circle cx="21" cy="15" r="7" fill="#2f6b2a" /><circle cx="15" cy="10" r="8" fill="#3b7f33" />
    <g fill="#c2185b"><circle cx="9" cy="13" r="1.6" /><circle cx="14" cy="8" r="1.6" /><circle cx="19" cy="12" r="1.6" /><circle cx="22" cy="17" r="1.6" /><circle cx="12" cy="17" r="1.6" /><circle cx="17" cy="16" r="1.6" /></g>
    <g fill="#ff6f9c"><circle cx="8.6" cy="12.6" r="0.5" /><circle cx="13.6" cy="7.6" r="0.5" /><circle cx="18.6" cy="11.6" r="0.5" /></g>
  </svg>
);

export const GoldMine = () => (
  <svg viewBox="0 0 40 28" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="20" cy="25" rx="17" ry="2.5" fill="rgba(0,0,0,0.3)" />
    <polygon points="3,24 8,12 16,9 22,14 20,24" fill="#6f6a5e" />
    <polygon points="16,24 20,8 30,6 37,16 36,24" fill="#7f796b" />
    <g fill="#f5c542" stroke="#b8860b" strokeWidth="0.6">
      <polygon points="9,17 12,14 15,17 12,20" /><polygon points="23,13 27,10 30,14 26,17" /><polygon points="29,20 32,17 35,20 32,23" /><polygon points="17,19 19,17 21,20 18,22" />
    </g>
    <g fill="#fff6c8"><circle cx="11.5" cy="15.5" r="0.7" /><circle cx="26.5" cy="11.5" r="0.7" /></g>
  </svg>
);

export const StoneMine = () => (
  <svg viewBox="0 0 40 28" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="20" cy="25" rx="17" ry="2.5" fill="rgba(0,0,0,0.3)" />
    <polygon points="2,24 7,13 15,11 20,17 18,24" fill="#8b9096" />
    <polygon points="14,24 19,9 28,7 36,15 37,24" fill="#a3a8ae" />
    <polygon points="22,24 25,17 31,16 34,24" fill="#7b8087" />
    <g stroke="#5f646a" strokeWidth="0.7" fill="none"><path d="M9 15 L12 20" /><path d="M24 11 L27 17" /><path d="M30 10 L33 15" /></g>
  </svg>
);

export const Fish = () => (
  <svg viewBox="0 0 28 14" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="12" cy="7" rx="9" ry="4.2" fill="#d8e6f0" />
    <polygon points="20,7 27,2 27,12" fill="#b9cfdf" />
    <circle cx="7" cy="6" r="0.9" fill="#1f2d3a" />
  </svg>
);

export const Chicken = () => (
  <svg viewBox="0 0 24 22" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <ellipse cx="12" cy="20.5" rx="7" ry="1.5" fill="rgba(0,0,0,0.25)" />
    <g stroke="#e0a030" strokeWidth="1.3"><line x1="10" y1="16" x2="10" y2="20" /><line x1="14" y1="16" x2="14" y2="20" /></g>
    <ellipse cx="12" cy="12" rx="7" ry="5" fill="#f7f3ea" />
    <circle cx="17.5" cy="7.5" r="3.2" fill="#f7f3ea" />
    <polygon points="20.5,7.5 23,8.5 20.5,9.3" fill="#e0a030" />
    <path d="M16.5 4.4 Q17.5 2.4 18.6 4.4" fill="#d32f2f" />
  </svg>
);

export const FarmPlot = ({ active }) => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
    <rect x="1" y="2" width="38" height="37" rx="3" fill="rgba(0,0,0,0.25)" />
    <rect x="0.5" y="0.5" width="38" height="37" rx="3" fill={active ? '#7a5a30' : '#6d5a3a'} stroke={active ? '#4e3818' : '#8a7a5a'} strokeWidth="1" strokeDasharray={active ? 'none' : '3 2'} />
    {[5, 12, 19, 26, 33].map(y => (
      active ? (
        <g key={y}>
          <rect x="3" y={y - 2.6} width="33" height="5.2" rx="2.4" fill="#d8b23f" />
          <rect x="3" y={y + 0.6} width="33" height="2" rx="1" fill="#b48a22" />
          {[6, 11, 16, 21, 26, 31].map(x => <circle key={x} cx={x} cy={y - 1} r="1" fill="#f5dc7a" />)}
        </g>
      ) : <line key={y} x1="4" y1={y} x2="35" y2={y} stroke="#5a4628" strokeWidth="1.4" />
    ))}
  </svg>
);

