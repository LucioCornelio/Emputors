import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { iconPath } from '../../data/iconPaths';
import { Pine, Oak, Sheep, Boar, Deer, BerryBush, GoldMine, StoneMine, Fish, Chicken, FarmPlot } from './art';
import { GRASS_BG, rng } from './util';

const C = {
  bg: '#161920', card: '#1a1c23', cardAlt: '#1e212b', border: '#2a2d36', borderLt: '#444',
  text: '#e0e0e0', textDim: '#a0aab5', textMute: '#888',
  gold: '#ffd700', green: '#4caf50', red: '#ff5252', blue: '#66b2ff', cyan: '#00c8c8',
};

const VIL_IMG = '/units/MaleVillDE.jpg';
const SHIP_IMG = '/units/FishingShipDE.png';
const BOARD_RATIO = 16 / 10;

// ---------- Buildings and what each one can research / train ----------
const BUILDINGS = {
  tc:         { name: 'Town Center',    key: 'Town_center_aoe2de',    img: '/aoe/building/tc_sprite.png', menu: ['LoomDE', 'WheelbarrowDE', 'Hand Cart', 'Town Watch', 'FeudalAgeIconDE', 'CastleAgeIconDE', 'ImperialAgeIconDE'] },
  house:      { name: 'House',          key: 'House_aoe2DE',          menu: [] },
  mill:       { name: 'Mill',           key: 'Mill_aoe2de',           menu: ['HorseCollarDE', 'HeavyPlowDE', 'Crop Rotation'] },
  lumber:     { name: 'Lumber Camp',    key: 'Lumber_camp_aoe2de',    menu: ['DoubleBitAxe_aoe2DE', 'BowSawDE', 'Two-Man Saw'] },
  mining:     { name: 'Mining Camp',    key: 'Mining_camp_aoe2de',    menu: ['Gold_mining_aoe2de', 'Stone Mining', 'Gold Shaft Mining'] },
  mulecart:   { name: 'Mule Cart',      key: 'MuleCartDE',            menu: ['DoubleBitAxe_aoe2DE', 'BowSawDE', 'Gold_mining_aoe2de', 'Stone Mining'], optional: true },
  dock:       { name: 'Dock',           key: 'Dock_aoe2DE',           menu: ['FishingShipDE', 'Hulk_AoE2', 'Gillnets', 'Galley'], water: true },
  barracks:   { name: 'Barracks',       key: 'Barracks_aoe2DE',       menu: ['MilitiaDE', 'Manatarms', 'Longswordsman_aoe2DE', 'Spearman', 'ManAtArmsUpgDE', 'LongSwordsmanUpgDE', 'SquiresDE'] },
  range:      { name: 'Archery Range',  key: 'Archery_range_aoe2DE',  menu: ['Archer_aoe2DE', 'Skirmisher', 'Crossbowman_aoe2DE', 'Thumb Ring'] },
  stable:     { name: 'Stable',         key: 'Stable_aoe2de',         menu: ['Scoutcavalry_aoe2DE', 'LightCavalryDE', 'Bloodlines', 'Husbandry'] },
  blacksmith: { name: 'Blacksmith',     key: 'Blacksmith_aoe2de',     menu: ['FletchingDE', 'BodkinArrowDE', 'Padded Archer Armor', 'Forging_aoe2de', 'ScaleMailArmorDE', 'ChainMailArmorDE'] },
  market:     { name: 'Market',         key: 'Market_aoe2DE',         menu: [] },
  palisade:   { name: 'Palisade Wall',  key: 'Palisade Wall',         menu: [] },
  monastery:  { name: 'Monastery',      key: 'Monastery_aoe2DE',      menu: [] },
  siege:      { name: 'Siege Workshop', key: 'Siege_workshop_aoe2DE', menu: [] },
  university: { name: 'University',     key: 'University_aoe2de',     menu: [] },
  castle:     { name: 'Castle',         key: 'CastleDE',              menu: [] },
};
const BUILDING_BY_KEY = Object.fromEntries(Object.entries(BUILDINGS).map(([id, b]) => [b.key, id]));
const ALL_COMMANDS = new Set(Object.values(BUILDINGS).flatMap(b => b.menu));

const CMD_LABEL = {
  LoomDE: 'Loom', WheelbarrowDE: 'Wheelbarrow', FeudalAgeIconDE: 'Feudal Age', CastleAgeIconDE: 'Castle Age', ImperialAgeIconDE: 'Imperial Age',
  HorseCollarDE: 'Horse Collar', HeavyPlowDE: 'Heavy Plow', DoubleBitAxe_aoe2DE: 'Double-Bit Axe', BowSawDE: 'Bow Saw', Gold_mining_aoe2de: 'Gold Mining',
  FishingShipDE: 'Fishing Ship', Hulk_AoE2: 'Hulk', MilitiaDE: 'Militia', Manatarms: 'Man-at-Arms', Longswordsman_aoe2DE: 'Long Swordsman',
  ManAtArmsUpgDE: 'Man-at-Arms upgrade', LongSwordsmanUpgDE: 'Long Swordsman upgrade', SquiresDE: 'Squires', Archer_aoe2DE: 'Archer',
  Crossbowman_aoe2DE: 'Crossbowman upgrade', Scoutcavalry_aoe2DE: 'Scout Cavalry', LightCavalryDE: 'Light Cavalry', FletchingDE: 'Fletching',
  BodkinArrowDE: 'Bodkin Arrow', Forging_aoe2de: 'Forging', ScaleMailArmorDE: 'Scale Mail Armor', ChainMailArmorDE: 'Chain Mail Armor',
};
const cmdLabel = (k) => CMD_LABEL[k] || k;
const bImg = (id) => BUILDINGS[id].img || iconPath(BUILDINGS[id].key);
// Building portrait; the Town Center uses the map sprite, shown whole on grass
const BIcon = ({ id }) => BUILDINGS[id].img
  ? <img src={bImg(id)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#4f6f2e', display: 'block' }} />
  : <img src={bImg(id)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;

// ---------- Map areas (board coordinates in %) ----------
const AREAS = [
  { id: 'woodA',   res: 'wood',    label: 'Woodline',      x: 0,  y: 0,  w: 15, h: 100 },
  { id: 'woodB',   res: 'wood',    label: 'Woodline',      x: 17, y: 0,  w: 46, h: 17 },
  { id: 'strag',   res: 'wood',    label: 'Stragglers',    x: 23, y: 55, w: 11, h: 17 },
  { id: 'underTC', res: 'underTC', label: 'Food under TC', x: 39, y: 61, w: 22, h: 14 },
  { id: 'farm',    res: 'farm',    label: 'Farms',         x: 36, y: 78, w: 28, h: 19 },
  { id: 'berries', res: 'berries', label: 'Berries',       x: 66, y: 19, w: 14, h: 16 },
  { id: 'hunt',    res: 'hunt',    label: 'Hunt',          x: 66, y: 57, w: 14, h: 16 },
  { id: 'gold',    res: 'gold',    label: 'Gold',          x: 18, y: 79, w: 14, h: 17 },
  { id: 'stone',   res: 'stone',   label: 'Stone',         x: 70, y: 80, w: 13, h: 16 },
  { id: 'chicken', res: 'chicken', label: 'Chickens',      x: 63, y: 40, w: 10, h: 12, needs: 'chicken' },
  { id: 'builder', res: 'builder', label: 'Builders',      x: 18, y: 22, w: 18, h: 28 },
  { id: 'shore',   res: 'fish',    label: 'Shore fish',    x: 87, y: 14, w: 13, h: 34, needs: 'water' },
  { id: 'ship',    res: 'ship',    label: 'Fishing ships', x: 87, y: 54, w: 13, h: 40, needs: 'water', unit: 'ship' },
];
const TC_POS = { x: 40.5, y: 35, w: 19 };

// Where a building appears on the map once built (the rest go to the builders' yard)
const ANCHORS = {
  mill: [{ x: 60.5, y: 21 }, { x: 60.5, y: 58 }],
  lumber: [{ x: 15.5, y: 30 }, { x: 41, y: 17.5 }, { x: 15.5, y: 70 }],
  mining: [{ x: 32.5, y: 83 }, { x: 83.5, y: 83 }],
  mulecart: [{ x: 15.5, y: 55 }, { x: 33, y: 70 }],
  dock: [{ x: 81.5, y: 44 }],
};

// ---------- Helpers ----------
const mergeRes = (res) => {
  const out = {};
  Object.entries(res || {}).forEach(([k, v]) => {
    if (!v || k === 'ship_gold') return;
    const key = (k === 'sheep' || k === 'boar') ? 'underTC' : k;
    out[key] = (out[key] || 0) + v;
  });
  return out;
};
const sumByRes = (counts) => {
  const out = {};
  AREAS.forEach(a => { if (counts[a.id]) out[a.res] = (out[a.res] || 0) + counts[a.id]; });
  return out;
};
const sameRes = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every(k => (a[k] || 0) === (b[k] || 0));
};
const diffKeys = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(k => (a[k] || 0) !== (b[k] || 0));
};
const iconList = (icon) => (Array.isArray(icon) ? icon : icon ? [icon] : []);
const plain = (s) => (s || '').replace(/\*\*/g, '');

const buildSteps = (ages) => {
  const steps = [];
  let expected = {};
  (ages || []).forEach((age) => {
    (age.steps || []).forEach((s) => {
      const hasRes = s.res && Object.keys(s.res).length > 0;
      const target = hasRes ? mergeRes(s.res) : expected;
      const needsVil = hasRes && !sameRes(target, expected);
      const isCmd = ['research', 'train', 'age_up'].includes(s.task);
      const cmd = isCmd && typeof s.icon === 'string' && ALL_COMMANDS.has(s.icon) ? s.icon : null;
      const buildings = (isCmd || s.task === 'action') ? [] :
        [...new Set(iconList(s.icon).map(k => BUILDING_BY_KEY[k]).filter(Boolean))];
      const kind = (needsVil || cmd || buildings.length) ? 'play' : 'card';
      steps.push({ ...s, age: age.name, target, before: expected, needsVil, cmd, buildings, kind });
      expected = target;
    });
  });
  return steps;
};


// ---------- Small UI pieces ----------
const Img = ({ src, size, round = 4, style }) => (
  <img src={src} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'cover', borderRadius: round, display: 'block', ...style }} />
);

const Btn = ({ children, onClick, kind = 'ghost', title, disabled }) => {
  const styles = {
    primary: { background: C.gold, color: '#1a1300', border: `1px solid ${C.gold}` },
    ghost: { background: 'transparent', color: C.textDim, border: `1px solid ${C.borderLt}` },
  };
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{
      ...styles[kind], padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, whiteSpace: 'nowrap',
    }}>{children}</button>
  );
};

const Sprite = ({ x, y, w, children, z = 1, ratio = 1 }) => (
  <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, aspectRatio: ratio, zIndex: z, pointerEvents: 'none' }}>{children}</div>
);

// ---------- Terrain (static art) ----------
const Terrain = ({ water, chicken, farmCount }) => {
  const sprites = useMemo(() => {
    const out = [];
    const forest = (area, n, seed) => {
      const r = rng(seed);
      for (let i = 0; i < n; i++) {
        const w = 3.4 + r() * 1.2;
        const hPct = w * BOARD_RATIO * 1.25;
        out.push({ t: r() < 0.6 ? 'pine' : 'oak', shade: Math.floor(r() * 3), x: area.x + r() * (area.w - w), y: area.y - 3 + r() * (area.h - hPct + 3), w });
      }
    };
    forest({ x: 0, y: 0, w: 15, h: 100 }, 46, 7);
    forest({ x: 16, y: 0, w: 48, h: 16 }, 30, 11);
    [[24.5, 55], [28.5, 58], [25.5, 61.5], [29.5, 63]].forEach(([x, y], i) => out.push({ t: i % 2 ? 'oak' : 'pine', shade: i, x, y, w: 3.6 }));
    return out.sort((a, b) => a.y - b.y);
  }, []);

  return (
    <>
      {water && (
        <div style={{ position: 'absolute', left: '85%', top: 0, width: '15%', height: '100%', zIndex: 0,
          background: 'linear-gradient(90deg,#d9c58a 0 9%,#3f86a8 9% 30%,#2f6f93 30%)' }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="none" viewBox="0 0 100 100">
            {[12, 30, 47, 66, 84].map(y => <path key={y} d={`M18 ${y} q8 -2 16 0 t16 0 t16 0 t16 0`} stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" fill="none" />)}
          </svg>
        </div>
      )}
      {sprites.map((s, i) => (
        <Sprite key={i} x={s.x} y={s.y} w={s.w} ratio={0.8} z={2}>{s.t === 'pine' ? <Pine shade={s.shade} /> : <Oak shade={s.shade} />}</Sprite>
      ))}
      {/* food under TC */}
      {[[39.5, 62.5], [43.5, 66.5], [47.5, 62]].map(([x, y], i) => <Sprite key={`sh${i}`} x={x} y={y} w={4.2} ratio={32 / 24} z={3}><Sheep /></Sprite>)}
      <Sprite x={51} y={64} w={6.4} ratio={36 / 24} z={3}><Boar /></Sprite>
      {/* berries */}
      {[[67, 21], [71, 20], [75, 22], [68.5, 26.5], [72.5, 27], [76, 28]].map(([x, y], i) => <Sprite key={`b${i}`} x={x} y={y} w={4.3} ratio={30 / 26} z={3}><BerryBush /></Sprite>)}
      {/* hunt */}
      {[[67.5, 59], [72, 62], [75.5, 58]].map(([x, y], i) => <Sprite key={`d${i}`} x={x} y={y} w={4.4} ratio={1} z={3}><Deer /></Sprite>)}
      {/* mines */}
      <Sprite x={18.5} y={81} w={7.4} ratio={40 / 28} z={3}><GoldMine /></Sprite>
      <Sprite x={24} y={86} w={7.4} ratio={40 / 28} z={3}><GoldMine /></Sprite>
      <Sprite x={70.5} y={82} w={6.6} ratio={40 / 28} z={3}><StoneMine /></Sprite>
      <Sprite x={76} y={86} w={6.6} ratio={40 / 28} z={3}><StoneMine /></Sprite>
      {chicken && [[64, 42], [67, 44.5], [69.5, 41.5]].map(([x, y], i) => <Sprite key={`c${i}`} x={x} y={y} w={3.2} ratio={24 / 22} z={3}><Chicken /></Sprite>)}
      {/* farms grow with the farmers (one farm per farmer) */}
      {Array.from({ length: Math.max(6, Math.min(12, farmCount)) }).map((_, i) => {
        const col = i % 6, row = Math.floor(i / 6);
        const on = i < farmCount;
        return (
          <div key={`f${i}`} style={{ position: 'absolute', left: `${36.5 + col * 4.55}%`, top: `${79 + row * 7.6}%`, width: '4.3%', aspectRatio: 1, zIndex: 1, opacity: on ? 1 : 0.35, pointerEvents: 'none', transition: 'opacity .3s' }}>
            <FarmPlot active={on} />
          </div>
        );
      })}
      {farmCount > 12 && <div style={{ position: 'absolute', left: '64%', top: '84%', zIndex: 3, fontSize: 12, fontWeight: 800, color: '#f5dc7a', textShadow: '0 1px 2px #000' }}>+{farmCount - 12}</div>}
      {water && [[89.5, 18], [93.5, 24], [90.5, 32], [94, 40]].map(([x, y], i) => <Sprite key={`fs${i}`} x={x} y={y} w={3.4} ratio={2} z={3}><Fish /></Sprite>)}
      {water && [[92, 62], [95.5, 70], [91, 80], [95, 87]].map(([x, y], i) => <Sprite key={`fd${i}`} x={x} y={y} w={3.4} ratio={2} z={3}><Fish /></Sprite>)}
      {/* builders' yard */}
      <div style={{ position: 'absolute', left: '18%', top: '22%', width: '18%', height: '28%', borderRadius: 10, background: 'rgba(122,98,58,0.35)', border: '1px solid rgba(60,40,15,0.35)', zIndex: 1 }} />
    </>
  );
};

// ---------- Main page ----------
export default function BuildDrill() {
  const { buildId } = useParams();
  const [build, setBuild] = useState(null);
  const [loading, setLoading] = useState(true);

  // play state
  const [idx, setIdx] = useState(0);
  const [counts, setCounts] = useState({});           // villagers per map area
  const [built, setBuilt] = useState([]);             // buildings finished in earlier steps
  const [stepBuilt, setStepBuilt] = useState([]);     // buildings placed in the current step
  const [stepCmd, setStepCmd] = useState(null);       // research / train chosen in the current step
  const [history, setHistory] = useState([]);         // undo stack for the current step
  const [source, setSource] = useState('tc');         // 'tc' or an area id
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState('vil');
  const [menu, setMenu] = useState(null);             // { bid, x, y, canBuild }
  const [feedback, setFeedback] = useState(null);     // { ok, msgs }
  const [wrongRes, setWrongRes] = useState([]);
  const [fails, setFails] = useState(0);
  const [results, setResults] = useState([]);         // { i, errors, revealed }
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(() => { try { return !localStorage.getItem('drillHelpSeen'); } catch { return true; } });
  const closeHelp = () => { setShowHelp(false); try { localStorage.setItem('drillHelpSeen', '1'); } catch { /* storage unavailable */ } };
  const wrapRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('build_orders').select('*').eq('id', buildId).single();
      if (data) setBuild(data);
      setLoading(false);
    })();
  }, [buildId]);

  useEffect(() => { document.title = build ? `Drill | ${build.civ} | ${build.map}` : 'Drill | Emputors'; }, [build]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const steps = useMemo(() => buildSteps(build?.ages), [build]);
  const features = useMemo(() => {
    const water = steps.some(s => s.target.fish || s.target.ship || s.buildings.includes('dock') || s.cmd === 'FishingShipDE');
    const chicken = steps.some(s => s.target.chicken);
    const mulecart = steps.some(s => s.buildings.includes('mulecart'));
    return { water, chicken, mulecart };
  }, [steps]);
  const areas = useMemo(() => AREAS.filter(a => !a.needs || features[a.needs]), [features]);
  const palette = useMemo(() => Object.keys(BUILDINGS).filter(id => (!BUILDINGS[id].water || features.water) && (!BUILDINGS[id].optional || features.mulecart)), [features]);

  const step = steps[idx];
  const done = build && idx >= steps.length;
  const playSteps = steps.filter(s => s.kind === 'play').length;

  const snapshot = () => setHistory(h => [...h, { counts, stepBuilt, stepCmd }]);
  const touch = () => { setFeedback(null); setWrongRes([]); };

  const moveTo = (targetId, from = source) => {
    if (busy || done || !step) return;
    const area = AREAS.find(a => a.id === targetId);
    if (!area) return;
    if (from === targetId) { setSource('tc'); return; }
    const fromArea = AREAS.find(a => a.id === from);
    const isShip = from === 'tc' ? unit === 'ship' : fromArea?.unit === 'ship';
    if (isShip !== (area.unit === 'ship')) {
      setFeedback({ ok: false, msgs: [isShip ? 'Fishing ships only go to deep water.' : 'Villagers cannot go to deep water.'] });
      return;
    }
    const n = from === 'tc' ? amount : Math.min(amount, counts[from] || 0);
    if (n <= 0) return;
    snapshot(); touch();
    setCounts(c => {
      const out = { ...c, [targetId]: (c[targetId] || 0) + n };
      if (from !== 'tc') out[from] = (c[from] || 0) - n;
      return out;
    });
    if (from !== 'tc' && (counts[from] || 0) - n <= 0) setSource('tc');
  };

  const removeToTC = (from) => {
    if (from === 'tc' || !counts[from]) return;
    const n = Math.min(amount, counts[from]);
    snapshot(); touch();
    setCounts(c => ({ ...c, [from]: c[from] - n }));
    if (counts[from] - n <= 0) setSource('tc');
  };

  const placeBuilding = (bid) => { snapshot(); touch(); setStepBuilt(b => [...b, bid]); setMenu(null); };
  const chooseCmd = (k) => { snapshot(); touch(); setStepCmd(k); setMenu(null); };
  const undo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setCounts(last.counts); setStepBuilt(last.stepBuilt); setStepCmd(last.stepCmd);
    setHistory(h => h.slice(0, -1)); setFeedback(null); setWrongRes([]);
  };
  const resetStep = () => {
    if (!history.length) return;
    const first = history[0];
    setCounts(first.counts); setStepBuilt(first.stepBuilt); setStepCmd(first.stepCmd);
    setHistory([]); setFeedback(null); setWrongRes([]); setSource('tc');
  };

  const advance = (revealed, errors) => {
    setResults(r => [...r, { i: idx, errors, revealed, kind: step.kind }]);
    setLog(l => [...l, { step, ok: !revealed && errors === 0 }]);
    setBuilt(b => [...b, ...(revealed ? step.buildings : stepBuilt)]);
    setStepBuilt([]); setStepCmd(null); setHistory([]); setFails(0); setSource('tc'); setWrongRes([]); setMenu(null);
    setIdx(i => i + 1);
  };

  const succeed = (revealed) => {
    const errors = fails;
    setBusy(true);
    setFeedback({ ok: true, msgs: [plain(step.desc)] });
    setTimeout(() => { setBusy(false); setFeedback(null); advance(revealed, errors); }, revealed ? 1600 : 1100);
  };

  const check = () => {
    if (!step || busy) return;
    if (step.kind === 'card') { touch(); advance(false, 0); return; }
    const msgs = [];
    const cur = sumByRes(counts);
    const wrong = diffKeys(cur, step.target);
    if (wrong.length) msgs.push('Villager distribution does not match.');
    const want = [...step.buildings].sort().join(','), got = [...new Set(stepBuilt)].sort().join(',');
    if (want !== got) msgs.push(step.buildings.length ? (stepBuilt.length ? 'Wrong building.' : 'Something has to be built.') : 'Nothing to build in this step.');
    if ((step.cmd || null) !== stepCmd) msgs.push(step.cmd ? (stepCmd ? 'Wrong research or unit.' : 'Something has to be researched or trained.') : 'No research or training in this step.');
    if (!msgs.length) { succeed(false); return; }
    setFails(f => f + 1);
    setWrongRes(wrong);
    setFeedback({ ok: false, msgs });
  };

  const reveal = () => {
    if (!step || busy || step.kind === 'card') return;
    // keep the player's split across woodlines where possible; fix the totals on the main area of each resource
    const next = { ...counts };
    const cur = sumByRes(next);
    new Set([...Object.keys(cur), ...Object.keys(step.target)]).forEach(res => {
      const own = areas.filter(a => a.res === res);
      if (!own.length) return;
      const diff = (step.target[res] || 0) - (cur[res] || 0);
      if (diff > 0) next[own[0].id] = (next[own[0].id] || 0) + diff;
      if (diff < 0) {
        let left = -diff;
        [...own].reverse().forEach(a => { const take = Math.min(left, next[a.id] || 0); next[a.id] = (next[a.id] || 0) - take; left -= take; });
      }
    });
    setCounts(next); setStepBuilt(step.buildings); setStepCmd(step.cmd);
    setFails(f => Math.max(f, 1));
    succeed(true);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); check(); }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
      if (e.key === 'Escape') { setMenu(null); setSource('tc'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const restart = () => {
    setIdx(0); setCounts({}); setBuilt([]); setStepBuilt([]); setStepCmd(null); setHistory([]); setSource('tc');
    setFeedback(null); setWrongRes([]); setFails(0); setResults([]); setLog([]);
  };

  const openMenu = (e, bid, canBuild) => {
    e.stopPropagation();
    const wr = wrapRef.current.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ bid, canBuild, wrapW: wr.width, x: r.left + r.width / 2 - wr.left, y: r.top - wr.top, below: r.top - wr.top < 220 ? r.bottom - wr.top : null });
  };

  if (loading) return <div style={{ color: C.textDim, textAlign: 'center', padding: '4rem' }}>Loading drill...</div>;
  if (!build) return <div style={{ color: C.textDim, textAlign: 'center', padding: '4rem' }}>Build order not found.</div>;

  const firstTry = results.filter(r => r.kind === 'play' && r.errors === 0 && !r.revealed).length;
  const allBuilt = [...built, ...stepBuilt.map(b => ({ pending: b }))];
  const farmCount = sumByRes(counts).farm || 0;

  // buildings on the map: anchored ones next to their resource, the rest in the builders' yard
  const mapBuildings = (() => {
    const used = {};
    const yard = {};
    const placed = [];
    allBuilt.forEach((b) => {
      const id = typeof b === 'string' ? b : b.pending;
      const pending = typeof b !== 'string';
      if (id === 'tc' && !pending && (used.tc || 0) === 0) { used.tc = 1; placed.push({ id, pending, x: 66, y: 3, w: 6 }); return; }
      const slots = ANCHORS[id];
      const n = used[id] || 0;
      if (slots && n < slots.length) { used[id] = n + 1; placed.push({ id, pending, ...slots[n], w: 4.6 }); return; }
      yard[id] = yard[id] || { id, n: 0, pending: false };
      yard[id].n += 1; yard[id].pending = yard[id].pending || pending;
    });
    return { placed, yard: Object.values(yard) };
  })();

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '12px 12px 40px', fontFamily: 'Segoe UI, sans-serif', color: C.text }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to={`/academy/build-orders/${buildId}`} style={{ color: C.textDim, textDecoration: 'none', fontSize: 13 }}>← Back</Link>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>Build Drill</div>
            <div style={{ fontSize: 11, color: C.textDim }}>{build.civ} · {build.map} · {build.pop_count} pop · {build.strategy}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.textDim }}>
          <span>✓ {firstTry}/{results.filter(r => r.kind === 'play').length} first try</span>
          <span>Step {Math.min(idx + 1, steps.length)}/{steps.length}</span>
          <button onClick={() => (showHelp ? closeHelp() : setShowHelp(true))} style={{ background: 'transparent', border: `1px solid ${C.borderLt}`, color: C.textDim, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>❔ How to play</button>
        </div>
      </div>

      {/* progress bar */}
      <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(idx / steps.length) * 100}%`, background: C.gold, transition: 'width .4s' }} />
      </div>

      {showHelp && <HowToPlay onClose={closeHelp} />}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div ref={wrapRef} style={{ flex: '1 1 720px', minWidth: 0, position: 'relative' }} onClick={() => setMenu(null)}>
          {/* prompt bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
            {!done && step && (
              <>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.blue, letterSpacing: '.04em' }}>{step.age}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{step.vil != null ? `Pop ${step.vil}` : 'Next'}</span>
                <span style={{ fontSize: 13, color: C.text }}>
                  {step.kind === 'card' ? <span style={{ color: '#86efac' }}>Don't forget</span> : fails >= 2 ? <span style={{ color: '#fde68a' }}>Hint: {plain(step.desc)}</span> : "What's next?"}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {step.kind === 'play' && <Btn onClick={undo} disabled={!history.length} title="Ctrl+Z">↶ Undo</Btn>}
                  {step.kind === 'play' && <Btn onClick={resetStep} disabled={!history.length}>Reset step</Btn>}
                  {step.kind === 'play' && <Btn onClick={reveal} title="Show the answer (counts as a miss)">Reveal</Btn>}
                  <Btn kind="primary" onClick={check} title="Enter">{step.kind === 'card' ? 'Continue' : 'Check'}</Btn>
                </div>
              </>
            )}
            {done && <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>Build complete</span>}
          </div>

          {/* villager spawner */}
          {!done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8, fontSize: 12, color: C.textDim }}>
              <div
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'tc'); setSource('tc'); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); removeToTC(e.dataTransfer.getData('text/plain')); }}
                onClick={() => setSource('tc')}
                title="Drag onto the map, or select and click an area. Drop villagers here to send them back."
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, cursor: 'grab',
                  background: source === 'tc' ? 'rgba(255,215,0,0.12)' : C.card, border: `1px solid ${source === 'tc' ? C.gold : C.border}` }}>
                <Img src={unit === 'ship' ? SHIP_IMG : VIL_IMG} size={28} round={6} />
                <span style={{ fontWeight: 700, color: C.text }}>New {unit === 'ship' ? 'fishing ships' : 'villagers'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setAmount(a => Math.max(1, a - 1))} style={spinBtn}>−</button>
                <span style={{ minWidth: 26, textAlign: 'center', fontSize: 18, fontWeight: 800, color: C.gold }}>{amount}</span>
                <button onClick={() => setAmount(a => Math.min(30, a + 1))} style={spinBtn}>+</button>
              </div>
              {features.water && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {['vil', 'ship'].map(u => (
                    <button key={u} onClick={() => { setUnit(u); setSource('tc'); }} style={{ ...spinBtn, width: 'auto', padding: '0 8px', fontSize: 11, borderColor: unit === u ? C.gold : C.borderLt, color: unit === u ? C.gold : C.textDim }}>
                      {u === 'vil' ? 'Villagers' : 'Fishing ships'}
                    </button>
                  ))}
                </div>
              )}
              <span style={{ fontSize: 11 }}>
                {source === 'tc'
                  ? `Click an area to send ${amount} new ${unit === 'ship' ? 'ship(s)' : 'villager(s)'}.`
                  : <>Moving up to <b style={{ color: C.gold }}>{amount}</b> from <b style={{ color: C.gold }}>{AREAS.find(a => a.id === source)?.label}</b>: click the destination (Esc cancels).</>}
              </span>
            </div>
          )}

          {/* board */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: BOARD_RATIO, borderRadius: 10, overflow: 'hidden', userSelect: 'none',
            border: `2px solid ${feedback ? (feedback.ok ? C.green : C.red) : '#3a3420'}`, transition: 'border-color .2s',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.35)', ...GRASS_BG,
          }}>
            <Terrain water={features.water} chicken={features.chicken} farmCount={farmCount} />

            {/* Town Center */}
            <div onClick={(e) => openMenu(e, 'tc', false)} title="Town Center" className="drill-tc" style={{
              position: 'absolute', left: `${TC_POS.x}%`, top: `${TC_POS.y}%`, width: `${TC_POS.w}%`, aspectRatio: 382 / 225, zIndex: 6, cursor: 'pointer',
              filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.45))',
            }}>
              <img src={bImg('tc')} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>

            {/* built buildings */}
            {mapBuildings.placed.map((b, i) => (
              <div key={i} onClick={(e) => openMenu(e, b.id, false)} title={BUILDINGS[b.id].name} style={{
                position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, aspectRatio: 1, zIndex: 7, cursor: 'pointer',
                borderRadius: 6, overflow: 'hidden', border: `2px ${b.pending ? 'dashed' : 'solid'} ${b.pending ? C.cyan : '#d4b85a'}`,
                boxShadow: '0 3px 6px rgba(0,0,0,0.5)', animation: b.pending ? 'drillPop .25s ease-out' : 'none',
              }}>
                <BIcon id={b.id} />
              </div>
            ))}

            {/* interactive areas */}
            {areas.map(a => {
              const n = counts[a.id] || 0;
              const isWrong = wrongRes.includes(a.res);
              const yard = a.id === 'builder' ? mapBuildings.yard : null;
              return (
                <div key={a.id}
                  onClick={(e) => { e.stopPropagation(); setMenu(null); moveTo(a.id); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); moveTo(a.id, e.dataTransfer.getData('text/plain')); }}
                  className="drill-area"
                  style={{
                    position: 'absolute', left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%`, zIndex: 5, cursor: 'pointer',
                    borderRadius: 10, border: `2px dashed ${isWrong ? C.red : source === a.id ? C.gold : 'transparent'}`,
                    background: isWrong ? 'rgba(255,82,82,0.12)' : 'transparent',
                  }}>
                  <span style={{ position: 'absolute', left: 6, bottom: 3, fontSize: 10, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px #000, 0 0 4px #000', pointerEvents: 'none', whiteSpace: 'nowrap' }}>{a.label}</span>
                  {yard && yard.length > 0 && (
                    <div style={{ position: 'absolute', left: 6, top: 6, right: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {yard.map(b => (
                        <div key={b.id} onClick={(e) => openMenu(e, b.id, false)} title={BUILDINGS[b.id].name} style={{ position: 'relative', cursor: 'pointer' }}>
                          <div style={{ width: 30, height: 30, borderRadius: 5, overflow: 'hidden', border: `2px ${b.pending ? 'dashed' : 'solid'} ${b.pending ? C.cyan : '#d4b85a'}` }}>
                            <BIcon id={b.id} />
                          </div>
                          {b.n > 1 && <span style={{ position: 'absolute', right: -4, bottom: -4, fontSize: 9, fontWeight: 800, background: '#000', color: C.gold, borderRadius: 6, padding: '0 3px' }}>×{b.n}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {n > 0 && (
                    <div
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('text/plain', a.id); setSource(a.id); }}
                      onClick={(e) => { e.stopPropagation(); setSource(s => (s === a.id ? 'tc' : a.id)); }}
                      title="Select to move these, or drag them to another area"
                      style={{
                        position: 'absolute', right: 4, top: a.id === 'woodA' ? '45%' : 4, display: 'flex', alignItems: 'center', gap: 3,
                        padding: '2px 6px 2px 2px', borderRadius: 14, cursor: 'grab', zIndex: 8,
                        background: source === a.id ? C.gold : 'rgba(15,15,20,0.85)', color: source === a.id ? '#1a1300' : '#fff',
                        border: `1px solid ${source === a.id ? C.gold : 'rgba(255,215,0,0.5)'}`, boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                      }}>
                      <Img src={a.unit === 'ship' ? SHIP_IMG : VIL_IMG} size={20} round={10} />
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{n}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* feedback toast */}
            {feedback && (
              <div style={{
                position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', zIndex: 20, maxWidth: '70%',
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center',
                background: feedback.ok ? 'rgba(20,60,30,0.95)' : 'rgba(70,20,20,0.95)', color: feedback.ok ? '#b9f6ca' : '#ffcdd2',
                border: `1px solid ${feedback.ok ? C.green : C.red}`, boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
              }}>
                {feedback.ok ? '✓ ' : ''}{feedback.msgs.map((m, i) => <div key={i}>{m}</div>)}
              </div>
            )}

            {/* reminder popup for steps without villager work (push deer, lure boar...) */}
            {!done && step?.kind === 'card' && !feedback && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 25, background: 'rgba(10,12,16,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#14161c', border: `2px solid ${C.gold}`, borderRadius: 12, padding: '16px 22px', maxWidth: '60%', textAlign: 'center', boxShadow: '0 12px 30px rgba(0,0,0,0.6)', animation: 'drillPop .25s ease-out' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.gold, marginBottom: 10 }}>Don't forget</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
                    {(() => { const ic = iconList(step.icon).map(iconPath).find(Boolean); return ic ? <Img src={ic} size={44} round={8} style={{ border: `1px solid ${C.gold}88` }} /> : null; })()}
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.text, textAlign: 'left' }}>{plain(step.desc)}</span>
                  </div>
                  <Btn kind="primary" onClick={check}>Continue (Enter)</Btn>
                </div>
              </div>
            )}

            {done && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(10,12,16,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>Build complete</div>
                  <div style={{ fontSize: 14, color: C.text, margin: '8px 0 16px' }}>
                    {firstTry}/{playSteps} steps right first time ({playSteps ? Math.round((firstTry / playSteps) * 100) : 0}%)
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <Btn kind="primary" onClick={restart}>Play again</Btn>
                    <Link to={`/academy/build-orders/${buildId}`}><Btn>Back to the build</Btn></Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* this step + building palette */}
          {!done && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 8px', minWidth: 150 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textMute, textTransform: 'uppercase', marginBottom: 4 }}>This step (do every part, then Check)</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', minHeight: 34 }}>
                  {stepBuilt.map((b, i) => (
                    <div key={i} title={`${BUILDINGS[b].name} (click to remove)`} onClick={() => { snapshot(); setStepBuilt(s => s.filter((_, j) => j !== i)); }}
                      style={{ width: 32, height: 32, borderRadius: 5, overflow: 'hidden', border: `2px dashed ${C.cyan}`, cursor: 'pointer' }}>
                      <BIcon id={b} />
                    </div>
                  ))}
                  {stepCmd && (
                    <div title={`${cmdLabel(stepCmd)} (click to remove)`} onClick={() => { snapshot(); setStepCmd(null); }}
                      style={{ width: 32, height: 32, borderRadius: 5, overflow: 'hidden', border: `2px solid ${C.gold}`, cursor: 'pointer' }}>
                      {iconPath(stepCmd) ? <Img src={iconPath(stepCmd)} size="100%" round={0} /> : <span style={{ fontSize: 9 }}>{cmdLabel(stepCmd)}</span>}
                    </div>
                  )}
                  {!stepBuilt.length && !stepCmd && <span style={{ fontSize: 11, color: C.textMute }}>No buildings or research</span>}
                </div>
              </div>
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 8px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textMute, textTransform: 'uppercase', marginBottom: 4 }}>Build or research (click a building)</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {palette.map(id => (
                    <div key={id} onClick={(e) => openMenu(e, id, true)} title={BUILDINGS[id].name} className="drill-tile"
                      style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${menu?.bid === id && menu.canBuild ? C.gold : C.borderLt}` }}>
                      <BIcon id={id} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* building popover */}
          {menu && (
            <div onClick={(e) => e.stopPropagation()} style={{
              position: 'absolute', zIndex: 40, left: Math.max(110, Math.min(menu.x, menu.wrapW - 110)),
              top: menu.below != null ? menu.below + 8 : menu.y - 8, transform: menu.below != null ? 'translateX(-50%)' : 'translate(-50%,-100%)',
              background: '#14161c', border: `1px solid ${C.gold}66`, borderRadius: 10, padding: 10, width: 220, boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 5, overflow: 'hidden' }}><BIcon id={menu.bid} /></div>
                <span style={{ fontWeight: 800, fontSize: 13, color: C.gold }}>{BUILDINGS[menu.bid].name}</span>
              </div>
              {menu.canBuild && (
                <button onClick={() => placeBuilding(menu.bid)} style={{ width: '100%', padding: '6px', borderRadius: 6, border: `1px solid ${C.cyan}`, background: 'rgba(0,200,200,0.12)', color: C.cyan, fontWeight: 800, fontSize: 12, cursor: 'pointer', marginBottom: BUILDINGS[menu.bid].menu.length ? 8 : 0 }}>
                  🔨 Build {BUILDINGS[menu.bid].name}
                </button>
              )}
              {BUILDINGS[menu.bid].menu.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {BUILDINGS[menu.bid].menu.map(k => (
                    <div key={k} onClick={() => chooseCmd(k)} title={cmdLabel(k)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ width: 40, height: 40, margin: '0 auto', borderRadius: 6, overflow: 'hidden', border: `2px solid ${stepCmd === k ? C.gold : C.borderLt}`, background: '#222' }}>
                        {iconPath(k) ? <Img src={iconPath(k)} size="100%" round={0} /> : <span style={{ fontSize: 9 }}>{cmdLabel(k)}</span>}
                      </div>
                      <div style={{ fontSize: 8.5, color: C.textDim, marginTop: 2, lineHeight: 1.1 }}>{cmdLabel(k)}</div>
                    </div>
                  ))}
                </div>
              )}
              {!menu.canBuild && !BUILDINGS[menu.bid].menu.length && <div style={{ fontSize: 11, color: C.textMute }}>Nothing to research here.</div>}
            </div>
          )}
        </div>

        {/* log of completed steps */}
        <div style={{ flex: '0 1 280px', minWidth: 240, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textMute, textTransform: 'uppercase', marginBottom: 6 }}>Your build so far</div>
          <div ref={logRef} style={{ maxHeight: 560, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {log.length === 0 && <div style={{ fontSize: 11, color: C.textMute }}>Completed steps appear here.</div>}
            {log.map((l, i) => {
              const ic = iconList(l.step.icon).map(iconPath).find(Boolean);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '2px 4px', borderRadius: 4, borderLeft: `3px solid ${l.ok ? C.green : l.step.kind === 'card' ? C.borderLt : '#f59e0b'}` }}>
                  <span style={{ width: 20, textAlign: 'right', color: C.gold, fontWeight: 700 }}>{l.step.vil ?? ''}</span>
                  {ic ? <Img src={ic} size={16} round={3} /> : <span style={{ width: 16 }} />}
                  <span style={{ color: C.text }}>{plain(l.step.desc)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drillPop { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        .drill-area:hover { border-color: rgba(255,255,255,0.55) !important; background: rgba(255,255,255,0.06) !important; }
        .drill-tc:hover { filter: drop-shadow(0 0 6px #ffd700) !important; }
        .drill-tile:hover { filter: brightness(1.2); border-color: ${C.gold} !important; }
      `}</style>
    </div>
  );
}

const spinBtn = {
  width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.borderLt}`, background: C.card, color: C.text,
  fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1,
};

const HELP = [
  ['Goal', 'Rebuild the build order from memory, one step at a time. Each step only shows the population: work out what comes next.'],
  ['Villagers', 'Set how many with − and +, then click an area on the map (or drag the "New villagers" card onto it). To move villagers who are already working, click their badge (it turns gold) and then the destination, or drag the badge. Drop a badge on "New villagers" to take them off the map.'],
  ['Builders', 'If villagers stay on a construction (for example "2 vils build Barracks"), send them to Builders.'],
  ['Buildings', 'Click a building in the palette below the map and choose Build. It appears on the map next to its resource.'],
  ['Research, units, age up', 'Click the building that does it (the Town Center on the map, or any building in the palette) and pick the icon.'],
  ['Combined steps', 'Some steps do several things at once. "1 vil builds House, then Mill, then berries" means: Build House + Build Mill + send 1 villager to Berries. Do every part in any order, then press Check. "This step" shows what you have built or chosen so far.'],
  ['Fishing ships', 'Switch to "Fishing ships" and send them to deep water.'],
  ['Checking', 'Check (Enter) validates the step. After two misses you get a hint; Reveal solves the step and counts as a miss. Undo (Ctrl+Z) and Reset step fix mistakes. Steps without villager work (pushing deer, luring the boar) pop up as "Don’t forget" reminders: read them and press Continue.'],
];

const HowToPlay = ({ onClose }) => (
  <div style={{ background: C.card, border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>How to play</span>
      <Btn onClick={onClose}>Got it</Btn>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '6px 18px' }}>
      {HELP.map(([t, d]) => (
        <div key={t} style={{ fontSize: 12, lineHeight: 1.45, color: C.textDim, textAlign: 'left' }}>
          <b style={{ color: C.text }}>{t}.</b> {d}
        </div>
      ))}
    </div>
  </div>
);
