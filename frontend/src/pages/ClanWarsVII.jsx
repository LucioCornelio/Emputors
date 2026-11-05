import { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import DraftPlanCreator from './admin/DraftPlanCreator'; 

const MAP_POOL = ["Colosseum", "Crescent", "Fortress", "Grand Bara", "Nomad", "Socotra", "Tres Leches"].sort();
const CIVS = ["Armenians", "Aztecs", "Bengalis", "Berbers", "Bohemians", "Britons", "Bulgarians", "Burgundians", "Burmese", "Byzantines", "Celts", "Chinese", "Cumans", "Danes", "Dravidians", "Ethiopians", "Franks", "Georgians", "Goths", "Gurjaras", "Hindustanis", "Huns", "Incas", "Italians", "Japanese", "Jurchens", "Khitans", "Khmer", "Koreans", "Lithuanians", "Magyars", "Malay", "Malians", "Mapuche", "Mayans", "Mongols", "Muisca", "Persians", "Poles", "Portuguese", "Romans", "Saracens", "Saxons", "Shu", "Sicilians", "Slavs", "Spanish", "Tatars", "Teutons", "Tupi", "Turks", "Varangians", "Vietnamese", "Vikings", "Wei", "Wu"].sort();

const C = {
  bg: '#161920', card: '#1a1c23', border: '#2a2d36', textMain: '#e0e0e0',
  gold: '#ffd700', cyan: '#00c8c8', red: '#ff6666', green: '#4caf50', blue: '#66b2ff'
};

const DRAFT_PLAN = {
  "Colosseum": {
    "Plan 1: Cobra del desierto": [
      { role: "Flank ArqueroATK", priority: ["Mayans", "Ethiopians", "Shu", "Mongols", "Britons", "Vietnamese", "Koreans"] },
      { role: "Flank HDArchers", priority: ["Japanese", "Malians", "Vikings", "Dravidians", "Celts", "Bulgarians"] },
      { role: "Pocket", priority: ["Persians", "Huns", "Lithuanians", "Franks", "Magyars"] }
    ],
    "Plan 2: Elefante rodante": [
      { role: "Flank ArqueroDef 1", priority: ["Mayans", "Ethiopians", "Shu", "Vietnamese", "Britons", "Koreans", "Incas"] },
      { role: "Flank ArqueroDef 2", priority: ["Mayans", "Ethiopians", "Shu", "Vietnamese", "Britons", "Koreans", "Incas"] },
      { role: "PocketUU", priority: ["Spanish", "Lithuanians", "Burmese", "Berbers", "Turks", "Portuguese", "Burgundians"] }
    ]
  },
  "Crescent": {
    "Plan 1: Hybrid Water": [
      { role: "Flank Water", priority: ["Italians", "Persians", "Japanese", "Dravidians", "Vikings", "Malians"] },
      { role: "Flank Land", priority: ["Britons", "Mayans", "Ethiopians", "Aztecs", "Incas", "Celts"] },
      { role: "Pocket Flex", priority: ["Lithuanians", "Huns", "Franks", "Magyars", "Mongols", "Tatars"] }
    ]
  },
  "Fortress": {
    "Plan 1: Boom & Push": [
      { role: "Flank Defensive", priority: ["Bohemians", "Britons", "Byzantines", "Koreans", "Teutons"] },
      { role: "Flank Fast Imp", priority: ["Turks", "Italians", "Portuguese", "Condottiero", "Spanish"] },
      { role: "Pocket Boom", priority: ["Cumans", "Khmer", "Burgundians", "Slavs", "Bengalis"] }
    ]
  },
  "Grand Bara": {
    "Plan 1: Open Aggro": [
      { role: "Flank Aggro", priority: ["Mongols", "Tatars", "Huns", "Magyars", "Franks", "Lithuanians"] },
      { role: "Flank Archers", priority: ["Britons", "Mayans", "Ethiopians", "Vietnamese", "Koreans", "Incas"] },
      { role: "Pocket Knights", priority: ["Franks", "Lithuanians", "Magyars", "Huns", "Berbers", "Persians"] }
    ]
  },
  "Nomad": {
    "Plan 1: Control de Agua": [
      { role: "Water Control", priority: ["Persians", "Italians", "Malians", "Dravidians", "Japanese", "Vikings", "Koreans"] },
      { role: "FC UU Cav", priority: ["Spanish", "Berbers", "Portuguese", "Turks", "Burgundians", "Franks"] },
      { role: "FC UU Arrow", priority: ["Koreans", "Mongols", "Vietnamese", "Burmese", "Britons", "Mayans"] }
    ]
  },
  "Socotra": {
    "Plan 1: Aggro": [
      { role: "Flank Pure Archers", priority: ["Britons", "Mayans", "Ethiopians", "Vietnamese", "Koreans", "Incas"] },
      { role: "Flank MAA Archer", priority: ["Japanese", "Dravidians", "Vikings", "Malians", "Celts", "Bulgarians"] },
      { role: "Pocket Siege/Meat", priority: ["Slavs", "Bohemians", "Gurjaras", "Celts", "Persians", "Malians"] }
    ]
  },
  "Tres Leches": {
    "Plan 1: Standard": [
      { role: "Flank 1", priority: ["Britons", "Mayans", "Italians", "Persians", "Vietnamese", "Ethiopians"] },
      { role: "Flank 2", priority: ["Franks", "Lithuanians", "Magyars", "Burgundians", "Berbers", "Spanish"] },
      { role: "Pocket", priority: ["Hindustanis", "Gurjaras", "Berbers", "Franks", "Persians", "Huns"] }
    ]
  }
};

function ClanWarsVII() {
  const [activeTab, setActiveTab] = useState('executionDraft');

  // --- ESTADOS: META EXPLORER ---
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetaMap, setSelectedMetaMap] = useState("Fortress");
  const [activeTooltip, setActiveTooltip] = useState(null);
  const containerRef = useRef(null);

  // --- ESTADOS: EXECUTION DRAFT ---
  const [draftMode, setDraftMode] = useState("PA3"); 
  const [selectedExecMaps, setSelectedExecMaps] = useState([]); // Array vacío para inicio limpio
  const [selectedPlans, setSelectedPlans] = useState({}); 

  const [cmId, setCmId] = useState("");
  const [isHost, setIsHost] = useState(true);
  const [roleAssigned, setRoleAssigned] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [liveSocket, setLiveSocket] = useState(null);
  
  const [draft, setDraft] = useState({ picks: [], bans: [], oppPicks: [], snipes: [] });
  const [assigned, setAssigned] = useState({});
  const isHostRef = useRef(isHost);
  const draftBoardRef = useRef(null);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => {
    return () => { if (liveSocket) liveSocket.disconnect(); };
  }, [liveSocket]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.title = 'Clan Wars VII Assistant | Emputors';
    fetch('/db_3v3.json')
      .then(res => res.json())
      .then(data => {
        setDb(data);
        if (data && data.maps) {
            const preferred = ["Fortress", "Tres Leches", "Grand Bara", "Crescent"];
            const defaultMap = preferred.find(m => data.maps[m]) || Object.keys(data.maps)[0];
            if (defaultMap) setSelectedMetaMap(defaultMap);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading db:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const newPlans = { ...selectedPlans };
    let changed = false;
    selectedExecMaps.forEach(map => {
        if (!newPlans[map] && DRAFT_PLAN[map]) {
            newPlans[map] = Object.keys(DRAFT_PLAN[map])[0];
            changed = true;
        }
    });
    if (changed) setSelectedPlans(newPlans);
  }, [selectedExecMaps]);

  // Si cambia el link de Captains Mode, reseteamos el estado de conexión visual
  useEffect(() => {
    setIsConnected(false);
  }, [cmId]);

  // --- LÓGICA: META EXPLORER ---
  const mapData = db?.maps?.[selectedMetaMap];
  const isNomad = selectedMetaMap.toLowerCase() === "nomad" || selectedMetaMap.toLowerCase() === "nómada";
  const totalMatches = mapData ? mapData.total_matches : 0;

  const meta = useMemo(() => {
    if (!mapData) return { topFlanks: [], topPockets: [], topCombos: [], topFlex: [] };
    const civsArray = Object.entries(mapData.civs).map(([name, stats]) => ({ name, ...stats }));
    const combosArray = Object.entries(mapData.combos).map(([name, stats]) => ({ name, ...stats }));
    const getScore = (picks, wins, cdps) => {
      if (picks === 0) return -1;
      const wr = wins / picks;
      if (picks >= 4 && wr < 0.45) return -100 + wins; 
      if (picks > 0 && wins === 0) return -50; 
      return (cdps * wr) + (wins * 0.5);
    };
    return {
      topFlanks: civsArray.filter(c => c.flank_picks > 0 && getScore(c.flank_picks, c.flank_wins, c.cdps_flank) > 0).sort((a, b) => getScore(b.flank_picks, b.flank_wins, b.cdps_flank) - getScore(a.flank_picks, a.flank_wins, a.cdps_flank)).slice(0, 10),
      topPockets: civsArray.filter(c => c.pocket_picks > 0 && getScore(c.pocket_picks, c.pocket_wins, c.cdps_pocket) > 0).sort((a, b) => getScore(b.pocket_picks, b.pocket_wins, b.cdps_pocket) - getScore(a.pocket_picks, a.pocket_wins, a.cdps_pocket)).slice(0, 10),
      topFlex: civsArray.filter(c => c.flex_picks > 0 && getScore(c.flex_picks, c.flex_wins, c.cdps_flex) > 0).sort((a, b) => getScore(b.flex_picks, b.flex_wins, b.cdps_flex) - getScore(a.flex_picks, a.flex_wins, a.cdps_flex)).slice(0, 10),
      topCombos: combosArray.filter(c => c.picks > 1 && (c.wins / c.picks) >= 0.5).sort((a, b) => (b.cdps * (b.wins/b.picks) + b.wins) - (a.cdps * (a.wins/a.picks) + a.wins)).slice(0, 10)
    };
  }, [mapData]);

  const toggleTooltip = (id, e) => {
    e.stopPropagation();
    setActiveTooltip(prev => prev === id ? null : id);
  };

  const getMapImageName = (mapName) => {
    if (mapName === "Tres Leches") return "Tres_leches";
    if (mapName === "Grand Bara") return "Grand_Bara";
    return mapName;
  };

  const getCivImage = (civName) => {
    const specials = { "Danes": "danes.png", "Saxons": "saxons.png", "Varangians": "varangians.png" };
    return specials[civName] ? specials[civName] : `${civName.toLowerCase()}.png`;
  };

  // --- LÓGICA: EXECUTION DRAFT ---
  const requiredMapCount = draftMode === "PA3" ? 3 : 5;
  const isMapSelectionComplete = selectedExecMaps.length === requiredMapCount;
  const canConnect = isMapSelectionComplete && roleAssigned && cmId.trim().length > 0;

  const handleModeChange = (mode) => {
    setDraftMode(mode);
    const count = mode === "PA3" ? 3 : 5;
    if (selectedExecMaps.length > count) {
        setSelectedExecMaps(selectedExecMaps.slice(0, count));
    }
  };

  const toggleExecMap = (map) => {
    setSelectedExecMaps(prev => {
        if (prev.includes(map)) return prev.filter(m => m !== map);
        if (prev.length < requiredMapCount) return [...prev, map];
        return prev;
    });
  };

  const formatCiv = (c) => {
      if (!c) return "";
      const clean = String(c).trim();
      if (clean.toLowerCase().startsWith("hidd")) return "Hidden";
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };
  const isHidden = (c) => c && (c === 'Hidden' || c.toLowerCase().startsWith('hidd'));

  const syncCaptainMode = () => {
    if (!canConnect) return;
    setSyncing(true);
    setIsConnected(false);
    
    try {
      const match = cmId.match(/draft\/([a-zA-Z0-9_-]+)/);
      const cleanId = match ? match[1] : cmId.trim();

      if (liveSocket) liveSocket.disconnect();

      const socket = io('https://aoe2cm.net', { query: { draftId: cleanId }, transports: ['websocket'] });
      
      socket.on('connect', () => {
          setSyncing(false);
          setIsConnected(true);
          
          if (draftBoardRef.current) {
              draftBoardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          const fetchState = () => {
              socket.emit('set_role', { name: "LEAT11_Exec", role: "SPECTATOR" }, (res) => {
                  const data = Array.isArray(res) ? res[0] : res;
                  if (data && data.events) processEvents(data.events);
              });
          };
          fetchState();
          setInterval(fetchState, 3000);
      });

      socket.on('playerEvent', (payload) => {
          setTimeout(() => {
              socket.emit('set_role', { name: "LEAT11_Exec", role: "SPECTATOR" }, (res) => {
                  const data = Array.isArray(res) ? res[0] : res;
                  if (data && data.events) processEvents(data.events);
              });
          }, 500);
      });

      socket.on('disconnect', () => {
          setIsConnected(false);
      });

      socket.on('connect_error', () => {
          setSyncing(false);
          setIsConnected(false);
      });

      setLiveSocket(socket);
    } catch (e) { setSyncing(false); setIsConnected(false); }
  };

  const processEvents = (events) => {
      let temp = { picks: [], bans: [], oppPicks: [], snipes: [] };
      events.forEach(ev => {
          const type = String(ev.actionType || ev.type || "").toLowerCase();
          const player = String(ev.player || ev.executingPlayer || "").toUpperCase();
          const civRaw = formatCiv(ev.chosenOptionId || ev.drafted || ev.civ || ev.optionId || ev.revealedOptionId || "");
          
          if (!civRaw || civRaw === "Hidden" || type === "none") return;
          const isMyAction = (player === "HOST" && isHostRef.current) || (player === "GUEST" && !isHostRef.current);

          if (type === "ban") {
              if (!temp.bans.includes(civRaw)) temp.bans.push(civRaw);
          } else if (type === "pick" || type.includes("reveal")) {
              if (isMyAction) { if (!temp.picks.includes(civRaw)) temp.picks.push(civRaw); }
              else { if (!temp.oppPicks.includes(civRaw)) temp.oppPicks.push(civRaw); }
          } else if (type === "snipe") {
              if (!temp.snipes.includes(civRaw)) temp.snipes.push(civRaw);
          }
      });
      setDraft(temp);
  };

  const getConfirmedCivs = () => Object.values(assigned).filter(civ => !draft.snipes.includes(civ));

  const evaluateRole = (mapName, roleData) => {
      const roleKey = `${mapName}_${roleData.role}`;
      const confirmedCiv = assigned[roleKey];
      const isSniped = draft.snipes.includes(confirmedCiv);

      const confirmedList = getConfirmedCivs();
      const availablePicks = draft.picks.filter(c => !confirmedList.includes(c) && !draft.snipes.includes(c));
      const completelyUnavailable = [...draft.bans, ...draft.oppPicks, ...draft.snipes, ...confirmedList];

      const corePriority = roleData.priority.slice(0, 5);
      const backupPriority = roleData.priority.slice(5);

      const validCoreCandidates = corePriority.filter(c => c === confirmedCiv || !completelyUnavailable.includes(c));
      const urgencyCount = validCoreCandidates.length; 

      let candidates = [];
      let backups = [];
      
      corePriority.forEach(c => {
          if (availablePicks.includes(c)) candidates.push({ civ: c, type: 'SUGGESTED' });
          else if (!completelyUnavailable.includes(c)) candidates.push({ civ: c, type: 'TARGET' });
      });

      backupPriority.forEach(c => {
          if (availablePicks.includes(c)) backups.push({ civ: c, type: 'SUGGESTED' });
          else if (!completelyUnavailable.includes(c)) backups.push({ civ: c, type: 'TARGET' });
      });

      if (confirmedCiv && !isSniped) return { status: 'LOCKED', civ: confirmedCiv, candidates: [], backups: [], urgencyCount };
      if (confirmedCiv && isSniped) return { status: 'SNIPED', civ: confirmedCiv, candidates, backups, urgencyCount };

      if (candidates.length > 0) {
          const mainType = candidates[0].type;
          return { status: mainType, civ: candidates[0].civ, candidates, backups, urgencyCount };
      }

      if (backups.length > 0) {
          const mainType = backups[0].type;
          return { status: mainType, civ: backups[0].civ, candidates: [], backups, urgencyCount: 0 };
      }

      return { status: 'EMPTY', civ: null, candidates: [], backups: [], urgencyCount: 0 };
  };

  const confirmAssignment = (mapName, roleName, civ) => setAssigned(prev => ({ ...prev, [`${mapName}_${roleName}`]: civ }));
  const clearAssignment = (mapName, roleName) => setAssigned(prev => { const next = { ...prev }; delete next[`${mapName}_${roleName}`]; return next; });
  const resetDraft = () => { 
    setDraft({ picks: [], bans: [], oppPicks: [], snipes: [] }); 
    setAssigned({}); 
    setSelectedExecMaps([]); 
    setCmId(""); 
    setIsConnected(false);
    if(liveSocket) liveSocket.disconnect();
  };

  const myColor = isHost ? C.blue : C.gold;
  const oppColor = isHost ? C.gold : C.blue;
  const execMapSlots = Array.from({ length: requiredMapCount });

  if (loading) return <div style={{ color: C.gold, textAlign: 'center', padding: '40px' }}>Loading Data...</div>;

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '0', fontFamily: 'Segoe UI, sans-serif' }}>
      
      <style>{`
        .civ-tooltip {
          position: absolute; top: -5px; z-index: 50;
          background: #14161b; border: 1px solid #444; border-radius: 4px; padding: 2px;
          width: 280px; box-shadow: 0 4px 15px rgba(0,0,0,0.9); max-height: 350px; overflow-y: auto;
          cursor: default; font-weight: normal; text-align: left;
        }
        .civ-tooltip::-webkit-scrollbar { width: 4px; }
        .civ-tooltip::-webkit-scrollbar-track { background: #161920; }
        .civ-tooltip::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
        @keyframes pulseAlertRed {
            0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 6px rgba(255, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
        }
        @keyframes pulseGold {
            0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.8); border-color: #ffd700; }
            50% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0); border-color: #ffd700; }
            100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); border-color: #444; }
        }
        @keyframes pulseCyan {
            0% { box-shadow: 0 0 0 0 rgba(0, 200, 200, 0.8); border-color: #00c8c8; }
            50% { box-shadow: 0 0 0 8px rgba(0, 200, 200, 0); border-color: #00c8c8; }
            100% { box-shadow: 0 0 0 0 rgba(0, 200, 200, 0); border-color: #333; }
        }
        @keyframes pulseGreen {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.8); border-color: #4caf50;}
            70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); border-color: #4caf50;}
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); border-color: #333;}
        }
      `}</style>

      {/* PESTAÑAS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #2a2d36', backgroundColor: '#1e212b', padding: '0 1rem' }}>
        <div onClick={() => setActiveTab('executionDraft')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'executionDraft' ? C.gold : '#888', borderBottom: activeTab === 'executionDraft' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Execution Draft</div>
        <div onClick={() => setActiveTab('metaExplorer')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'metaExplorer' ? C.gold : '#888', borderBottom: activeTab === 'metaExplorer' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Meta Explorer</div>
        <div onClick={() => setActiveTab('planCreator')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'planCreator' ? C.gold : '#888', borderBottom: activeTab === 'planCreator' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Plan Creator</div>
      </div>

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: activeTab === 'executionDraft' ? '50vh' : '20px' }}>

        {/* --- VISTA: EXECUTION DRAFT --- */}
        {activeTab === 'executionDraft' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                
                {/* 1. SELECCIÓN DE MODALIDAD Y MAPAS */}
                <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, flex: '1 1 50%', width: '50%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px', animation: !isMapSelectionComplete ? 'pulseGold 2s infinite' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: C.cyan, fontSize: '11px', margin: 0, textTransform: 'uppercase' }}>1. SELECT MAPS ({selectedExecMaps.length}/{requiredMapCount})</h3>
                        <div style={{ display: 'flex', backgroundColor: '#1e212b', borderRadius: '4px', border: '1px solid #444', overflow: 'hidden' }}>
                            <button onClick={() => handleModeChange('PA3')} style={{ backgroundColor: draftMode === 'PA3' ? C.cyan : 'transparent', color: draftMode === 'PA3' ? '#161920' : '#888', border: 'none', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>PA3</button>
                            <button onClick={() => handleModeChange('BO5')} style={{ backgroundColor: draftMode === 'BO5' ? C.cyan : 'transparent', color: draftMode === 'BO5' ? '#161920' : '#888', border: 'none', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>BO5</button>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {MAP_POOL.filter(m => DRAFT_PLAN[m]).map(map => {
                            const isSel = selectedExecMaps.includes(map);
                            return (
                                <div key={map} onClick={() => toggleExecMap(map)} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', border: `2px solid ${isSel ? C.gold : '#444'}`, cursor: 'pointer', overflow: 'hidden', filter: isSel ? 'brightness(1.1)' : 'grayscale(0.6)' }}>
                                    <img src={`/maps/${getMapImageName(map)}.png`} alt={map} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', color: isSel ? C.gold : '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>{map}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. CONEXIÓN CAPTAINS MODE */}
                <div style={{ backgroundColor: '#1a1c23', padding: '15px', borderRadius: '6px', border: `1px solid ${C.borderMed}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', flex: '1 1 50%', width: '50%', minWidth: 0, animation: (isMapSelectionComplete && !roleAssigned) ? 'pulseCyan 2s infinite' : 'none' }}>
                    <span style={{ color: C.gold, fontSize: '11px', fontWeight: 'bold' }}>2. CAPTAINS MODE SYNC:</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" placeholder="Draft URL or ID..." value={cmId} onChange={(e) => setCmId(e.target.value)} style={{ backgroundColor: '#1e212b', color: '#fff', border: '1px solid #444', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', flex: 1, outline: 'none' }} />
                        
                        {!roleAssigned ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => { setIsHost(true); setRoleAssigned(true); }} style={{ backgroundColor: C.blue, color: '#161920', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>HOST</button>
                            <button onClick={() => { setIsHost(false); setRoleAssigned(true); }} style={{ backgroundColor: C.red, color: '#161920', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>GUEST</button>
                        </div>
                        ) : (
                        <button onClick={() => setRoleAssigned(false)} style={{ backgroundColor: isHost ? C.blue : C.red, color: '#161920', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>ROLE: {isHost ? 'HOST' : 'GUEST'} ✎</button>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button 
                          onClick={syncCaptainMode} 
                          disabled={syncing || !canConnect || isConnected} 
                          style={{ 
                            backgroundColor: (!canConnect || syncing) ? '#555' : (isConnected ? '#14532d' : C.green), 
                            color: isConnected ? '#4caf50' : '#161920', 
                            border: isConnected ? '1px solid #4caf50' : 'none', 
                            padding: '6px 20px', borderRadius: '4px', 
                            cursor: (!canConnect || syncing || isConnected) ? 'not-allowed' : 'pointer', 
                            fontSize: '12px', fontWeight: 'bold', 
                            animation: (canConnect && !syncing && !isConnected) ? 'pulseGreen 1.5s infinite' : 'none' 
                          }}>
                            {syncing ? 'SYNCING...' : isConnected ? '✓ CONNECTED' : '↻ CONNECT'}
                        </button>
                        <button onClick={resetDraft} style={{ backgroundColor: '#cc3333', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
                            ↻ RESET DRAFT
                        </button>
                    </div>
                </div>
            </div>

            {/* DRAFT VISUAL EN VIVO (Ancla para el scroll) */}
            <div ref={draftBoardRef} style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollMarginTop: '20px' }}>
                <div style={{ order: isHost ? 1 : 3, flex: 1, backgroundColor: '#1a1c23', padding: '6px', borderRadius: '6px', borderTop: `3px solid ${myColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ color: myColor, margin: '0 0 4px 0', fontSize: '11px', letterSpacing: '1px' }}>MY PICKS ({isHost ? 'HOST' : 'GUEST'})</h3>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {Array.from({ length: draftMode === 'PA3' ? 9 : 15 }).map((_, i) => {
                            const c = draft.picks[i];
                            if (!c) {
                                return <div key={`empty-my-${i}`} style={{ width: '32px', height: '32px', border: '1px dashed #444', borderRadius: '4px', backgroundColor: '#1e212b' }} />;
                            }
                            const isAssigned = Object.values(assigned).includes(c);
                            const isSniped = draft.snipes.includes(c);

                            return (
                                <div key={`my-${i}`} style={{ position: 'relative', width: '32px', height: '32px', border: `1.5px solid ${myColor}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#1e212b' }}>
                                    {isHidden(c) ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{color: C.gold, fontWeight: 'bold'}}>?</span></div> : <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: (isSniped || isAssigned) ? 0.3 : 1 }} onError={(e) => e.target.style.display='none'} />}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '12px', backgroundColor: 'rgba(0,0,0,0.85)', color: 'white', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{isHidden(c) ? '?' : c.substring(0,4)}</div>
                                    {isSniped && <div style={{position: 'absolute', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center'}}><span style={{color:C.red, fontSize:'24px', fontWeight: '300'}}>✗</span></div>}
                                    {isAssigned && !isSniped && <div style={{position: 'absolute', top:'-2px', right:'0px'}}><span style={{color:C.green, fontSize:'14px', fontWeight: '900', textShadow: '1px 1px 1px #000'}}>✓</span></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ order: 2, backgroundColor: '#161920', padding: '6px', borderRadius: '6px', border: '1px dashed #555', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '220px' }}>
                    <h3 style={{ color: '#888', margin: '0 0 4px 0', fontSize: '11px', letterSpacing: '1px' }}>GLOBAL BANS</h3>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {draft.bans.map((c, i) => (
                            <div key={`ban-${i}`} style={{ position: 'relative', width: '32px', height: '32px', border: '1px solid #555', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#1e212b' }}>
                                <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} onError={(e) => e.target.style.display='none'} />
                                <div style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span style={{color: C.red, fontSize: '24px', fontWeight: '300'}}>✗</span></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ order: isHost ? 3 : 1, flex: 1, backgroundColor: '#1a1c23', padding: '6px', borderRadius: '6px', borderTop: `3px solid ${oppColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ color: oppColor, margin: '0 0 4px 0', fontSize: '11px', letterSpacing: '1px' }}>OPPONENT PICKS ({isHost ? 'GUEST' : 'HOST'})</h3>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {Array.from({ length: draftMode === 'PA3' ? 9 : 15 }).map((_, i) => {
                            const c = draft.oppPicks[i];
                            if (!c) {
                                return <div key={`empty-opp-${i}`} style={{ width: '32px', height: '32px', border: '1px dashed #444', borderRadius: '4px', backgroundColor: '#1e212b' }} />;
                            }
                            return (
                                <div key={`opp-${i}`} style={{ position: 'relative', width: '32px', height: '32px', border: `1.5px solid ${oppColor}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#1e212b' }}>
                                    {isHidden(c) ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{color: C.gold, fontWeight: 'bold'}}>?</span></div> : <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: draft.snipes.includes(c) ? 0.3 : 1 }} onError={(e) => e.target.style.display='none'} />}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '12px', backgroundColor: 'rgba(0,0,0,0.85)', color: 'white', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{isHidden(c) ? '?' : c.substring(0,4)}</div>
                                    {draft.snipes.includes(c) && <div style={{position: 'absolute', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center'}}><span style={{color:C.red, fontSize:'24px', fontWeight: '300'}}>✗</span></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* TABLERO DE EJECUCIÓN (CUADRÍCULA ESTRICTA A 3 COLUMNAS) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {execMapSlots.map((_, i) => {
                        const mapName = selectedExecMaps[i];
                        
                        if (!mapName) {
                            return (
                                <div key={`empty-card-${i}`} style={{ flex: 1, backgroundColor: '#1a1c23', borderRadius: '4px', border: '1px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
                                    <span style={{ color: '#555', fontSize: '11px', fontWeight: 'bold' }}>Waiting for Map Selection...</span>
                                </div>
                            );
                        }

                        const plansAvailable = DRAFT_PLAN[mapName] ? Object.keys(DRAFT_PLAN[mapName]) : [];
                        const activePlanName = selectedPlans[mapName] || plansAvailable[0];
                        const roles = activePlanName ? DRAFT_PLAN[mapName][activePlanName] : null;
                        
                        if (!roles) return null;
                        
                        return (
                            <div key={mapName} style={{ flex: 1, backgroundColor: C.card, borderRadius: '4px', border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1e212b', borderBottom: '1px solid #333' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '8px' }}>
                                        <img src={`/maps/${getMapImageName(mapName)}.png`} alt={mapName} style={{ width: '24px', height: '24px', borderRadius: '3px', border: '1px solid #444', objectFit: 'cover' }} />
                                        <h4 style={{ color: '#fff', margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{mapName}</h4>
                                    </div>
                                    
                                    <div style={{ padding: '0 8px 4px 8px', minHeight: '20px' }}>
                                        {plansAvailable.length > 1 ? (
                                            <select 
                                                value={activePlanName} 
                                                onChange={(e) => setSelectedPlans(prev => ({...prev, [mapName]: e.target.value}))}
                                                style={{ width: '100%', backgroundColor: '#161920', color: C.cyan, border: '1px solid #444', padding: '2px 4px', borderRadius: '3px', fontSize: '9px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                {plansAvailable.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        ) : (
                                            <div style={{ height: '18px' }}></div> 
                                        )}
                                    </div>
                                </div>
                                
                                <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    {roles.map((roleData, idx) => {
                                        const { status, civ, candidates, backups, urgencyCount } = evaluateRole(mapName, roleData);
                                        
                                        let bg = '#161920'; let bd = '#2a2d36'; let actionBtn = null;
                                        let urgencyBadge = <div style={{width:'30px'}}/>;

                                        if (status !== 'LOCKED' && status !== 'SNIPED') {
                                            if (urgencyCount >= 4) {
                                                urgencyBadge = <span style={{fontSize: '9px', color: '#888', fontWeight: 'bold', padding: '1px 3px', backgroundColor: '#2a2d36', borderRadius: '2px'}}>{urgencyCount} LFT</span>;
                                            } else if (urgencyCount === 3) {
                                                urgencyBadge = <span style={{fontSize: '9px', color: '#ffd700', fontWeight: 'bold', padding: '1px 3px', backgroundColor: 'rgba(255,215,0,0.1)', border: '1px solid #ffd700', borderRadius: '2px'}}>3 LFT</span>;
                                            } else if (urgencyCount === 2) {
                                                urgencyBadge = <span style={{fontSize: '9px', color: '#ff9800', fontWeight: 'bold', padding: '1px 3px', backgroundColor: 'rgba(255,152,0,0.1)', border: '1px solid #ff9800', borderRadius: '2px'}}>2 LFT</span>;
                                            } else if (urgencyCount === 1) {
                                                urgencyBadge = <span style={{fontSize: '9px', color: '#ff4444', fontWeight: 'bold', padding: '1px 3px', backgroundColor: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444', borderRadius: '2px', animation: 'pulseAlertRed 1.5s infinite'}}>1 LFT</span>;
                                            } else {
                                                urgencyBadge = <span style={{fontSize: '9px', color: '#888', fontWeight: 'bold', padding: '1px 3px', backgroundColor: '#333', borderRadius: '2px'}}>DEAD</span>;
                                            }
                                        }

                                        if (status === 'TARGET') { bd = '#555'; }
                                        else if (status === 'SUGGESTED') {
                                            bg = 'rgba(102, 178, 255, 0.1)'; bd = C.blue; 
                                            actionBtn = <button onClick={() => confirmAssignment(mapName, roleData.role, civ)} style={{ width: '100%', backgroundColor: C.blue, color: '#161920', border: 'none', padding: '3px 0', borderRadius: '2px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>✓</button>;
                                        } else if (status === 'LOCKED') {
                                            bg = 'rgba(76, 175, 80, 0.1)'; bd = C.green;
                                            actionBtn = <button onClick={() => clearAssignment(mapName, roleData.role)} style={{ width: '100%', backgroundColor: 'transparent', color: '#888', border: '1px solid #555', padding: '2px 0', borderRadius: '2px', fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>UNDO</button>;
                                        } else if (status === 'SNIPED') {
                                            bg = 'rgba(255, 68, 68, 0.1)'; bd = C.red;
                                            actionBtn = <button onClick={() => clearAssignment(mapName, roleData.role)} style={{ width: '100%', backgroundColor: C.red, color: '#161920', border: 'none', padding: '3px 0', borderRadius: '2px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>CLEAR</button>;
                                        }

                                        return (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', backgroundColor: bg, border: `1px solid ${bd}`, borderRadius: '4px', overflow: 'hidden' }}>
                                                
                                                {/* Cuadrícula Estricta blindada contra anchos variables */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 95px) 36px minmax(0, 1fr) 40px', gap: '6px', alignItems: 'center', padding: '4px 6px', minHeight: '34px' }}>
                                                    <div style={{ fontSize: '10.5px', color: '#e0e0e0', fontWeight: 'bold', lineHeight: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={roleData.role}>
                                                        {roleData.role}
                                                    </div>
                                                    
                                                    {/* El hueco de la urgencia ahora siempre tiene contenido para no romper la simetría */}
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        {status === 'LOCKED' ? (
                                                            <span style={{fontSize: '12px', color: C.green, fontWeight: '900'}}>✓</span>
                                                        ) : status === 'SNIPED' ? (
                                                            <span style={{fontSize: '12px', color: C.red, fontWeight: '900'}}>✗</span>
                                                        ) : (
                                                            urgencyBadge
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                                        {civ ? (
                                                            <>
                                                                <img src={`/civs/${getCivImage(civ)}`} alt={civ} style={{ width: '22px', height: '22px', borderRadius: '3px', border: `1px solid ${bd}`, objectFit: 'cover', flexShrink: 0, opacity: status === 'SNIPED' ? 0.3 : 1 }} onError={(e) => e.target.style.display='none'} />
                                                                <span style={{ fontSize: '12px', color: status === 'SNIPED' ? C.red : '#fff', fontWeight: 'bold', textDecoration: status === 'SNIPED' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{civ}</span>
                                                            </>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>-</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div>{actionBtn}</div>
                                                </div>

                                                {(candidates?.length > 1 || backups?.length > 0) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', backgroundColor: 'rgba(0,0,0,0.2)', borderTop: `1px solid ${bd}55`, flexWrap: 'wrap' }}>
                                                        {candidates?.length > 1 && <span style={{ fontSize: '8px', color: '#666', fontWeight: 'bold' }}>NEXT:</span>}
                                                        {candidates?.slice(1, 4).map((cand, ci) => (
                                                            <div 
                                                                key={`cand-${ci}`} 
                                                                onClick={() => confirmAssignment(mapName, roleData.role, cand.civ)}
                                                                title={`Asignar ${cand.civ} a ${roleData.role}`}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: cand.type === 'TARGET' ? 0.5 : 1, cursor: 'pointer', transition: 'transform 0.1s' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            >
                                                                <img src={`/civs/${getCivImage(cand.civ)}`} alt={cand.civ} style={{ width: '13px', height: '13px', borderRadius: '2px' }} onError={(e) => e.target.style.display='none'} />
                                                                <span style={{ fontSize: '9px', color: cand.type === 'SUGGESTED' ? C.blue : '#888', fontWeight: cand.type === 'SUGGESTED' ? 'bold' : 'normal' }}>{cand.civ.substring(0,3).toUpperCase()}</span>
                                                            </div>
                                                        ))}
                                                        
                                                        {backups?.length > 0 && (
                                                            <>
                                                                {candidates?.length > 1 && <span style={{ color: '#444', fontSize: '9px', margin: '0 2px' }}>|</span>}
                                                                <span style={{ fontSize: '8px', color: '#666', fontWeight: 'bold' }}>BACKUPS:</span>
                                                                {backups.map((cand, ci) => (
                                                                    <div 
                                                                        key={`back-${ci}`} 
                                                                        onClick={() => confirmAssignment(mapName, roleData.role, cand.civ)}
                                                                        title={`Asignar ${cand.civ} a ${roleData.role}`}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: cand.type === 'TARGET' ? 0.4 : 0.8, cursor: 'pointer', transition: 'transform 0.1s' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                    >
                                                                        <img src={`/civs/${getCivImage(cand.civ)}`} alt={cand.civ} style={{ width: '13px', height: '13px', borderRadius: '2px' }} onError={(e) => e.target.style.display='none'} />
                                                                        <span style={{ fontSize: '9px', color: cand.type === 'SUGGESTED' ? C.blue : '#666', fontWeight: cand.type === 'SUGGESTED' ? 'bold' : 'normal' }}>{cand.civ.substring(0,3).toUpperCase()}</span>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {(() => {
                                        const unassignedPicks = draft.picks.filter(c => !getConfirmedCivs().includes(c) && !draft.snipes.includes(c));
                                        const backupCivs = unassignedPicks.filter(c => {
                                            return roles.some(r => r.priority.includes(c));
                                        });

                                        if (backupCivs.length === 0) return null;
                                        
                                        return (
                                            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px dashed #333' }}>
                                                <span style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>AVAILABLE BENCH (FITS MAP)</span>
                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                    {backupCivs.map(c => (
                                                        <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '1px 3px', backgroundColor: 'rgba(102, 178, 255, 0.1)', border: `1px solid ${C.blue}55`, borderRadius: '2px' }}>
                                                            <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '10px', height: '10px', borderRadius: '1px' }} onError={(e) => e.target.style.display='none'} />
                                                            <span style={{ fontSize: '8px', color: C.blue, fontWeight: 'bold' }}>{c.substring(0,4)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        )}

        {/* --- VISTA: META EXPLORER --- */}
        {activeTab === 'metaExplorer' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <div style={{ filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.6))' }}>
                    <img 
                        src={`/maps/${getMapImageName(selectedMetaMap)}.png`} 
                        alt={selectedMetaMap}
                        style={{ maxWidth: '400px', maxHeight: '250px', width: 'auto', height: 'auto', display: 'block' }}
                        onError={(e) => { e.target.src = 'https://liquipedia.net/commons/images/a/a2/Aoe2_random_map.png'; }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: C.card, padding: '8px 25px', borderRadius: '50px', border: `1px solid ${C.border}`, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Map:</span>
                        <select value={selectedMetaMap} onChange={(e) => setSelectedMetaMap(e.target.value)} style={{ backgroundColor: 'transparent', color: C.gold, border: 'none', fontSize: '16px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}>
                            {MAP_POOL.map(m => <option key={m} value={m} disabled={!db?.maps?.[m]}>{m}</option>)}
                        </select>
                    </div>
                    <div style={{ width: '1px', height: '20px', backgroundColor: '#333' }}></div>
                    <div style={{ color: '#a0aab5', fontSize: '12px', fontWeight: 'bold' }}>
                        Sample: <span style={{ color: totalMatches < 20 ? C.red : C.gold, marginLeft: '4px' }}>{totalMatches} Matches</span>
                    </div>
                </div>

                {!mapData ? (
                    <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Faltan datos de Liquipedia.</div>
                ) : (
                    <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', width: '100%', marginTop: '10px' }}>
                        
                        <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '12px' }}>
                            <h3 style={{ color: '#a0aab5', margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase' }}>Top 10 {isNomad ? 'Flex' : 'Flanks'}</h3>
                            <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th style={{padding:'4px'}}>Civ</th><th style={{padding:'4px'}}>Picks</th><th style={{padding:'4px'}}>WR</th><th style={{padding:'4px'}}>CDPS</th></tr></thead>
                                <tbody>
                                    {(isNomad ? meta.topFlex : meta.topFlanks).map((c, i) => {
                                        const picks = isNomad ? c.flex_picks : c.flank_picks;
                                        const wins = isNomad ? c.flex_wins : c.flank_wins;
                                        const tooltipId = `flank-${c.name}`;
                                        return (
                                            <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                                                <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff', position: 'relative', cursor: 'pointer' }} onClick={(e) => toggleTooltip(tooltipId, e)}>
                                                    <span style={{ borderBottom: '1px dashed #66b2ff' }}>{c.name}</span>
                                                    {activeTooltip === tooltipId && (
                                                        <div className="civ-tooltip" style={{ left: '105%' }} onClick={e => e.stopPropagation()}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '4px 6px', marginBottom: '2px', backgroundColor: '#1a1c23' }}>
                                                                <span style={{color:C.gold, fontSize:'10px', fontWeight:'bold'}}>MATCHES</span>
                                                                <span onClick={(e) => toggleTooltip(tooltipId, e)} style={{cursor: 'pointer', color: '#ff4444', fontWeight: 'bold', fontSize: '14px', lineHeight: '10px'}}>✕</span>
                                                            </div>
                                                            {c.history.length === 0 ? <div style={{color:'#888', fontSize:'9px', padding: '6px'}}>No records</div> : 
                                                                c.history.map((h, idx) => (
                                                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '4px 6px', backgroundColor: idx % 2 === 0 ? '#1a1c23' : 'transparent', borderLeft: `3px solid ${h.won ? C.green : C.red}`}}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                            <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>
                                                                                <span style={{color: h.won ? C.green : C.red, marginRight: '4px'}}>{h.won ? 'W' : 'L'}</span>
                                                                                {h.date} {h.game && <span style={{color:C.cyan, marginLeft:'2px'}}>{h.game}</span>}
                                                                            </span>
                                                                            {h.vod_url && <a href={h.vod_url} target="_blank" rel="noopener noreferrer" style={{color:'#ff4444', fontSize:'8px', textDecoration:'none', fontWeight:'bold', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px'}}>▶ VOD</a>}
                                                                        </div>
                                                                        <div style={{ fontSize: '9.5px', lineHeight: '1.25' }}>
                                                                            <span style={{color:'#555'}}>w/</span> <span style={{ color: '#9abfe6' }}>{h.allies}</span><br/>
                                                                            <span style={{color:'#555'}}>vs</span> <span style={{ color: '#ff8888' }}>{h.opponents}</span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '6px 4px', color: '#aaa' }}>{picks}</td>
                                                <td style={{ padding: '6px 4px', color: (wins/picks) >= 0.5 ? C.green : C.red }}>{((wins/picks)*100).toFixed(0)}%</td>
                                                <td style={{ padding: '6px 4px', color: C.gold, fontWeight: 'bold' }}>{isNomad ? c.cdps_flex : c.cdps_flank}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {!isNomad && (
                            <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '12px' }}>
                                <h3 style={{ color: '#a0aab5', margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase' }}>Top 10 Pockets</h3>
                                <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th style={{padding:'4px'}}>Civ</th><th style={{padding:'4px'}}>Picks</th><th style={{padding:'4px'}}>WR</th><th style={{padding:'4px'}}>CDPS</th></tr></thead>
                                    <tbody>
                                        {meta.topPockets.map((c, i) => {
                                            const tooltipId = `pocket-${c.name}`;
                                            return (
                                                <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                                                    <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff', position: 'relative', cursor: 'pointer' }} onClick={(e) => toggleTooltip(tooltipId, e)}>
                                                        <span style={{ borderBottom: '1px dashed #66b2ff' }}>{c.name}</span>
                                                        {activeTooltip === tooltipId && (
                                                            <div className="civ-tooltip" style={{ left: '105%' }} onClick={e => e.stopPropagation()}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '4px 6px', marginBottom: '2px', backgroundColor: '#1a1c23' }}>
                                                                    <span style={{color:C.gold, fontSize:'10px', fontWeight:'bold'}}>MATCHES</span>
                                                                    <span onClick={(e) => toggleTooltip(tooltipId, e)} style={{cursor: 'pointer', color: '#ff4444', fontWeight: 'bold', fontSize: '14px', lineHeight: '10px'}}>✕</span>
                                                                </div>
                                                                {c.history.length === 0 ? <div style={{color:'#888', fontSize:'9px', padding: '6px'}}>No records</div> : 
                                                                    c.history.map((h, idx) => (
                                                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '4px 6px', backgroundColor: idx % 2 === 0 ? '#1a1c23' : 'transparent', borderLeft: `3px solid ${h.won ? C.green : C.red}`}}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                                <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>
                                                                                    <span style={{color: h.won ? C.green : C.red, marginRight: '4px'}}>{h.won ? 'W' : 'L'}</span>
                                                                                    {h.date} {h.game && <span style={{color:C.cyan, marginLeft:'2px'}}>{h.game}</span>}
                                                                                </span>
                                                                                {h.vod_url && <a href={h.vod_url} target="_blank" rel="noopener noreferrer" style={{color:'#ff4444', fontSize:'8px', textDecoration:'none', fontWeight:'bold', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px'}}>▶ VOD</a>}
                                                                            </div>
                                                                            <div style={{ fontSize: '9.5px', lineHeight: '1.25' }}>
                                                                                <span style={{color:'#555'}}>w/</span> <span style={{ color: '#9abfe6' }}>{h.allies}</span><br/>
                                                                                <span style={{color:'#555'}}>vs</span> <span style={{ color: '#ff8888' }}>{h.opponents}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '6px 4px', color: '#aaa' }}>{c.pocket_picks}</td>
                                                    <td style={{ padding: '6px 4px', color: (c.pocket_wins/c.pocket_picks) >= 0.5 ? C.green : C.red }}>{((c.pocket_wins/c.pocket_picks)*100).toFixed(0)}%</td>
                                                    <td style={{ padding: '6px 4px', color: C.gold, fontWeight: 'bold' }}>{c.cdps_pocket}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ backgroundColor: C.card, borderRadius: '6px', border: `1px solid ${C.border}`, padding: '12px', gridColumn: isNomad ? 'span 2' : 'span 1' }}>
                            <h3 style={{ color: '#a0aab5', margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase' }}>Top 10 Synergies</h3>
                            <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}><th style={{padding:'4px'}}>Composition</th><th style={{padding:'4px'}}>Picks</th><th style={{padding:'4px'}}>WR</th><th style={{padding:'4px'}}>CDPS</th></tr></thead>
                                <tbody>
                                    {meta.topCombos.map((c, i) => {
                                        const tooltipId = `combo-${c.name}`;
                                        return (
                                            <tr key={c.name} style={{ borderBottom: '1px solid #2a2d36', backgroundColor: i%2===0?'#1e212b':'transparent' }}>
                                                <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#66b2ff', position: 'relative', cursor: 'pointer' }} onClick={(e) => toggleTooltip(tooltipId, e)}>
                                                    <span style={{ borderBottom: '1px dashed #66b2ff' }}>{c.name}</span>
                                                    {activeTooltip === tooltipId && (
                                                        <div className="civ-tooltip" style={{ right: '105%', left: 'auto' }} onClick={e => e.stopPropagation()}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '4px 6px', marginBottom: '2px', backgroundColor: '#1a1c23' }}>
                                                                <span style={{color:C.gold, fontSize:'10px', fontWeight:'bold'}}>COMBO MATCHES</span>
                                                                <span onClick={(e) => toggleTooltip(tooltipId, e)} style={{cursor: 'pointer', color: '#ff4444', fontWeight: 'bold', fontSize: '14px', lineHeight: '10px'}}>✕</span>
                                                            </div>
                                                            {c.history.length === 0 ? <div style={{color:'#888', fontSize:'9px', padding: '6px'}}>No records</div> : 
                                                                c.history.map((h, idx) => (
                                                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '4px 6px', backgroundColor: idx % 2 === 0 ? '#1a1c23' : 'transparent', borderLeft: `3px solid ${h.won ? C.green : C.red}`}}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                            <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>
                                                                                <span style={{color: h.won ? C.green : C.red, marginRight: '4px'}}>{h.won ? 'W' : 'L'}</span>
                                                                                {h.date} {h.game && <span style={{color:C.cyan, marginLeft:'2px'}}>{h.game}</span>}
                                                                            </span>
                                                                            {h.vod_url && <a href={h.vod_url} target="_blank" rel="noopener noreferrer" style={{color:'#ff4444', fontSize:'8px', textDecoration:'none', fontWeight:'bold', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px'}}>▶ VOD</a>}
                                                                        </div>
                                                                        <div style={{ fontSize: '9.5px', lineHeight: '1.25' }}>
                                                                            <span style={{color:'#555'}}>vs</span> <span style={{ color: '#ff8888' }}>{h.opponents}</span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '6px 4px', color: '#aaa' }}>{c.picks}</td>
                                                <td style={{ padding: '6px 4px', color: (c.wins/c.picks) >= 0.5 ? C.green : C.red }}>{((c.wins/c.picks)*100).toFixed(0)}%</td>
                                                <td style={{ padding: '6px 4px', color: C.gold, fontWeight: 'bold' }}>{c.cdps}</td>
                                            </tr>
                                        )
                                    })}
                                    {meta.topCombos.length === 0 && <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#555' }}>No hay composiciones repetidas.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- VISTA: PLAN CREATOR --- */}
        {activeTab === 'planCreator' && (
            <div style={{ margin: '-20px' }}>
                <DraftPlanCreator />
            </div>
        )}
      </div>
    </div>
  );
}

export default ClanWarsVII;