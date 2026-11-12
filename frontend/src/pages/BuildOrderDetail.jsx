import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { iconPath } from '../data/iconPaths';

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
  'Scouts': ['/units/Scoutcavalry_aoe2DE.png'],
  'FC Crossbow + Siege': ['/techs/CastleAgeIconDE.png', '➔', '/units/Crossbowman_aoe2DE.png', '/buildings/Siege_workshop_aoe2DE.png']
};

const renderPremiumStratIcons = (data) => {
  const dbIcons = data.strategyIcons || data.strategy_icons;
  const icons = (dbIcons && dbIcons.length > 0) ? dbIcons : STRAT_ICONS[data.strategy];
  
  if (!icons || icons.length === 0) return null;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

const FOOD_KEYS = ['sheep','boar','underTC','hunt','chicken','berries','farm','fish'];
const FIXED_KEYS = ['wood','gold','stone','builder'];
const SHIP_KEYS = ['ship', 'ship_gold'];
const START_VILS = 3; // villagers every game starts with
const GAME_CYAN = '#6ff2f2'; // colour of the in-game villager counter 

const RES_ICON = {
  sheep: '🐑', boar: '🐗', underTC: '🛖', hunt: '🦌', chicken: '🐔', berries: '🫐',
  farm: '🌾', fish: '🐟', wood: '🪵', gold: '🪙', stone: '🪨', builder: '🔨',
  ship: '🚢', ship_gold: '⛵',
};
const RES_COLOR = {
  sheep: '#ef4444', boar: '#ef4444', underTC: '#ef4444', hunt: '#ef4444',
  chicken: '#ef4444', berries: '#ef4444', farm: '#ef4444', fish: '#ef4444', // Farm in red
  wood: '#cd7f32', gold: '#fbbf24', stone: '#94a3b8', builder: '#94a3b8',
  ship: '#3b82f6', ship_gold: '#fbbf24', 
};

// Real AoE2 images for resources and food sources. "fallback" is shown until the image file exists.
const UNDER_TC = { src: '/aoe/resource/food_under_tc.png', fallback: '🛖', label: 'Food under TC (sheep, boar, deer)' };
const RES_ART = {
  underTC: UNDER_TC, sheep: UNDER_TC, boar: UNDER_TC,
  hunt:      { src: '/aoe/resource/deer.png', fallback: '🦌', label: 'Hunt' },
  berries:   { src: '/aoe/resource/berries.png', fallback: '🫐', label: 'Berries' },
  farm:      { src: '/aoe/building/Farm.png', fallback: '🌾', label: 'Farms' },
  fish:      { src: '/aoe/resource/fish.png', fallback: '🐟', label: 'Fish' },
  chicken:   { src: '/aoe/resource/chicken.png', fallback: '🐔', label: 'Chicken' },
  wood:      { src: '/aoe/resource/wood.png', fallback: '🪵', label: 'Wood' },
  gold:      { src: '/aoe/resource/gold.png', fallback: '🪙', label: 'Gold' },
  stone:     { src: '/aoe/resource/stone.png', fallback: '🪨', label: 'Stone' },
  builder:   { src: '/aoe/unit/Villager.png', fallback: '🔨', label: 'Builders' },
  ship:      { src: '/aoe/resource/fishing_ship_water.png', fallback: '🚢', label: 'Fishing ships' },
  ship_gold: { src: '/aoe/unit/Trade_Cog.png', fallback: '⛵', label: 'Trade cogs' },
};
// Emojis used in older build orders map to the same art
const EMOJI_RES = { '🛖': 'underTC', '🐑': 'underTC', '🐗': 'underTC', '🦌': 'hunt', '🫐': 'berries', '🌾': 'farm', '🐟': 'fish', '🐔': 'chicken', '🪵': 'wood', '🪙': 'gold', '🪨': 'stone', '🔨': 'builder', '🚢': 'ship', '⛵': 'ship_gold' };
// Default icon for resource tasks when the step has no icon
const TASK_RES = { food_sheep: 'underTC', food_tc: 'underTC', food_boar: 'underTC', food_berries: 'berries', food_fish: 'fish', food_farm: 'farm', food_chicken: 'chicken', food_hunt: 'hunt', wood: 'wood', gold: 'gold', stone: 'stone' };

const ResArt = ({ art, size = 18 }) => {
  const [failed, setFailed] = useState(false);
  if (!art) return null;
  if (failed || !art.src) return <span title={art.label} style={{ fontSize: `${Math.round(size * 0.7)}px`, lineHeight: 1 }}>{art.fallback}</span>;
  return (
    <span title={art.label} style={{ position: 'relative', display: 'inline-block', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <img src={art.src} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px', display: 'block' }} />
      {art.overlay && <img src={art.overlay} alt="" style={{ position: 'absolute', right: '-2px', bottom: '-2px', width: `${Math.round(size * 0.55)}px`, height: `${Math.round(size * 0.55)}px`, objectFit: 'contain', filter: 'drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000)' }} />}
    </span>
  );
};

// Sheep and boar are shown together as Food under TC
const mergeUnderTC = (res) => {
  const v = { ...(res || {}) };
  v.underTC = (v.underTC || 0) + (v.sheep || 0) + (v.boar || 0);
  delete v.sheep; delete v.boar;
  return v;
};

const KEYWORDS = [
  "(?:food )?under TC",
  "\\d+",
  "sheep", "boar", "wood", "gold", "stone", "berries", "hunt", "fish", "shore fish", "straggler(?:s)?", "farm(?:s)?", "food", "deer",
  "TC", "Town Center", "House(?:s)?", "Mill", "Lumber Camp", "Mining Camp", "Barracks", "Archery Range", "Range", "Market", "Blacksmith", "Stable", "Siege Workshop", "Monastery", "Dock(?:s)?", "Tower", "Castle",
  "Loom", "Double-Bit Axe", "Horse Collar", "Forging", "Scale Mail Armor", "Chain Mail Armor", "Squires", "Fletching", "Bodkin Arrow", "Crossbowman Upgrade", "Men-at-Arms Upgrade", "Long Swordsman Upgrade", "Wheelbarrow",
  "Militia(?:s)?", "Men-at-Arms", "MAA", "Long Swordsm[ea]n", "LS", "Spear(?:s)?", "Spearm[ea]n", "Skirm(?:s)?", "Skirmisher(?:s)?", "Archer(?:s)?", "Crossbowm[ea]n", "Scout(?:s)?", "Scout Cavalry", "Hulk(?:s)?", "Fishing Ship(?:s)?", "Mule Cart(?:s)?"
];
const BOLD_REGEX = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'gi');

const formatDesc = (text) => {
  if (!text) return null;
  const parts = text.split(BOLD_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ color: '#fff', fontWeight: '800' }}>{part}</strong>;
    }
    return part;
  });
};

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


const CAT_BG = {
  food:      { bg: 'rgba(239,68,68,0.18)',   bd: 'rgba(239,68,68,0.35)' },
  berries:   { bg: 'rgba(168,85,247,0.18)',  bd: 'rgba(168,85,247,0.35)' },
  fish:      { bg: 'rgba(59,130,246,0.18)',  bd: 'rgba(59,130,246,0.35)' },
  farm:      { bg: 'rgba(239,68,68,0.18)',   bd: 'rgba(239,68,68,0.35)' }, // Farm in red
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

// Step type marker: coloured icon frame (A) + thin bar on the left of the row (B). Rows themselves stay neutral.
const TYPE_ACCENT = {
  build: '#94a3b8', build_res: '#94a3b8',
  train: '#ef4444',
  research: '#ffd700', age_up: '#ffd700',
};

const AGE_STYLE = {
  'Dark Age':                { accent: C.blue, bg: 'rgba(102,178,255,0.20)' },
  'Advancing to Feudal':     { accent: C.blue, bg: 'rgba(102,178,255,0.06)' },
  'Advancing to Feudal Age': { accent: C.blue, bg: 'rgba(102,178,255,0.06)' },
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

const validateStep = (step) => {
  if (step.vil === null) return true;
  const res = step.res || {};
  const vilSum = Object.entries(res)
    .filter(([k]) => !SHIP_KEYS.includes(k))
    .reduce((a, [_, v]) => a + v, 0);
  return vilSum === 0 || vilSum === step.vil;
};

// Fixed size: same width for 1 or 2 digits (number centred in a 2-digit slot), low height so rows stay compact
const Badge = ({ resKey, value, isGrowing }) => {
  const zero = value === 0;
  const color = RES_COLOR[resKey];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
      width: '36px', height: '18px', padding: '0 2px', borderRadius: '4px', lineHeight: 1,
      fontSize: '10px', fontWeight: isGrowing ? '800' : '600', fontVariantNumeric: 'tabular-nums',
      backgroundColor: isGrowing ? `${color}33` : (zero ? 'transparent' : `${color}15`),
      border: `1px solid ${isGrowing ? color : 'transparent'}`,
      color: zero ? C.resZero : color,
      transition: 'all 0.2s ease',
      boxSizing: 'border-box', flexShrink: 0,
    }}>
      <span style={{ display: 'inline-flex', opacity: zero ? 0.35 : 1 }}><ResArt art={RES_ART[resKey]} size={12} /></span>
      <span style={{ display: 'inline-block', width: '2ch', textAlign: 'center' }}>{value}</span>
    </div>
  );
};

const ResBadges = ({ step, prevRes }) => {
  // HIDE BADGES FOR ACTIONS, TRAINING AND TECHNOLOGIES
  if (['research', 'age_up', 'action', 'train'].includes(step.task)) {
    return <div style={{ minWidth: '96px' }} />;
  }
  // Also hide them for generic 'build' steps that do NOT send fixed vils to the builder resource
  if (step.task === 'build' && !(step.res && step.res.builder > 0)) {
    return <div style={{ minWidth: '96px' }} />;
  }

  const res = step.res || {};
  const safePrev = prevRes || {};

  // VISUAL TRICK: group sheep and boar into "underTC" only for the right-hand UI
  const visualRes = mergeUnderTC(res);
  const visualPrev = mergeUnderTC(safePrev);

  // Checkpoint rows close a reorganisation: every resource with villagers is highlighted
  const hl = (k) => step.checkpoint ? (visualRes[k] || 0) > 0 : (visualRes[k] || 0) > (visualPrev[k] || 0);
  const foodBadges = FOOD_KEYS
    .filter((k) => (visualRes[k] || 0) > 0)
    .map((k) => <Badge key={k} resKey={k} value={visualRes[k]} isGrowing={hl(k)} />);
    
  const fixedBadges = FIXED_KEYS.map((k) => (
    <Badge key={k} resKey={k} value={visualRes[k] || 0} isGrowing={hl(k)} />
  ));
  
  const shipBadges = SHIP_KEYS
    .filter((k) => (visualRes[k] || 0) > 0)
    .map((k) => <Badge key={k} resKey={k} value={visualRes[k]} isGrowing={(visualRes[k] || 0) > (visualPrev[k] || 0)} />);

  const hasAnything = foodBadges.length > 0 || FIXED_KEYS.some((k) => (visualRes[k] || 0) > 0) || shipBadges.length > 0;
  if (!hasAnything) return <div style={{ minWidth: '96px' }} />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, gap: '4px' }}>
      {step.checkpoint && <span title="Economy after the reorganisation" style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '0.05em', color: C.gold, border: `1px solid ${C.gold}66`, borderRadius: '3px', padding: '1px 4px', whiteSpace: 'nowrap' }}>NEW ECO</span>}
      {foodBadges}
      {fixedBadges}
      {shipBadges.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginLeft: '4px', paddingLeft: '8px', borderLeft: `1px solid ${C.border}` }}>
          {shipBadges}
        </div>
      )}
    </div>
  );
};

// One icon: a resource token ("res:wood"), an emoji, an ICON_MAP key or a game name
const IconContent = ({ ic, size = 18 }) => {
  if (typeof ic === 'string' && ic.startsWith('res:')) return <ResArt art={RES_ART[ic.slice(4)]} size={size} />;
  if (EMOJI_RES[ic]) return <ResArt art={RES_ART[EMOJI_RES[ic]]} size={size} />;
  const imgPath = iconPath(ic);
  if (imgPath) return <img src={imgPath} alt="" style={{ width: `${size}px`, height: `${size}px`, objectFit: 'cover', borderRadius: '2px', display: 'block' }} />;
  return <span>{ic}</span>;
};

const IconBox = ({ cc, children, crossed }) => (
  <div style={{
    width: '22px', height: '22px', borderRadius: '5px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', overflow: 'hidden', position: 'relative',
    backgroundColor: cc.bg, border: `1px solid ${cc.bd}`,
  }}>
    {children}
    {crossed && <div style={{ position: 'absolute', width: '30px', height: '2px', backgroundColor: C.red, transform: 'rotate(-45deg)' }} />}
  </div>
);

// Transparent resource art always sits on its own resource colour, whatever the step type
const RES_FRAME = { wood: CAT_BG.wood, gold: CAT_BG.gold, stone: CAT_BG.stone };
const frameFor = (ic, cc) => (typeof ic === 'string' && ic.startsWith('res:') && RES_FRAME[ic.slice(4)]) || cc;

const TaskIcon = ({ step, meta, cc, crossCount = 0 }) => {
  if (Array.isArray(step.icon)) {
    // Only show "OR" if the description explicitly says " or "
    const isChoice = step.desc && step.desc.toLowerCase().includes(' or ');
    const isReallocate = meta.cat === 'reallocate';
    const crossN = crossCount || (isReallocate ? 1 : 0);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {step.icon.map((ic, idx) => {
          const isCrossed = idx < crossN;
          const last = idx === step.icon.length - 1;
          const sep = last ? null : isChoice ? 'OR' : (crossN && idx === crossN - 1) ? '➔' : (crossN || meta.cat === 'build') ? '+' : '➔';
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconBox cc={frameFor(ic, cc)} crossed={isCrossed}><IconContent ic={ic} /></IconBox>
              {sep && <span style={{ fontSize: '9px', color: C.textMute, fontWeight: 'bold' }}>{sep}</span>}
            </div>
          );
        })}
        {isChoice && <span style={{ fontSize: '15px', color: C.textMute, fontWeight: 'bold', marginLeft: '2px' }}>?</span>}
      </div>
    );
  }

  if (step.icon) return <IconBox cc={frameFor(step.icon, cc)}><IconContent ic={step.icon} /></IconBox>;
  if (TASK_RES[step.task]) return <IconBox cc={cc}><ResArt art={RES_ART[TASK_RES[step.task]]} size={18} /></IconBox>;
  return <IconBox cc={cc}><span>{meta.icon}</span></IconBox>;
};

// Advice hidden behind an (i): opens on hover or tap, never shown in Game Mode
const NoteInfo = ({ note, color }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      style={{ position: 'relative', display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle', cursor: 'help' }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '13px', height: '13px', borderRadius: '50%', fontSize: '9px', fontWeight: '800',
        fontStyle: 'italic', fontFamily: 'Georgia, serif', lineHeight: 1,
        color, border: `1px solid ${color}`, opacity: open ? 1 : 0.6,
      }}>i</span>
      {open && (
        <span style={{
          position: 'absolute', left: '50%', bottom: 'calc(100% + 6px)', transform: 'translateX(-50%)',
          zIndex: 20, width: 'max-content', maxWidth: '260px', whiteSpace: 'normal',
          padding: '5px 8px', borderRadius: '4px', fontSize: '11px', lineHeight: 1.35, fontStyle: 'normal',
          color: C.text, background: '#14161c', border: `1px solid ${color}88`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', pointerEvents: 'none',
        }}>{note}</span>
      )}
    </span>
  );
};

const StepRow = ({ step, prevRes, hideNotes, startVil, totalVil, adds }) => {
  const meta = TASK_META[step.task] || { icon: '❓', cat: 'action' };
  const accent = TYPE_ACCENT[meta.cat];
  const cc = accent ? { bg: 'rgba(0,0,0,0.25)', bd: accent } : (CAT_BG[meta.cat] || CAT_BG.action);
  const valid = validateStep(step);
  const isAgeUp = meta.cat === 'age_up';

  // "Move X from A to B" without icons: draw [A crossed] -> [B] from the change in villagers
  let shownStep = step;
  let crossCount = 0;
  if (step.task === 'reallocate' && !step.icon && step.res) {
    const now = mergeUnderTC(step.res), before = mergeUnderTC(prevRes);
    const keys = Array.from(new Set([...Object.keys(now), ...Object.keys(before)]));
    const from = keys.filter(k => (now[k] || 0) < (before[k] || 0));
    const to = keys.filter(k => (now[k] || 0) > (before[k] || 0));
    if (from.length && to.length) {
      shownStep = { ...step, icon: [...from.map(k => `res:${k}`), ...to.map(k => `res:${k}`)] };
      crossCount = from.length;
    }
  }

  const noteColor = (meta.cat === 'research' || meta.cat === 'train' || meta.cat === 'build' || meta.cat === 'age_up')
    ? C.noteGold : C.tipGreen;

  return (
    <>
      {isAgeUp && (
        <div style={{ height: '1px', margin: '3px 0', background: `linear-gradient(90deg,transparent,${C.borderMed},transparent)` }} />
      )}
      <div style={{
        display: 'grid', gridTemplateColumns: '48px 40px max-content 1fr auto',
        alignItems: 'center', padding: '1px 8px', marginBottom: '1px',
        borderRadius: '2px', background: 'transparent', borderLeft: `3px solid ${accent || 'transparent'}`,
      }}>
        <div style={{ textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {startVil != null ? (
            <span title={`In game you see ${startVil} villagers: this is the step to do (until the next number)`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 4px 1px 2px', borderRadius: '4px',
              background: '#000', border: '1px solid #3a3a3a', lineHeight: 1,
            }}>
              <img src="/aoe/resource/vil_counter.png" alt="" style={{ width: '15px', height: '12px', objectFit: 'contain', display: 'block' }} />
              <span style={{ fontSize: '12px', fontWeight: '500', color: GAME_CYAN, fontVariantNumeric: 'tabular-nums', minWidth: '2ch', textAlign: 'right' }}>{startVil}</span>
            </span>
          ) : null}
          
          {(() => {
            const shipCount = SHIP_KEYS.reduce((sum, k) => sum + (step.res?.[k] || 0), 0);
            if (shipCount > 0) {
              return (
                <span title={`+${shipCount} Fishing Ships`} style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', fontSize: '9px', color: '#3b82f6', fontWeight: 'bold', marginTop: '1px' }}>
                  +{shipCount}<img src="/aoe/resource/fishing_ship_cutout.png" alt="" style={{ width: '12px', height: '12px', objectFit: 'contain' }} />
                </span>
              );
            }
            return null;
          })()}

          {!valid && (
            <span title="Resource assignment doesn't match vil count" style={{
              position: 'absolute', top: '-4px', right: '-6px', fontSize: '9px', cursor: 'help',
            }}>⚠️</span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          {totalVil != null && (
            <span title={adds ? 'Villagers once this step is done' : isAgeUp ? 'Villagers when you click the next age' : 'Villagers at this point'} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: '3px', paddingLeft: '4px',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>
              <span style={{ fontSize: '10px', color: C.textMute }}>{adds ? '→' : '='}</span>
              <span style={{ fontSize: isAgeUp ? '14px' : '13px', fontWeight: (adds || isAgeUp) ? '700' : '400', color: (adds || isAgeUp) ? C.gold : C.textMute }}>{totalVil}</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TaskIcon step={shownStep} meta={meta} cc={cc} crossCount={crossCount} />
        </div>

        <div style={{
          fontSize: '12px', color: C.text,
          paddingLeft: '10px', lineHeight: '1.4',
          textAlign: 'left',
        }}>
          {formatDesc(step.desc)}
          {step.note && !hideNotes && <NoteInfo note={step.note} color={noteColor} />}
        </div>

        <ResBadges step={step} prevRes={prevRes} />
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

const AgeSections = ({ build, hideNotes = false }) => {
  let lastRes = {};
  let lastVil = START_VILS;
  return (
    <>
      {build.ages.map((age, ai) => (
        <div key={ai} style={{ marginBottom: '8px' }}>
          <AgeHeader age={age} />
          {age.steps.map((step, si) => {
            const prevRes = { ...lastRes };
            if (step.res && Object.keys(step.res).length > 0) {
              lastRes = { ...step.res };
            }
            // Number shown in game when this step starts: the total before it (or the same total for moves)
            // only shown when the step creates villagers; moves keep the same count
            let startVil = null, totalVil = null, adds = false;
            if (step.vil !== null && step.vil !== undefined) {
              adds = step.vil > lastVil;
              startVil = adds ? lastVil : null;
              totalVil = step.vil;
              lastVil = Math.max(lastVil, step.vil);
            } else if (step.task === 'age_up') {
              totalVil = lastVil;
            }
            return <StepRow key={si} step={step} prevRes={prevRes} hideNotes={hideNotes} startVil={startVil} totalVil={totalVil} adds={adds} />;
          })}
        </div>
      ))}
    </>
  );
};

const YouTubeBtn = ({ url }) => {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      width: '32px', height: '32px',
      backgroundColor: '#cc0000', color: '#fff', textDecoration: 'none',
      borderRadius: '50%', fontSize: '14px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.5)', transition: 'background 0.2s'
    }} 
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff0000'} 
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#cc0000'}
    title="Watch VOD"
    >
      ▶
    </a>
  );
};

const BuildOrderDetail = () => {
  const { buildId } = useParams();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    const fetchBuild = async () => {
      const { data, error } = await supabase.from('build_orders').select('*').eq('id', buildId).single();
      if (data) {
        setBuild({
          ...data,
          popCount: data.pop_count,
          strategyIcons: data.strategy_icons,
          whatsNext: data.whats_next
        });
      } else if (error) {
        console.error("Error fetching build details:", error);
      }
      setLoading(false);
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const rawNick = session.user.user_metadata.preferred_username || session.user.user_metadata.name || '';
        const cleanNick = rawNick.split('#')[0].toLowerCase(); 
        const { data } = await supabase.from('clan_roles').select('role').ilike('discord_username', cleanNick).single();
        if (data) setUserRole(data.role);
      }
    };

    fetchBuild();
    checkUser();
  }, [buildId]);

  useEffect(() => {
    if (build) {
      document.title = `${build.map} | ${build.civ} | ${build.popCount} Vils | ${build.strategy}`;
    } else if (!loading) {
      document.title = 'Build Not Found | Emputors';
    }
  }, [build, loading]);
  
  if (loading) {
    return <div style={{ color: C.textDim, textAlign: 'center', padding: '4rem' }}>Loading Build Order...</div>;
  }

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
              <div style={{ color: C.gold, fontSize: '13px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                <strong style={{ fontWeight: '900', color: '#fff' }}>{build.map}</strong> <span style={{ color: '#888' }}>|</span> {build.civ} <span style={{ color: '#888' }}>|</span> {build.popCount} Vils <span style={{ color: '#888' }}>|</span> {build.strategy}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <YouTubeBtn url={build.video} />
              <ToggleSwitch on={gameMode} onToggle={() => setGameMode(false)} label="Game Mode" />
            </div>
          </div>
        </div>
        <AgeSections build={build} hideNotes />
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
              <img src={build.civ === 'Any' ? '/civs/random.png' : `/civs/${build.civ.toLowerCase()}.png`} alt={build.civ} style={{ width: '32px', height: '32px', display: 'block' }} onError={(e) => e.target.style.display='none'} />
            </div>
            {renderPremiumStratIcons(build)}
            
            <div style={{ color: C.gold, fontSize: '15px', marginLeft: '6px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              <strong style={{ fontWeight: '900', color: '#fff' }}>{build.map}</strong> <span style={{ color: C.textMute }}>|</span> {build.civ} <span style={{ color: C.textMute }}>|</span> {build.popCount} Vils <span style={{ color: C.textMute }}>|</span> {build.strategy}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {userRole === 'admin' && (
              <button 
                onClick={() => navigate('/admin/creator', { state: { editBuild: build } })}
                style={{ backgroundColor: '#2a2d36', color: '#fff', border: '1px solid #444', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2a2d36'}
              >
                ✏️ EDIT
              </button>
            )}
            <YouTubeBtn url={build.video} />
            <Link to={`/academy/build-orders/${build.id}/drill`} title="Memorise this build on a schematic map" style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', textDecoration: 'none',
              color: '#1a1300', background: C.gold, border: `1px solid ${C.gold}`, whiteSpace: 'nowrap',
            }}>🎯 Practice</Link>
            <ToggleSwitch on={gameMode} onToggle={() => setGameMode(true)} label="Game Mode" />
          </div>
        </div>
      </div>

      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px',
        padding: '12px', marginBottom: '12px',
        textAlign: 'left'
      }}>
        <div style={{ color: C.textDim, fontSize: '12px', lineHeight: '1.55', marginBottom: '8px' }}>
          {build.description}
        </div>

        {build.author && (
          <div style={{ color: C.textMute, fontSize: '11px', fontStyle: 'italic', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>📝</span> Build order concept by <strong style={{color: C.gold}}>{build.author}</strong>
          </div>
        )}
        
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