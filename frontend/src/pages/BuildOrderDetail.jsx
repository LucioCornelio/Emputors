import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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

const RES_ICON = {
  sheep: '🐑', boar: '🐗', underTC: '🛖', hunt: '🦌', chicken: '🐔', berries: '🫐',
  farm: '🌾', fish: '🐟', wood: '🪵', gold: '🪙', stone: '🪨', builder: '🔨',
  ship: '🚢', ship_gold: '⛵',
};
const RES_COLOR = {
  sheep: '#ef4444', boar: '#ef4444', underTC: '#ef4444', hunt: '#ef4444',
  chicken: '#ef4444', berries: '#ef4444', farm: '#ef4444', fish: '#ef4444', // Granja en rojo
  wood: '#cd7f32', gold: '#fbbf24', stone: '#94a3b8', builder: '#94a3b8',
  ship: '#3b82f6', ship_gold: '#fbbf24', 
};

const KEYWORDS = [
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
  'BodkinArrowDE': '/techs/BodkinArrowDE.png',
  'WheelbarrowDE': '/techs/WheelbarrowDE.png',
  'Gold_mining_aoe2de': '/techs/Gold_mining_aoe2de.png', // Icono de minería de oro
  
  'ManAtArmsUpgDE': '/techs/ManAtArmsUpgDE.png',
  'LongSwordsmanUpgDE': '/techs/LongSwordmanUpgDE.png', 
  'Crossbowman_aoe2DE': '/techs/CrossbowmanDE.png',

  'MilitiaDE': '/units/MilitiaDE.png',
  'Manatarms': '/units/Manatarms_aoe2DE.png',
  'Longswordsman_aoe2DE': '/units/Longswordsman_aoe2DE.png',
  'Archer_aoe2DE': '/units/Archer_aoe2DE.png',
  'Tradecart_aoe2DE': '/units/Tradecart_aoe2DE.png',
  'Scoutcavalry_aoe2DE': '/units/Scoutcavalry_aoe2DE.png',
  'FishingShipDE': '/units/FishingShipDE.png',
  'Hulk_AoE2': '/units/Hulk_AoE2.png',
  'MuleCartDE': '/units/MuleCartDE.png',
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
  'Dock_aoe2DE': '/buildings/Dock_aoe2DE.png',
  'Mining_camp_aoe2de': '/buildings/Mining_camp_aoe2de.png',
  'Town_center_aoe2de': '/buildings/Town_center_aoe2de.png',
  'University_aoe2de': '/buildings/University_aoe2de.png',
  'CastleDE': '/buildings/CastleDE.png',
  'LightCavalryDE': '/units/LightCavalryDE.png',
  'FarmDE': '/buildings/FarmDE.png',
};

const iconPath = (name) => {
  if (!name) return null;
  return ICON_MAP[name] || null; 
};

const CAT_BG = {
  food:      { bg: 'rgba(239,68,68,0.18)',   bd: 'rgba(239,68,68,0.35)' },
  berries:   { bg: 'rgba(168,85,247,0.18)',  bd: 'rgba(168,85,247,0.35)' },
  fish:      { bg: 'rgba(59,130,246,0.18)',  bd: 'rgba(59,130,246,0.35)' },
  farm:      { bg: 'rgba(239,68,68,0.18)',   bd: 'rgba(239,68,68,0.35)' }, // Granja en rojo
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

const validateStep = (step) => {
  if (step.vil === null) return true;
  const res = step.res || {};
  const vilSum = Object.entries(res)
    .filter(([k]) => !SHIP_KEYS.includes(k))
    .reduce((a, [_, v]) => a + v, 0);
  return vilSum === 0 || vilSum === step.vil;
};

const Badge = ({ resKey, value, isGrowing }) => {
  const zero = value === 0;
  const color = RES_COLOR[resKey];
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2px',
      padding: '2px 4px', borderRadius: '4px', minWidth: '30px', justifyContent: 'center',
      fontSize: '10px', fontWeight: isGrowing ? '800' : '600', fontVariantNumeric: 'tabular-nums',
      backgroundColor: isGrowing ? `${color}33` : (zero ? 'transparent' : `${color}15`),
      border: `1px solid ${isGrowing ? color : 'transparent'}`,
      // CAMBIO AQUÍ: Ahora usa siempre 'color' en lugar de '#fff' si no es cero.
      color: zero ? C.resZero : color,
      transition: 'all 0.2s ease',
      boxSizing: 'border-box'
    }}>
      <span style={{ fontSize: '9px' }}>{RES_ICON[resKey]}</span>{value}
    </div>
  );
};

const ResBadges = ({ step, prevRes }) => {
  // OCULTAMOS LAS BADGES PARA ACCIONES, TRENES Y TECNOLOGÍAS
  if (['research', 'age_up', 'action', 'train'].includes(step.task)) {
    return <div style={{ minWidth: '96px' }} />;
  }
  // Y ocultamos para los 'build' genéricos que NO envían vils fijos al recurso constructor
  if (step.task === 'build' && !(step.res && step.res.builder > 0)) {
    return <div style={{ minWidth: '96px' }} />;
  }

  const res = step.res || {};
  const safePrev = prevRes || {};

  // TRUCO VISUAL: Agrupamos ovejas y jabalíes en "underTC" solo para la UI de la derecha
  const visualRes = { ...res };
  visualRes.underTC = (visualRes.underTC || 0) + (visualRes.sheep || 0) + (visualRes.boar || 0);
  delete visualRes.sheep;
  delete visualRes.boar;

  const visualPrev = { ...safePrev };
  visualPrev.underTC = (visualPrev.underTC || 0) + (visualPrev.sheep || 0) + (visualPrev.boar || 0);
  delete visualPrev.sheep;
  delete visualPrev.boar;

  const foodBadges = FOOD_KEYS
    .filter((k) => (visualRes[k] || 0) > 0)
    .map((k) => <Badge key={k} resKey={k} value={visualRes[k]} isGrowing={(visualRes[k] || 0) > (visualPrev[k] || 0)} />);
    
  const fixedBadges = FIXED_KEYS.map((k) => (
    <Badge key={k} resKey={k} value={visualRes[k] || 0} isGrowing={(visualRes[k] || 0) > (visualPrev[k] || 0)} />
  ));
  
  const shipBadges = SHIP_KEYS
    .filter((k) => (visualRes[k] || 0) > 0)
    .map((k) => <Badge key={k} resKey={k} value={visualRes[k]} isGrowing={(visualRes[k] || 0) > (visualPrev[k] || 0)} />);

  const hasAnything = foodBadges.length > 0 || FIXED_KEYS.some((k) => (visualRes[k] || 0) > 0) || shipBadges.length > 0;
  if (!hasAnything) return <div style={{ minWidth: '96px' }} />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, gap: '4px' }}>
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

const TaskIcon = ({ step, meta, cc }) => {
  if (Array.isArray(step.icon)) {
    // Solo mostramos "OR" si la descripción dice explícitamente " or "
    const isChoice = step.desc && step.desc.toLowerCase().includes(' or ');
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
                  {isChoice ? 'OR' : (meta.cat === 'build' ? '+' : '➔')}
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

const StepRow = ({ step, prevRes }) => {
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
        <div style={{ textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            fontSize: '12px', fontWeight: '700', color: C.gold,
            fontVariantNumeric: 'tabular-nums', lineHeight: '1'
          }}>
            {step.vil !== null ? step.vil : '—'}
          </span>
          
          {(() => {
            const shipCount = SHIP_KEYS.reduce((sum, k) => sum + (step.res?.[k] || 0), 0);
            if (shipCount > 0) {
              return (
                <span style={{ fontSize: '9px', color: '#3b82f6', fontWeight: 'bold', marginTop: '1px' }}>
                  +{shipCount}🚢
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

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TaskIcon step={step} meta={meta} cc={cc} />
        </div>

        <div style={{
          fontSize: '12px', color: C.text,
          paddingLeft: '10px', lineHeight: '1.4',
          textAlign: 'left',
        }}>
          {formatDesc(step.desc)}
          {step.note && (
            <span style={{
              color: noteColor, fontStyle: 'italic', fontSize: '11px',
              marginLeft: '8px',
            }}>
              — {step.note}
            </span>
          )}
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

const AgeSections = ({ build }) => {
  let lastRes = {};
  return (
    <>
      {build.ages.map((age, ai) => (
        <div key={ai} style={{ marginBottom: '8px' }}>
          <AgeHeader age={age} />
          {age.steps.map((step, si) => {
            const prevRes = { ...lastRes };
            if (step.res) {
              lastRes = { ...step.res };
            }
            return <StepRow key={si} step={step} prevRes={prevRes} />;
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