import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import builds from '../data/builds.json';

/* ════════════════════════════════════════════════
   PALETTE
   ════════════════════════════════════════════════ */
const C = {
  bg: '#161920', card: '#1a1c23', cardAlt: '#1e212b',
  border: '#2a2d36', borderMed: '#333', borderLt: '#444',
  text: '#e0e0e0', textDim: '#a0aab5', textMute: '#888',
  cyan: '#00c8c8',
  gold: '#ffd700', green: '#4caf50', red: '#ff4444', blue: '#66b2ff',
  resZero: '#334155', tipGreen: '#86efac', noteGold: '#fde68a',
};

const diffColor = (d) => d === 'Beginner' ? '#4caf50' : d === 'Intermediate' ? '#fb923c' : '#ff4444';

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {icons.map((ic, i) => 
        ic === '➔' ? (
          <span key={i} style={{ fontSize: '12px', color: C.gold, margin: '0 2px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>➔</span> 
        ) : (
          <div key={i} style={{ padding: '2px', background: 'rgba(30,33,43,0.8)', borderRadius: '6px', border: `1px solid ${C.gold}`, boxShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            <img src={ic} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', display: 'block' }} />
          </div>
        )
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════
   RESOURCE CONFIG
   ════════════════════════════════════════════════ */
const FOOD_KEYS = ['sheep','boar','underTC','hunt','chicken','berries','farm','fish'];
const FIXED_KEYS = ['wood','gold','stone','builder'];

const RES_ICON = {
  sheep: '🐑', boar: '🐗', underTC: '🛖', hunt: '🦌', chicken: '🐔', berries: '🫐',
  farm: '🌾', fish: '🐟', wood: '🪵', gold: '🪙', stone: '🪨', builder: '🔨',
};
const RES_COLOR = {
  sheep: '#ef4444', boar: '#ef4444', underTC: '#ef4444', hunt: '#ef4444',
  chicken: '#ef4444', berries: '#a855f7', farm: '#84cc16', fish: '#ef4444',
  wood: '#cd7f32', gold: '#fbbf24', stone: '#94a3b8', builder: '#94a3b8',
};

/* ════════════════════════════════════════════════
   TASK META
   ════════════════════════════════════════════════ */
const TASK_META = {
  food_sheep:          { icon: '🐑', cat: 'food' },
  food_tc:             { icon: '🛖', cat: 'food' },
  food_boar:           { icon: '🐗', cat: 'food' },
  food_berries:        { icon: '🫐', cat: 'berries' },
  food_fish:           { icon: '🐟', cat: 'food' },
  food_farm:           { icon: '🌾', cat: 'farm' },
  food_chicken:        { icon: '🐔', cat: 'chicken' },
  food_hunt:           { icon: '🦌', cat: 'food' },
  wood:                { icon: '🪵', cat: 'wood' },
  gold:                { icon: '🪙', cat: 'gold' },
  stone:               { icon: '🪨', cat: 'stone' },
  research:            { icon: '📜', cat: 'research' },
  train:               { icon: '⚔️', cat: 'train' },
  build:               { icon: '🔨', cat: 'build' },
  age_up:              { icon: '⬆️', cat: 'age_up' },
  action:              { icon: '⚔️', cat: 'action' },
  build_then_resource: { icon: '🔨', cat: 'build_res' },
  reallocate:          { icon: '🔄', cat: 'reallocate' },
};

/* ════════════════════════════════════════════════
   ICON DICTIONARY
   ════════════════════════════════════════════════ */
const ICON_MAP = {
  'DarkAgeIconDE': '/techs/DarkAgeIconDE.png',
  'FeudalAgeIconDE': '/techs/FeudalAgeIconDE.png',
  'CastleAgeIconDE': '/techs/CastleAgeIconDE.png',
  'ImperialAgeIconDE': '/techs/ImperialAgeIconDE.png',
  'LoomDE': '/techs/LoomDE.png',
  'Forging_aoe2de': '/techs/Forging_aoe2de.png',
  'ChainMailArmorDE': '/techs/ChainMailArmorDE.png',
  'ScaleMailArmorDE': '/techs/ScaleMailArmorDE.png',
  'SquiresDE': '/techs/SquiresDE.png',
  'BowSawDE': '/techs/BowSawDE.png',
  'DoubleBitAxe_aoe2DE': '/techs/DoubleBitAxe_aoe2DE.png',
  'HeavyPlowDE': '/techs/HeavyPlowDE.png',
  'HorseCollarDE': '/techs/HorseCollarDE.png',
  'FletchingDE': '/techs/FletchingDE.png',
  
  'ManAtArmsUpgDE': '/techs/ManAtArmsUpgDE.png',
  'LongSwordsmanUpgDE': '/techs/LongSwordmanUpgDE.png', 

  'MilitiaDE': '/units/MilitiaDE.png',
  'Manatarms': '/units/Manatarms_aoe2DE.png',
  'Longswordsman_aoe2DE': '/units/Longswordsman_aoe2DE.png',
  'Archer_aoe2DE': '/units/Archer_aoe2DE.png',
  'Tradecart_aoe2DE': '/units/Tradecart_aoe2DE.png',
  'Scoutcavalry_aoe2DE': '/units/Scoutcavalry_aoe2DE.png',

  'House_aoe2DE': '/buildings/House_aoe2DE.png',
  'Mill_aoe2de': '/buildings/Mill_aoe2de.png',
  'Lumber_camp_aoe2de': '/buildings/Lumber_camp_aoe2de.png',
  'Barracks_aoe2DE': '/buildings/Barracks_aoe2DE.png',
  'Blacksmith_aoe2de': '/buildings/Blacksmith_aoe2de.png',
  'Archery_range_aoe2DE': '/buildings/Archery_range_aoe2DE.png',
  'Market_aoe2DE': '/buildings/Market_aoe2DE.png',
  'Monastery_aoe2DE': '/buildings/Monastery_aoe2DE.png',
  'Siege_workshop_aoe2DE': '/buildings/Siege_workshop_aoe2DE.png',
  'Stable_aoe2de': '/buildings/Stable_aoe2de.png',
};

const iconPath = (name) => {
  if (!name) return null;
  return ICON_MAP[name] || null; 
};

/* ════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════ */
const CAT_BG = {
  food:      { bg: 'rgba(239,68,68,0.18)',   bd: 'rgba(239,68,68,0.35)' },
  berries:   { bg: 'rgba(168,85,247,0.18)',  bd: 'rgba(168,85,247,0.35)' },
  fish:      { bg: 'rgba(59,130,246,0.18)',  bd: 'rgba(59,130,246,0.35)' },
  farm:      { bg: 'rgba(132,204,22,0.18)',  bd: 'rgba(132,204,22,0.35)' },
  chicken:   { bg: 'rgba(251,191,36,0.18)',  bd: 'rgba(251,191,36,0.35)' },
  wood:      { bg: 'rgba(205,127,50,0.18)',  bd: 'rgba(205,127,50,0.35)' },
  gold:      { bg: 'rgba(251,191,36,0.18)',  bd: 'rgba(251,191,36,0.35)' },
  stone:     { bg: 'rgba(148,163,184,0.18)', bd: 'rgba(148,163,184,0.35)' },
  research:  { bg: 'rgba(255,215,0,0.15)',   bd: 'rgba(255,215,0,0.40)' },
  train:     { bg: 'rgba(239,68,68,0.15)',   bd: 'rgba(239,68,68,0.40)' },
  build:     { bg: 'rgba(148,163,184,0.18)', bd: 'rgba(148,163,184,0.45)' },
  build_res: { bg: 'rgba(148,163,184,0.18)', bd: 'rgba(148,163,184,0.45)' },
  age_up:    { bg: 'rgba(255,215,0,0.15)',   bd: 'rgba(255,215,0,0.40)' },
  action:    { bg: 'rgba(255,215,0,0.15)',   bd: 'rgba(255,215,0,0.35)' },
  reallocate:{ bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.20)' },
};

const ROW_BG = {
  research:  { bg: 'rgba(255,215,0,0.06)',  bd: '1px solid rgba(255,215,0,0.15)' },
  train:     { bg: 'rgba(239,68,68,0.06)',  bd: '1px solid rgba(239,68,68,0.15)' },
  build:     { bg: 'rgba(148,163,184,0.08)', bd: '1px solid rgba(148,163,184,0.20)' },
  build_res: { bg: 'transparent', bd: 'none' },
  age_up:    { bg: 'rgba(255,215,0,0.06)',  bd: '1px solid rgba(255,215,0,0.15)' },
  action:    { bg: 'rgba(255,215,0,0.03)',  bd: '1px solid rgba(255,215,0,0.10)' },
  reallocate:{ bg: 'rgba(255,255,255,0.03)', bd: '1px dashed rgba(255,255,255,0.10)' },
};

const AGE_STYLE = {
  'Dark Age':                { accent: C.blue, bg: 'rgba(102,178,255,0.20)' },
  'Advancing to Feudal':     { accent: C.blue, bg: 'rgba(102,178,255,0.06)' },
  'Feudal Age':              { accent: C.blue, bg: 'rgba(102,178,255,0.20)' },
  'Advancing to Castle Age': { accent: C.blue, bg: 'rgba(102,178,255,0.06)' },
  'Castle Age':              { accent: C.blue, bg: 'rgba(102,178,255,0.20)' },
  'Advancing to Imperial Age':{ accent: C.blue, bg: 'rgba(102,178,255,0.06)' },
  'Imperial Age':            { accent: C.blue, bg: 'rgba(102,178,255,0.20)' },
};

const NEXT_COL = {
  critical: { bg: 'rgba(255,215,0,0.10)',   bd: 'rgba(255,215,0,0.22)' },
  scouts:   { bg: 'rgba(102,178,255,0.08)', bd: 'rgba(102,178,255,0.18)' },
  archers:  { bg: 'rgba(168,85,247,0.08)', bd: 'rgba(168,85,247,0.18)' },
  maa:      { bg: 'rgba(239,68,68,0.08)',  bd: 'rgba(239,68,68,0.18)' },
  general:  { bg: 'rgba(76,175,80,0.08)',  bd: 'rgba(76,175,80,0.18)' },
};

/* ════════════════════════════════════════════════
   COMPONENTS
   ════════════════════════════════════════════════ */
const validateStep = (step) => {
  if (step.vil === null) return true;
  const res = step.res || {};
  const sum = Object.values(res).reduce((a, b) => a + b, 0);
  return sum === 0 || sum === step.vil;
};

const Badge = ({ resKey, value }) => {
  const zero = value === 0;
  const color = RES_COLOR[resKey];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1px',
      padding: '1px 4px', borderRadius: '3px', minWidth: '28px', justifyContent: 'center',
      fontSize: '10px', fontWeight: '700', fontVariantNumeric: 'tabular-nums',
      backgroundColor: zero ? 'transparent' : `${color}18`,
      color: zero ? C.resZero : color,
    }}>
      <span style={{ fontSize: '9px' }}>{RES_ICON[resKey]}</span>{value}
    </div>
  );
};

const ResBadges = ({ step }) => {
  const res = step.res || {};
  const foodBadges = FOOD_KEYS
    .filter((k) => (res[k] || 0) > 0)
    .map((k) => <Badge key={k} resKey={k} value={res[k]} />);
  const fixedBadges = FIXED_KEYS.map((k) => (
    <Badge key={k} resKey={k} value={res[k] || 0} />
  ));
  const hasAnything = foodBadges.length > 0 || FIXED_KEYS.some((k) => (res[k] || 0) > 0);
  if (!hasAnything) return <div style={{ minWidth: '96px' }} />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
      {foodBadges.length > 0 && (
        <div style={{ display: 'flex', gap: '2px', marginRight: '6px' }}>{foodBadges}</div>
      )}
      <div style={{ display: 'flex', gap: '2px' }}>{fixedBadges}</div>
    </div>
  );
};

const TaskIcon = ({ step, meta, cc }) => {
  if (Array.isArray(step.icon)) {
    const isChoice = meta.cat === 'build' && step.icon.length > 1;
    const isReallocate = meta.cat === 'reallocate';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {step.icon.map((ic, idx) => {
          const imgPath = iconPath(ic);
          const isImage = !!imgPath;
          const isCrossed = isReallocate && idx === 0;
          const showSeparator = idx < step.icon.length - 1 && (!isReallocate || idx === 0);

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', overflow: 'hidden', position: 'relative',
                backgroundColor: cc.bg, border: `1px solid ${cc.bd}`,
              }}>
                {isImage ? (
                  <img src={imgPath} alt="" style={{ width: '18px', height: '18px', objectFit: 'cover', borderRadius: '2px' }} />
                ) : (
                  <span>{ic}</span>
                )}
                {isCrossed && (
                  <div style={{ position: 'absolute', width: '30px', height: '2px', backgroundColor: C.red, transform: 'rotate(-45deg)' }} />
                )}
              </div>
              {showSeparator && (
                <span style={{ fontSize: '9px', color: C.textMute, fontWeight: 'bold' }}>
                  {isChoice ? 'OR' : '➔'}
                </span>
              )}
            </div>
          );
        })}
        {isChoice && <span style={{ fontSize: '15px', color: C.textMute, fontWeight: 'bold', marginLeft: '2px' }}>?</span>}
      </div>
    );
  }

  const imgPath = iconPath(step.icon);
  const hasImg = !!imgPath;
  return (
    <div style={{
      width: '22px', height: '22px', borderRadius: '5px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', overflow: 'hidden',
      backgroundColor: cc.bg, border: `1px solid ${cc.bd}`,
    }}>
      {hasImg ? (
        <img
          src={imgPath}
          alt=""
          style={{ width: '18px', height: '18px', objectFit: 'cover', borderRadius: '2px', display: 'block' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.insertAdjacentText('afterend', meta.icon);
          }}
        />
      ) : (
        <span>{step.icon || meta.icon}</span>
      )}
    </div>
  );
};

const StepRow = ({ step }) => {
  const meta = TASK_META[step.task] || { icon: '❓', cat: 'action' };
  const cc = CAT_BG[meta.cat] || CAT_BG.action;
  const valid = validateStep(step);
  const rowStyle = ROW_BG[meta.cat] || { bg: 'transparent', bd: 'none' };
  const isAgeUp = meta.cat === 'age_up';

  const noteColor = (meta.cat === 'research' || meta.cat === 'train' || meta.cat === 'build' || meta.cat === 'age_up')
    ? C.noteGold : C.tipGreen;

  return (
    <>
      {isAgeUp && (
        <div style={{ height: '1px', margin: '3px 0', background: `linear-gradient(90deg,transparent,${C.borderMed},transparent)` }} />
      )}
      <div style={{
        display: 'grid', gridTemplateColumns: '30px max-content 1fr auto',
        alignItems: 'center', padding: '1px 8px', marginBottom: '1px',
        borderRadius: '4px', background: rowStyle.bg, border: rowStyle.bd,
      }}>
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <span style={{
            fontSize: '12px', fontWeight: '700', color: C.gold,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {step.vil !== null ? step.vil : '—'}
          </span>
          {!valid && (
            <span title="Resource assignment doesn't match vil count" style={{
              position: 'absolute', top: '-3px', right: '-2px', fontSize: '9px', cursor: 'help',
            }}>⚠️</span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TaskIcon step={step} meta={meta} cc={cc} />
        </div>

        <div style={{
          fontSize: '12px', color: C.text,
          paddingLeft: '10px', lineHeight: '1.4',
          textAlign: 'left',
        }}>
          {step.desc}
          {step.note && (
            <span style={{
              color: noteColor, fontStyle: 'italic', fontSize: '11px',
              marginLeft: '8px',
            }}>
              — {step.note}
            </span>
          )}
        </div>

        <ResBadges step={step} />
      </div>
    </>
  );
};

const ToggleSwitch = ({ on, onToggle, label }) => (
  <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', userSelect: 'none' }}>
    <span style={{ fontSize: '11px', fontWeight: '600', color: on ? C.gold : C.textMute }}>{label}</span>
    <div style={{
      width: '32px', height: '18px', borderRadius: '9px', position: 'relative',
      backgroundColor: on ? `${C.gold}44` : '#2a2d36',
      border: `1px solid ${on ? C.gold + '66' : C.borderLt}`, transition: 'all 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: '2px', left: on ? '15px' : '2px',
        width: '12px', height: '12px', borderRadius: '50%',
        backgroundColor: on ? C.gold : '#666', transition: 'all 0.2s',
      }} />
    </div>
  </div>
);

const AgeHeader = ({ age }) => {
  const as = AGE_STYLE[age.name] || AGE_STYLE['Dark Age'];
  const hasImg = !!age.icon;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '5px 12px', borderRadius: '5px', marginBottom: '3px',
      fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em',
      background: as.bg,
      color: as.accent,
    }}>
      {hasImg ? (
        <img src={iconPath(age.icon)} alt="" style={{ width: '14px', height: '14px', objectFit: 'cover', borderRadius: '2px' }} />
      ) : (
        <span>{age.icon}</span>
      )}
      {age.name}
    </div>
  );
};

const AgeSections = ({ build }) => (
  <>
    {build.ages.map((age, ai) => (
      <div key={ai} style={{ marginBottom: '8px' }}>
        <AgeHeader age={age} />
        {age.steps.map((step, si) => <StepRow key={si} step={step} />)}
      </div>
    ))}
  </>
);

const YouTubeBtn = ({ url }) => {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', marginRight: '15px',
      backgroundColor: '#cc0000', color: '#fff', textDecoration: 'none',
      padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
      letterSpacing: '0.05em', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
    }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff0000'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#cc0000'}>
      ▶ WATCH VOD
    </a>
  );
};

const BuildOrderDetail = () => {
  const { buildId } = useParams();
  const navigate = useNavigate();
  const build = builds.find((b) => b.id === buildId);
  const [gameMode, setGameMode] = useState(false);
  useEffect(() => {
    if (build) {
      document.title = `${build.title} | Emputors`;
    } else {
      document.title = 'Build Not Found | Emputors';
    }
  }, [build]);
  
  if (!build) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: C.textDim }}>
        <h2 style={{ color: '#fff', marginBottom: '12px' }}>Build not found</h2>
        <Link to="/academy/build-orders" style={{ color: C.gold, textDecoration: 'underline' }}>← Back to Build Orders</Link>
      </div>
    );
  }

  const hoverProps = {
    onMouseEnter: (e) => e.currentTarget.style.filter = 'brightness(1.4) drop-shadow(0 0 2px rgba(255,255,255,0.2))',
    onMouseLeave: (e) => e.currentTarget.style.filter = 'none',
  };

  if (gameMode) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '8px 10px 40px', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: '5px', border: `1px solid ${C.border}`,
          marginBottom: '8px',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url('/maps/${build.map}.png')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(26,28,35,0.95) 20%, rgba(26,28,35,0.6) 100%)', zIndex: 0 }} />
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: C.gold, fontWeight: '700', fontSize: '13px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{build.title}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <YouTubeBtn url={build.video} />
              <ToggleSwitch on={gameMode} onToggle={() => setGameMode(false)} label="Game Mode" />
            </div>
          </div>
        </div>
        <AgeSections build={build} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '12px 12px 40px', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* MAP BANNER HEADER */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: '6px', border: `1px solid ${C.border}`,
        marginBottom: '10px',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url('/maps/${build.map}.png')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(26,28,35,0.95) 20%, rgba(26,28,35,0.5) 100%)', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/academy/build-orders"
              style={{ color: C.textMute, textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textMute)}
            >←</Link>
            
            <div style={{ padding: '2px', background: 'rgba(30,33,43,0.8)', borderRadius: '6px', border: `1px solid ${C.cyan}`, display: 'flex' }}>
              <img src={`/civs/${build.civ.toLowerCase()}.png`} style={{ width: '32px', height: '32px', display: 'block' }} onError={(e) => e.target.style.display='none'} />
            </div>
            {renderPremiumStratIcons(build.strategy)}
            
            <div style={{ color: C.gold, fontWeight: '800', fontSize: '16px', marginLeft: '6px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {build.title}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <YouTubeBtn url={build.video} />
            <ToggleSwitch on={gameMode} onToggle={() => setGameMode(true)} label="Game Mode" />
          </div>
        </div>
      </div>

      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px',
        padding: '12px', marginBottom: '12px',
        textAlign: 'left'
      }}>
        <div style={{ color: C.textDim, fontSize: '12px', lineHeight: '1.55', marginBottom: '10px' }}>
          {build.description}
        </div>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span onClick={() => navigate(`/academy/build-orders?civ=${encodeURIComponent(build.civ)}`)} {...hoverProps} style={{ cursor: 'pointer', padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${C.cyan}1a`, border: `1px solid ${C.cyan}33`, color: C.cyan, transition: 'filter 0.2s' }}>{build.civ}</span>
          <span onClick={() => navigate(`/academy/build-orders?map=${encodeURIComponent(build.map)}`)} {...hoverProps} style={{ cursor: 'pointer', padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: '#2a2d36', border: '1px solid #444', color: C.textMain, transition: 'filter 0.2s' }}>{build.map}</span>
          <span onClick={() => navigate(`/academy/build-orders?strat=${encodeURIComponent(build.strategy)}`)} {...hoverProps} style={{ cursor: 'pointer', padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${C.gold}1a`, border: `1px solid ${C.gold}33`, color: C.gold, transition: 'filter 0.2s' }}>{build.strategy}</span>
          <span onClick={() => navigate(`/academy/build-orders?diff=${encodeURIComponent(build.difficulty)}`)} {...hoverProps} style={{ cursor: 'pointer', padding: '2px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', backgroundColor: `${diffColor(build.difficulty)}1a`, border: `1px solid ${diffColor(build.difficulty)}33`, color: diffColor(build.difficulty), transition: 'filter 0.2s' }}>{build.difficulty}</span>
        </div>
      </div>

      <AgeSections build={build} />

      {build.whatsNext && build.whatsNext.length > 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px',
          padding: '10px 12px', marginTop: '8px', textAlign: 'left'
        }}>
          <h2 style={{ fontSize: '11px', fontWeight: '800', color: C.gold, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
            What's Next?
          </h2>
          {build.whatsNext.map((item, i) => {
            const nc = NEXT_COL[item.style] || NEXT_COL.general;
            return (
              <div key={i} style={{
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                padding: '5px 9px', marginBottom: '3px', borderRadius: '4px',
                background: nc.bg, border: `1px solid ${nc.bd}`,
              }}>
                <div style={{
                  flexShrink: 0, width: '22px', height: '22px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
                  backgroundColor: nc.bg, border: `1px solid ${nc.bd}`,
                }}>{item.icon}</div>
                <div style={{ fontSize: '11px', color: C.textDim, lineHeight: '1.45', textAlign: 'left' }}>
                  <strong style={{ color: C.textMain }}>{item.title}</strong> {item.text}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BuildOrderDetail;