import { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { supabase } from '../supabaseClient';
import DraftPlanCreator from './admin/DraftPlanCreator';
import RivalScouting from './cw7/RivalScouting';
import { buildRivalModel, rivalPicksInWindow, pickRisk, riskLabel, preferenceRatio } from './cw7/forecast';

const MAP_POOL = ["Colosseum", "Crescent", "Fortress", "Grand Bara", "Nomad", "Socotra", "Tres Leches"].sort();
const CIVS = ["Armenians", "Aztecs", "Bengalis", "Berbers", "Bohemians", "Britons", "Bulgarians", "Burgundians", "Burmese", "Byzantines", "Celts", "Chinese", "Cumans", "Danes", "Dravidians", "Ethiopians", "Franks", "Georgians", "Goths", "Gurjaras", "Hindustanis", "Huns", "Incas", "Italians", "Japanese", "Jurchens", "Khitans", "Khmer", "Koreans", "Lithuanians", "Magyars", "Malay", "Malians", "Mapuche", "Mayans", "Mongols", "Muisca", "Persians", "Poles", "Portuguese", "Romans", "Saracens", "Saxons", "Shu", "Sicilians", "Slavs", "Spanish", "Tatars", "Teutons", "Tupi", "Turks", "Varangians", "Vietnamese", "Vikings", "Wei", "Wu"].sort();

const C = {
  bg: '#161920', card: '#1a1c23', border: '#2a2d36', textMain: '#e0e0e0',
  gold: '#ffd700', cyan: '#00c8c8', red: '#ff6666', green: '#4caf50', blue: '#66b2ff'
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

function ClanWarsVII() {
  const [activeTab, setActiveTab] = useState('executionDraft');

  // Access: plans and scouting are readable by clan members only (RLS). 'anon' | 'member' | 'other'
  const [access, setAccess] = useState(null);
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setAccess('anon'); return; }
      const { data: role } = await supabase.rpc('current_clan_role');
      setAccess(role === 'admin' || role === 'member' ? 'member' : 'other');
    };
    checkAccess();
  }, []);

  // --- STATE: META EXPLORER ---
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetaMap, setSelectedMetaMap] = useState("Fortress");
  const [activeTooltip, setActiveTooltip] = useState(null);
  const containerRef = useRef(null);

  // --- STATE: EXECUTION DRAFT ---
  const [draftMode, setDraftMode] = useState("PA3"); 
  const [selectedExecMaps, setSelectedExecMaps] = useState([]); 
  const [draftPlans, setDraftPlans] = useState({}); 
  const [selectedPlans, setSelectedPlans] = useState({}); 

  const [cmId, setCmId] = useState("");
  const [isHost, setIsHost] = useState(true);
  const [roleAssigned, setRoleAssigned] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [liveSocket, setLiveSocket] = useState(null);
  
  const [draft, setDraft] = useState({ picks: [], oppPicks: [], oppShared: [], bans: [], ourBans: [], snipedMine: [], snipedTheirs: [], bansByMe: [], bansByOpp: [], bansByAdmin: [] });
  const [assigned, setAssigned] = useState({});
  const [essentialOverrides, setEssentialOverrides] = useState({});
  const [syncMessage, setSyncMessage] = useState("");
  const [isReplay, setIsReplay] = useState(false);
  const pollRef = useRef(null);

  // --- STATE: RIVAL FORECAST ---
  const [rivalDrafts, setRivalDrafts] = useState([]);
  const [rivalProfiles, setRivalProfiles] = useState([]);
  const [selectedRival, setSelectedRival] = useState("");
  const [draftTurns, setDraftTurns] = useState([]);
  const [eventCount, setEventCount] = useState(0);
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

  // Initial load: meta (JSON) and plans (Supabase)
  useEffect(() => {
    document.title = 'Clan Wars VII Assistant | Emputors';
    
    const fetchData = async () => {
      try {
        const res = await fetch('/db_3v3.json');
        const data = await res.json();
        setDb(data);
        if (data && data.maps) {
            const preferred = ["Fortress", "Tres Leches", "Grand Bara", "Crescent"];
            const defaultMap = preferred.find(m => data.maps[m]) || Object.keys(data.maps)[0];
            if (defaultMap) setSelectedMetaMap(defaultMap);
        }
      } catch (err) { console.error("Error loading db_3v3:", err); }

      const { data: planData, error: planError } = await supabase.from('cw7_draft_plans').select('*');
      if (planData) {
        const formatted = {};
        planData.forEach(row => {
          if (!formatted[row.map_name]) formatted[row.map_name] = {};
          formatted[row.map_name][row.plan_name] = row.roles;
        });
        setDraftPlans(formatted);
      } else if (planError) {
        console.error("Error loading plans:", planError);
      }

      const { data: rivalData } = await supabase.from('cw7_rival_drafts').select('*').order('created_at', { ascending: false });
      if (rivalData) setRivalDrafts(rivalData);
      const { data: profileData } = await supabase.from('cw7_rival_profiles').select('*');
      if (profileData) setRivalProfiles(profileData);

      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const newPlans = { ...selectedPlans };
    let changed = false;
    selectedExecMaps.forEach(map => {
        if (!newPlans[map] && draftPlans[map]) {
            newPlans[map] = Object.keys(draftPlans[map])[0];
            changed = true;
        }
    });
    if (changed) setSelectedPlans(newPlans);
  }, [selectedExecMaps, draftPlans]);

  useEffect(() => {
    setIsConnected(false);
  }, [cmId]);

  // --- LOGIC: META EXPLORER ---
  const mapData = db?.maps?.[selectedMetaMap];
  const isNomad = selectedMetaMap.toLowerCase() === "nomad";
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

  // --- LOGIC: EXECUTION DRAFT ---
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
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setIsReplay(false);
      setSyncMessage("");
      let replayLoaded = false;

      const socket = io('https://aoe2cm.net', { query: { draftId: cleanId }, transports: ['websocket'] });
      
      socket.on('connect', () => {
          setSyncing(false);
          setIsConnected(true);
          
          if (draftBoardRef.current) {
              draftBoardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          const fetchState = () => {
              socket.emit('set_role', { name: "Emputors_CW7", role: "SPECTATOR" }, (res) => {
                  const data = Array.isArray(res) ? res[0] : res;
                  applyDraftState(data);
              });
          };
          fetchState();
          pollRef.current = setInterval(fetchState, 3000);
      });

      // Finished drafts are not live: the server sends the whole draft once as a 'replay' and disconnects
      socket.on('replay', (data) => {
          replayLoaded = true;
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          applyDraftState(data);
          setSyncing(false);
          setIsConnected(true);
          setIsReplay(true);
          setSyncMessage("Finished draft loaded");
      });

      socket.on('message', (msg) => {
          if (typeof msg === 'string') setSyncMessage(msg);
      });

      socket.on('playerEvent', () => {
          setTimeout(() => {
              socket.emit('set_role', { name: "Emputors_CW7", role: "SPECTATOR" }, (res) => {
                  const data = Array.isArray(res) ? res[0] : res;
                  applyDraftState(data);
              });
          }, 500);
      });

      socket.on('disconnect', () => {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          if (!replayLoaded) setIsConnected(false);
      });
      socket.on('connect_error', () => { setSyncing(false); setIsConnected(false); });

      setLiveSocket(socket);
    } catch { setSyncing(false); setIsConnected(false); }
  };

  /*
    Draft state, kept PER SIDE:
    - picks / oppPicks: rosters ("Hidden" holds the slot of a hidden pick until it is revealed)
    - oppShared: rival picks made in NON-EXCLUSIVE turns (they do not take the civ away from us)
    - bans: global or rival bans (unavailable for us); ourBans: our own non-global bans (unavailable only for the rival)
    - snipedMine: our civs sniped by the rival; snipedTheirs: rival civs sniped by us
    A ban on a civ that is already in the other side's roster is a snipe.
  */
  const processEvents = (events, turns = []) => {
      const temp = { picks: [], oppPicks: [], oppShared: [], bans: [], ourBans: [], snipedMine: [], snipedTheirs: [], bansByMe: [], bansByOpp: [], bansByAdmin: [] };
      const add = (arr, c) => { if (!arr.includes(c)) arr.push(c); };
      const sideOf = (player) => player === "HOST" ? (isHostRef.current ? 'me' : 'opp') : player === "GUEST" ? (isHostRef.current ? 'opp' : 'me') : null;

      events.forEach((ev, i) => {
          const type = String(ev.actionType || ev.type || "").toLowerCase();
          const player = String(ev.player || ev.executingPlayer || "").toUpperCase();
          const civ = formatCiv(ev.chosenOptionId || ev.drafted || ev.civ || ev.optionId || ev.revealedOptionId || "");
          if (!civ || type === "none") return;
          const who = sideOf(player);
          const turn = turns[i] || {};
          const exclusivity = String(turn.exclusivity || "").toUpperCase();
          const turnAction = String(turn.action || "").toUpperCase();

          if (type === "pick" || type.includes("reveal")) {
              const roster = who === 'me' ? temp.picks : who === 'opp' ? temp.oppPicks : null;
              if (civ === "Hidden") { if (roster) roster.push("Hidden"); return; }
              if (roster) {
                  const h = roster.indexOf("Hidden");
                  if (h !== -1) roster[h] = civ; else add(roster, civ);
              } else {
                  // Reveal without a player: fill the first hidden slot
                  const h1 = temp.picks.indexOf("Hidden"), h2 = temp.oppPicks.indexOf("Hidden");
                  if (h1 !== -1) temp.picks[h1] = civ; else if (h2 !== -1) temp.oppPicks[h2] = civ;
              }
              if (who === 'opp' && exclusivity === 'NONEXCLUSIVE') add(temp.oppShared, civ);
          } else if (type === "snipe" || turnAction === "SNIPE") {
              if (civ === "Hidden") return;
              if (who === 'me') add(temp.snipedTheirs, civ); else if (who === 'opp') add(temp.snipedMine, civ);
          } else if (type === "ban") {
              if (civ === "Hidden") return;
              if (who === 'me' && temp.oppPicks.includes(civ)) add(temp.snipedTheirs, civ);
              else if (who === 'opp' && temp.picks.includes(civ)) add(temp.snipedMine, civ);
              else if (who === 'me' && exclusivity && exclusivity !== 'GLOBAL') { add(temp.ourBans, civ); add(temp.bansByMe, civ); }
              else {
                  add(temp.bans, civ);
                  add(who === 'me' ? temp.bansByMe : who === 'opp' ? temp.bansByOpp : temp.bansByAdmin, civ);
              }
          }
      });
      setDraft(temp);
  };

  const realPicks = draft.picks.filter(c => !isHidden(c));
  const oppExclusive = draft.oppPicks.filter(c => !isHidden(c) && !draft.oppShared.includes(c));

  // Reload plans after they are saved in Plan Creator (no F5 needed)
  const refreshPlans = async () => {
      const { data } = await supabase.from('cw7_draft_plans').select('*');
      if (!data) return;
      const formatted = {};
      data.forEach(row => {
          if (!formatted[row.map_name]) formatted[row.map_name] = {};
          formatted[row.map_name][row.plan_name] = row.roles;
      });
      setDraftPlans(formatted);
  };

  const refreshRivalDrafts = async () => {
      const { data } = await supabase.from('cw7_rival_drafts').select('*').order('created_at', { ascending: false });
      if (data) setRivalDrafts(data);
  };

  const refreshRivalProfiles = async () => {
      const { data } = await supabase.from('cw7_rival_profiles').select('*');
      if (data) setRivalProfiles(data);
  };

  const applyDraftState = (data) => {
      if (!data || !data.events) return;
      const turns = (data.preset && Array.isArray(data.preset.turns)) ? data.preset.turns : draftTurns;
      processEvents(data.events, turns);
      if (data.preset && Array.isArray(data.preset.turns)) setDraftTurns(data.preset.turns);
      setEventCount(data.events.length);
  };

  const getConfirmedCivs = () => Object.values(assigned).filter(civ => !draft.snipedMine.includes(civ));

  const evaluateRole = (mapName, roleData) => {
      const roleKey = `${mapName}_${roleData.role}`;
      const confirmedCiv = assigned[roleKey];
      const isSniped = draft.snipedMine.includes(confirmedCiv);

      const confirmedList = getConfirmedCivs();
      const availablePicks = realPicks.filter(c => !confirmedList.includes(c) && !draft.snipedMine.includes(c));
      const completelyUnavailable = [...draft.bans, ...oppExclusive, ...draft.snipedMine, ...confirmedList];

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

      if (candidates.length > 0) return { status: candidates[0].type, civ: candidates[0].civ, candidates, backups, urgencyCount };
      if (backups.length > 0) return { status: backups[0].type, civ: backups[0].civ, candidates: [], backups, urgencyCount: 0 };

      return { status: 'EMPTY', civ: null, candidates: [], backups: [], urgencyCount: 0 };
  };

  // ESSENTIAL civs: defined per role in the plan, can be changed for this match with Ctrl+click
  const getEssentials = (mapName, roleData) => essentialOverrides[`${mapName}_${roleData.role}`] ?? (roleData.essential || []);
  const toggleEssentialInDraft = (mapName, roleData, civ) => setEssentialOverrides(prev => {
      const key = `${mapName}_${roleData.role}`;
      const current = prev[key] ?? (roleData.essential || []);
      return { ...prev, [key]: current.includes(civ) ? current.filter(c => c !== civ) : [...current, civ] };
  });
  const isCtrl = (e) => e.ctrlKey || e.metaKey;

  const confirmAssignment = (mapName, roleName, civ) => setAssigned(prev => ({ ...prev, [`${mapName}_${roleName}`]: civ }));
  const clearAssignment = (mapName, roleName) => setAssigned(prev => { const next = { ...prev }; delete next[`${mapName}_${roleName}`]; return next; });
  const resetDraft = () => { 
    setDraft({ picks: [], oppPicks: [], oppShared: [], bans: [], ourBans: [], snipedMine: [], snipedTheirs: [], bansByMe: [], bansByOpp: [], bansByAdmin: [] }); 
    setAssigned({}); 
    setEssentialOverrides({});
    setDraftTurns([]);
    setEventCount(0);
    setIsReplay(false);
    setSyncMessage("");
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setSelectedExecMaps([]); 
    setCmId(""); 
    setIsConnected(false);
    if(liveSocket) liveSocket.disconnect();
  };

  // --- LOGIC: RIVAL FORECAST (picks only) ---
  const rivalNames = Array.from(new Set([...rivalDrafts.map(d => d.rival_name), ...rivalProfiles.map(p => p.rival_name)])).sort((a, b) => a.localeCompare(b));
  const rivalModel = useMemo(() => {
      const ds = rivalDrafts.filter(d => d.rival_name === selectedRival);
      const stats = rivalProfiles.find(p => p.rival_name === selectedRival);
      return (ds.length || stats) ? buildRivalModel(ds, CIVS, selectedExecMaps, stats?.map_stats || null) : null;
  }, [rivalDrafts, rivalProfiles, selectedRival, selectedExecMaps]);
  const forecastOn = !!rivalModel;
  const takenCivs = [...realPicks, ...draft.oppPicks, ...draft.bans, ...draft.ourBans].filter(c => !isHidden(c));
  const openCivs = CIVS.filter(c => !takenCivs.includes(c));
  const pickWindow = rivalPicksInWindow(draftTurns, eventCount, isHost ? 'HOST' : 'GUEST');
  const civRisk = (civ) => forecastOn ? pickRisk(civ, rivalModel, openCivs, pickWindow) : 0;
  const civRatio = (civ) => forecastOn ? preferenceRatio(civ, rivalModel) : 0;
  const civLabel = (civ) => riskLabel(civRatio(civ), pickWindow);
  const civTip = (civ) => {
      const played = forecastOn ? Object.entries(rivalModel.stats[civ]?.playedOn || {}).filter(([m]) => selectedExecMaps.includes(m)) : [];
      const playedTxt = played.length ? ` They played it on ${played.map(([m, n]) => `${m}${n > 1 ? ` x${n}` : ''}`).join(', ')}.` : '';
      return `Rival preference x${civRatio(civ).toFixed(1)} vs an average civ.${playedTxt} About ${Math.round(civRisk(civ) * 100)}% chance they take it in the ${pickWindow} rival pick${pickWindow === 1 ? '' : 's'} before our following pick.`;
  };
  const RiskTag = ({ civ }) => {
      if (!forecastOn) return null;
      const r = civLabel(civ);
      return <span title={civTip(civ)} style={{ fontSize: '8px', fontWeight: 'bold', color: r.color, border: `1px solid ${r.color}`, borderRadius: '2px', padding: '0 3px', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.label}</span>;
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

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #2a2d36', backgroundColor: '#1e212b', padding: '0 1rem' }}>
        <div onClick={() => setActiveTab('executionDraft')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'executionDraft' ? C.gold : '#888', borderBottom: activeTab === 'executionDraft' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Execution Draft</div>
        <div onClick={() => setActiveTab('metaExplorer')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'metaExplorer' ? C.gold : '#888', borderBottom: activeTab === 'metaExplorer' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Meta Explorer</div>
        <div onClick={() => setActiveTab('planCreator')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'planCreator' ? C.gold : '#888', borderBottom: activeTab === 'planCreator' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Plan Creator</div>
        <div onClick={() => setActiveTab('rivalScouting')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: activeTab === 'rivalScouting' ? C.gold : '#888', borderBottom: activeTab === 'rivalScouting' ? `3px solid ${C.gold}` : '3px solid transparent', transition: 'all 0.2s' }}>Rival Scouting</div>
      </div>

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: activeTab === 'executionDraft' ? '50vh' : '20px' }}>

        {(access === 'anon' || access === 'other') && activeTab !== 'metaExplorer' && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: '6px', padding: '12px 15px', color: C.textMain, fontSize: '13px' }}>
                {access === 'anon'
                    ? <><strong style={{ color: C.gold }}>Log in to see the plans.</strong> Draft plans and rival scouting are visible to clan members only. Use the Discord login in the menu.</>
                    : <><strong style={{ color: C.gold }}>Clan members only.</strong> Draft plans and rival scouting are visible to clan members only.</>}
            </div>
        )}

        {/* --- VIEW: EXECUTION DRAFT --- */}
        <div style={{ display: activeTab === 'executionDraft' ? 'flex' : 'none', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                
                {/* 1. MODE AND MAP SELECTION */}
                <div style={{ backgroundColor: C.card, padding: '15px', borderRadius: '6px', border: `1px solid ${C.border}`, flex: '1 1 50%', width: '50%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px', animation: !isMapSelectionComplete ? 'pulseGold 2s infinite' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: C.cyan, fontSize: '11px', margin: 0, textTransform: 'uppercase' }}>1. SELECT MAPS ({selectedExecMaps.length}/{requiredMapCount})</h3>
                        <div style={{ display: 'flex', backgroundColor: '#1e212b', borderRadius: '4px', border: '1px solid #444', overflow: 'hidden' }}>
                            <button onClick={() => handleModeChange('PA3')} style={{ backgroundColor: draftMode === 'PA3' ? C.cyan : 'transparent', color: draftMode === 'PA3' ? '#161920' : '#888', border: 'none', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>PA3</button>
                            <button onClick={() => handleModeChange('BO5')} style={{ backgroundColor: draftMode === 'BO5' ? C.cyan : 'transparent', color: draftMode === 'BO5' ? '#161920' : '#888', border: 'none', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>BO5</button>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {MAP_POOL.map(map => {
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

                {/* 2. CAPTAINS MODE CONNECTION */}
                <div style={{ backgroundColor: '#1a1c23', padding: '15px', borderRadius: '6px', border: `1px solid ${C.borderMed}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', flex: '1 1 50%', width: '50%', minWidth: 0, animation: (isMapSelectionComplete && !roleAssigned) ? 'pulseCyan 2s infinite' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: C.gold, fontSize: '11px', fontWeight: 'bold' }}>2. CAPTAINS MODE SYNC:</span>
                        <select value={selectedRival} onChange={(e) => setSelectedRival(e.target.value)} title="Rival for the pick forecast (stored drafts in Rival Scouting)" style={{ marginLeft: 'auto', backgroundColor: '#1e212b', color: selectedRival ? C.gold : '#888', border: '1px solid #444', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', outline: 'none', cursor: 'pointer' }}>
                            <option value="">Forecast: no rival</option>
                            {rivalNames.map(r => <option key={r} value={r}>Forecast: {r} ({rivalDrafts.filter(d => d.rival_name === r).length} drafts{rivalProfiles.some(p => p.rival_name === r) ? ' + stats' : ''})</option>)}
                        </select>
                    </div>
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
                            {syncing ? 'SYNCING...' : isConnected ? (isReplay ? '✓ LOADED' : '✓ CONNECTED') : '↻ CONNECT'}
                        </button>
                        {syncMessage && <span style={{ alignSelf: 'center', fontSize: '10px', color: isReplay ? C.green : C.red, fontWeight: 'bold' }}>{syncMessage}</span>}
                        <button onClick={resetDraft} style={{ backgroundColor: '#cc3333', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
                            ↻ RESET DRAFT
                        </button>
                    </div>
                </div>
            </div>

            {/* CONNECTION STATUS (scroll anchor, so it stays visible after the auto-scroll) */}
            <div ref={draftBoardRef} style={{ scrollMarginTop: '20px', display: (isConnected || syncMessage) ? 'flex' : 'none', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '4px', backgroundColor: isConnected ? 'rgba(76, 175, 80, 0.08)' : 'rgba(255, 68, 68, 0.08)', border: `1px solid ${isConnected ? C.green : C.red}55` }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: isConnected ? C.green : C.red }}>{isConnected ? (isReplay ? '✓ FINISHED DRAFT LOADED' : '● LIVE') : '✗ NOT CONNECTED'}</span>
                {syncMessage && !isReplay && <span style={{ fontSize: '11px', color: '#aaa' }}>{syncMessage}</span>}
                {forecastOn && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#aaa' }}>Forecast vs <strong style={{ color: C.gold }}>{selectedRival}</strong>: {pickWindow} rival pick{pickWindow === 1 ? '' : 's'} before our following pick</span>}
            </div>

            {/* LIVE DRAFT BOARD: like aoe2cm, HOST on the left and GUEST on the right, both filling from the centre outwards */}
            {(() => {
                const mySide = isHost ? 'HOST' : 'GUEST';
                // Pick slots per side, reserved from the start: PA3 = 12, BO5 = 19
                const countTurns = (side, action) => draftTurns.filter(t => String(t?.player || '').toUpperCase() === side && String(t?.action || '').toUpperCase() === action).length;
                const pickSlots = () => draftMode === 'PA3' ? 12 : 19;
                const draftOver = draftTurns.length > 0 && eventCount >= draftTurns.length;
                const banSlots = (side) => (draftTurns.length && !draftOver) ? countTurns(side, 'BAN') : 0;

                const tile = (c, key, border, opts = {}) => (
                    <div key={key} title={opts.title || c} style={{ position: 'relative', width: '34px', height: '34px', border: `1.5px solid ${border}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#1e212b', flexShrink: 0 }}>
                        {isHidden(c) ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: C.gold, fontWeight: 'bold' }}>?</span></div> : <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: opts.dim ? 0.35 : 1 }} onError={(e) => e.target.style.display='none'} />}
                        {!opts.noLabel && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '12px', backgroundColor: 'rgba(0,0,0,0.85)', color: 'white', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{isHidden(c) ? '?' : c.substring(0,4)}</div>}
                        {opts.cross && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: opts.crossColor || C.red, fontSize: '24px', fontWeight: '300' }}>✗</span></div>}
                        {opts.tick && <div style={{ position: 'absolute', top: '-2px', right: '0px' }}><span style={{ color: C.green, fontSize: '14px', fontWeight: '900', textShadow: '1px 1px 1px #000' }}>✓</span></div>}
                    </div>
                );
                const emptySlot = (key) => <div key={key} style={{ width: '34px', height: '34px', border: '1px dashed #444', borderRadius: '4px', backgroundColor: '#1e212b', flexShrink: 0 }} />;

                const rosterPanel = (side) => {
                    const mine = side === mySide;
                    const isLeft = side === 'HOST';
                    const color = mine ? myColor : oppColor;
                    const list = mine ? draft.picks : draft.oppPicks;
                    const slots = Math.max(pickSlots(), list.length);
                    const tiles = list.map((c, i) => {
                        if (mine) {
                            const sniped = draft.snipedMine.includes(c);
                            const assignedCiv = Object.values(assigned).includes(c);
                            return tile(c, `${side}-${i}`, color, { dim: sniped || assignedCiv, cross: sniped, tick: assignedCiv && !sniped, title: sniped ? `${c}: sniped by the rival` : c });
                        }
                        const sniped = draft.snipedTheirs.includes(c);
                        return tile(c, `${side}-${i}`, color, { dim: sniped, cross: sniped, title: sniped ? `${c}: sniped by us` : c });
                    });
                    for (let i = list.length; i < slots; i++) tiles.push(emptySlot(`${side}-empty-${i}`));
                    return (
                        <div style={{ flex: 1, minWidth: 0, backgroundColor: '#1a1c23', padding: '8px', borderRadius: '6px', borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: isLeft ? 'flex-end' : 'flex-start' }}>
                            <h3 style={{ color, margin: '0 0 6px 0', fontSize: '11px', letterSpacing: '1px' }}>{mine ? 'MY PICKS' : 'OPPONENT PICKS'} ({side}) <span style={{ color: '#888' }}>{list.length}/{slots}</span></h3>
                            <div style={{ display: 'flex', flexDirection: isLeft ? 'row-reverse' : 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: '4px', width: '100%' }}>
                                {tiles}
                            </div>
                        </div>
                    );
                };

                const banColumn = (side) => {
                    const mine = side === mySide;
                    const isLeft = side === 'HOST';
                    const list = mine ? draft.bansByMe : draft.bansByOpp;
                    const tiles = list.map((c, i) => tile(c, `ban-${side}-${i}`, '#555', { dim: true, cross: true, crossColor: mine ? myColor : C.red, title: `${c}: banned by ${mine ? 'us' : 'the rival'}${mine && draft.ourBans.includes(c) ? ' (only for the rival)' : ''}` }));
                    for (let i = list.length; i < banSlots(side); i++) tiles.push(emptySlot(`ban-${side}-empty-${i}`));
                    return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: isLeft ? 'flex-end' : 'flex-start', gap: '4px' }}>
                            <span style={{ fontSize: '9px', color: mine ? myColor : oppColor, fontWeight: 'bold', letterSpacing: '1px' }}>{mine ? 'OUR BANS' : 'THEIR BANS'}</span>
                            <div style={{ display: 'flex', flexDirection: isLeft ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: '4px' }}>
                                {tiles.length ? tiles : <span style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>-</span>}
                            </div>
                        </div>
                    );
                };

                return (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                        {rosterPanel('HOST')}
                        <div style={{ flex: '0 0 auto', width: '250px', backgroundColor: '#161920', padding: '8px', borderRadius: '6px', border: '1px dashed #555', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <h3 style={{ color: '#888', margin: 0, fontSize: '11px', letterSpacing: '1px', textAlign: 'center' }}>BANS</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {banColumn('HOST')}
                                <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: '#444' }} />
                                {banColumn('GUEST')}
                            </div>
                            {draft.bansByAdmin.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderTop: '1px solid #333', paddingTop: '6px' }}>
                                    <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>GLOBAL</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                                        {draft.bansByAdmin.map((c, i) => tile(c, `ban-admin-${i}`, '#555', { dim: true, cross: true, title: `${c}: global ban` }))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {rosterPanel('GUEST')}
                    </div>
                );
            })()}

            {/* EXECUTION BOARD (STRICT 3-COLUMN GRID) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#888' }}>
                    <span style={{ width: '12px', height: '12px', border: '2px solid #ff4444', borderRadius: '2px', backgroundColor: 'rgba(255, 68, 68, 0.15)' }}></span>
                    <span><strong style={{ color: '#ff6666' }}>Ctrl+click</strong> any civ in a role (or use "+ Essential") to mark or unmark it as <strong style={{ color: '#ff6666' }}>ESSENTIAL</strong> for this match. Plan essentials load automatically.</span>
                </div>

                {/* NEXT PICK QUEUE: our own priority leads, rival pressure only reorders it */}
                {forecastOn && (() => {
                    const POSITION_VALUE = [1, 0.6, 0.4, 0.3, 0.2];
                    const pressure = (c) => pickWindow > 0 ? Math.min(1.4, Math.max(0.7, 0.6 + 0.2 * civRatio(c))) : 0.7;
                    const queue = {};
                    const headsUp = {};
                    selectedExecMaps.forEach(mapName => {
                        const plans = draftPlans[mapName];
                        if (!plans) return;
                        const planName = selectedPlans[mapName] || Object.keys(plans)[0];
                        const roles = plans[planName] || [];
                        roles.forEach(roleData => {
                            const ev = evaluateRole(mapName, roleData);
                            if (ev.status === 'LOCKED') return;
                            const essentials = getEssentials(mapName, roleData);
                            // Position among the civs still possible for this role (main priorities only, never backups)
                            (ev.candidates || []).forEach((cand, pos) => {
                                if (cand.type !== 'TARGET') return;
                                const isEss = essentials.includes(cand.civ);
                                const roleTag = `${mapName}: ${roleData.role} (#${pos + 1}${isEss ? ', essential' : ''})`;
                                if (pos >= 1 && !isEss && civLabel(cand.civ).label === 'NOW') {
                                    const h = headsUp[cand.civ] || { civ: cand.civ, roles: [] };
                                    h.roles.push(roleTag);
                                    headsUp[cand.civ] = h;
                                }
                                const value = (POSITION_VALUE[pos] ?? 0.2) * (isEss ? 2 : 1) * (ev.urgencyCount <= 2 ? 1.4 : 1);
                                const entry = queue[cand.civ] || { civ: cand.civ, best: 0, roles: [], essential: false };
                                entry.best = Math.max(entry.best, value);
                                entry.roles.push(roleTag);
                                entry.essential = entry.essential || isEss;
                                queue[cand.civ] = entry;
                            });
                        });
                    });
                    Object.values(queue).forEach(q => { q.score = (q.best + 0.15 * (q.roles.length - 1)) * pressure(q.civ); });
                    const top = Object.values(queue).sort((a, b) => b.score - a.score).slice(0, 6);
                    const topNames = top.map(q => q.civ);
                    const heads = Object.values(headsUp).filter(h => !topNames.includes(h.civ)).slice(0, 4);
                    if (top.length === 0) return null;
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '6px 10px' }}>
                            <span style={{ fontSize: '10px', color: C.gold, fontWeight: 'bold' }} title="Ranked by our priority (role position, essentials, LFT, roles covered); rival preference only reorders it">NEXT PICK QUEUE</span>
                            {top.map((q, i) => {
                                const r = civLabel(q.civ);
                                return (
                                    <div key={q.civ} title={`${q.roles.join(' | ')}\n${civTip(q.civ)}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '3px', border: `1px solid ${r.color}88`, backgroundColor: '#161920' }}>
                                        <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold' }}>{i + 1}.</span>
                                        <img src={`/civs/${getCivImage(q.civ)}`} alt={q.civ} style={{ width: '16px', height: '16px', borderRadius: '2px', outline: q.essential ? '2px solid #ff4444' : 'none' }} onError={(e) => e.target.style.display='none'} />
                                        <span style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>{q.civ}</span>
                                        <span style={{ fontSize: '8px', fontWeight: 'bold', color: r.color }}>{r.label}</span>
                                    </div>
                                );
                            })}
                            {heads.length > 0 && (
                                <>
                                    <span style={{ color: '#444', fontSize: '12px', margin: '0 2px' }}>|</span>
                                    <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }} title="Rival favourites that are only a secondary option for us: if you want them, take them before the rival does">HEADS-UP:</span>
                                    {heads.map(h => (
                                        <div key={h.civ} title={`${h.roles.join(' | ')}\n${civTip(h.civ)}`} style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.75 }}>
                                            <img src={`/civs/${getCivImage(h.civ)}`} alt={h.civ} style={{ width: '14px', height: '14px', borderRadius: '2px' }} onError={(e) => e.target.style.display='none'} />
                                            <span style={{ fontSize: '10px', color: '#ccc', fontWeight: 'bold' }}>{h.civ}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    );
                })()}

                {/* BAN CANDIDATES: rival favourites that are worth little to us */}
                {forecastOn && (() => {
                    const ourCore = new Set();
                    selectedExecMaps.forEach(mapName => {
                        const plans = draftPlans[mapName];
                        if (!plans) return;
                        const planName = selectedPlans[mapName] || Object.keys(plans)[0];
                        (plans[planName] || []).forEach(roleData => {
                            roleData.priority.slice(0, 5).forEach(c => ourCore.add(c));
                            getEssentials(mapName, roleData).forEach(c => ourCore.add(c));
                        });
                    });
                    const ratio = civRatio;
                    const bans = openCivs.filter(c => !ourCore.has(c) && ratio(c) >= 1.5).sort((a, b) => ratio(b) - ratio(a)).slice(0, 5);
                    if (bans.length === 0) return null;
                    const ourSide = isHost ? 'HOST' : 'GUEST';
                    const turnsKnown = draftTurns.length > 0;
                    const bansLeft = draftTurns.slice(eventCount).filter(t => String(t?.action || '').toUpperCase() === 'BAN' && String(t?.player || '').toUpperCase() === ourSide).length;
                    const noBans = turnsKnown && bansLeft === 0;
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '6px 10px', opacity: noBans ? 0.5 : 1 }}>
                            <span style={{ fontSize: '10px', color: C.red, fontWeight: 'bold' }} title="Civs the rival picks a lot that are not among our main priorities on these maps">BAN CANDIDATES</span>
                            {bans.map(c => (
                                <div key={c} title={`Rival preference x${ratio(c).toFixed(1)} vs an average civ. Not a main priority for us on these maps.`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '3px', border: `1px solid ${C.red}66`, backgroundColor: '#161920' }}>
                                    <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '16px', height: '16px', borderRadius: '2px' }} onError={(e) => e.target.style.display='none'} />
                                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>{c}</span>
                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: C.red }}>x{ratio(c).toFixed(1)}</span>
                                </div>
                            ))}
                            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#888' }}>{turnsKnown ? (noBans ? 'No bans left for us' : `${bansLeft} ban${bansLeft === 1 ? '' : 's'} left for us`) : 'Connect a draft to see bans left'}</span>
                        </div>
                    );
                })()}
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

                        const plansAvailable = draftPlans[mapName] ? Object.keys(draftPlans[mapName]) : [];
                        
                        if (plansAvailable.length === 0) {
                            return (
                                <div key={mapName} style={{ flex: 1, backgroundColor: C.card, borderRadius: '4px', border: `1px solid ${C.red}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', padding: '20px', textAlign: 'center', gap: '8px' }}>
                                    <img src={`/maps/${getMapImageName(mapName)}.png`} alt={mapName} style={{ width: '40px', height: '40px', borderRadius: '4px', border: '1px solid #444', objectFit: 'cover', filter: 'grayscale(0.8)' }} />
                                    <h4 style={{ color: '#fff', margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>{mapName}</h4>
                                    <span style={{ color: C.red, fontSize: '11px', fontWeight: 'bold', backgroundColor: 'rgba(255, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>NO PLANS CREATED</span>
                                    <span style={{ color: '#888', fontSize: '10px' }}>Go to Plan Creator to set up strategies.</span>
                                </div>
                            );
                        }

                        const activePlanName = selectedPlans[mapName] || plansAvailable[0];
                        const roles = activePlanName ? draftPlans[mapName][activePlanName] : null;
                        
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
                                        const freePicks = realPicks.filter(c => !getConfirmedCivs().includes(c) && !draft.snipedMine.includes(c));
                                        const canPickAny = status !== 'LOCKED' && freePicks.length > 0;
                                        const essentials = getEssentials(mapName, roleData);
                                        const lostCivs = [...draft.bans, ...oppExclusive, ...draft.snipedMine];
                                        const essentialCandidates = roleData.priority.filter(c => !essentials.includes(c));
                                        const essFrame = (c) => essentials.includes(c) ? '2px solid #ff4444' : 'none';
                                        
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
                                                
                                                {/* Strict grid, safe against variable widths */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 95px) 36px minmax(0, 1fr) 40px', gap: '6px', alignItems: 'center', padding: '4px 6px', minHeight: '34px' }}>
                                                    <div style={{ fontSize: '10.5px', color: '#e0e0e0', fontWeight: 'bold', lineHeight: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={roleData.role}>
                                                        {roleData.role}
                                                    </div>
                                                    
                                                    {/* The urgency slot always has content to keep the layout symmetric */}
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        {status === 'LOCKED' ? (
                                                            <span style={{fontSize: '12px', color: C.green, fontWeight: '900'}}>✓</span>
                                                        ) : status === 'SNIPED' ? (
                                                            <span style={{fontSize: '12px', color: C.red, fontWeight: '900'}}>✗</span>
                                                        ) : (
                                                            urgencyBadge
                                                        )}
                                                    </div>

                                                    <div onClick={(e) => { if (civ && isCtrl(e)) toggleEssentialInDraft(mapName, roleData, civ); }} title={civ ? 'Ctrl+click to mark or unmark as ESSENTIAL' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                                        {civ ? (
                                                            <>
                                                                <img src={`/civs/${getCivImage(civ)}`} alt={civ} style={{ width: '22px', height: '22px', borderRadius: '3px', border: essentials.includes(civ) ? '2px solid #ff4444' : `1px solid ${bd}`, objectFit: 'cover', flexShrink: 0, opacity: status === 'SNIPED' ? 0.3 : 1 }} onError={(e) => e.target.style.display='none'} />
                                                                <span style={{ fontSize: '12px', color: status === 'SNIPED' ? C.red : '#fff', fontWeight: 'bold', textDecoration: status === 'SNIPED' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{civ}</span>
                                                                {status === 'TARGET' && <RiskTag civ={civ} />}
                                                            </>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>-</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div>{actionBtn}</div>
                                                </div>

                                                {(candidates?.length > 1 || backups?.length > 0 || status !== 'LOCKED') && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', backgroundColor: 'rgba(0,0,0,0.2)', borderTop: `1px solid ${bd}55`, flexWrap: 'wrap' }}>
                                                        {candidates?.length > 1 && <span style={{ fontSize: '8px', color: '#666', fontWeight: 'bold' }}>NEXT:</span>}
                                                        {candidates?.slice(1, 4).map((cand, ci) => (
                                                            <div 
                                                                key={`cand-${ci}`} 
                                                                onClick={(e) => { if (isCtrl(e)) { toggleEssentialInDraft(mapName, roleData, cand.civ); return; } if (cand.type === 'SUGGESTED') confirmAssignment(mapName, roleData.role, cand.civ); }}
                                                                title={cand.type === 'SUGGESTED' ? `Assign ${cand.civ} to ${roleData.role} (Ctrl+click: ESSENTIAL)` : `${cand.civ} not drafted yet (Ctrl+click: ESSENTIAL)`}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: cand.type === 'TARGET' ? 0.5 : 1, cursor: cand.type === 'SUGGESTED' ? 'pointer' : 'default', transition: 'transform 0.1s' }}
                                                                onMouseEnter={(e) => { if(cand.type === 'SUGGESTED') e.currentTarget.style.transform = 'scale(1.15)' }}
                                                                onMouseLeave={(e) => { if(cand.type === 'SUGGESTED') e.currentTarget.style.transform = 'scale(1)' }}
                                                            >
                                                                <img src={`/civs/${getCivImage(cand.civ)}`} alt={cand.civ} style={{ width: '13px', height: '13px', borderRadius: '2px', outline: essFrame(cand.civ) }} onError={(e) => e.target.style.display='none'} />
                                                                <span style={{ fontSize: '9px', color: cand.type === 'SUGGESTED' ? C.blue : '#888', fontWeight: cand.type === 'SUGGESTED' ? 'bold' : 'normal' }}>{cand.civ.substring(0,3).toUpperCase()}</span>
                                                                {forecastOn && cand.type === 'TARGET' && <span title={`${civLabel(cand.civ).label}. ${civTip(cand.civ)}`} style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: civLabel(cand.civ).color }}></span>}
                                                            </div>
                                                        ))}
                                                        
                                                        {backups?.length > 0 && (
                                                            <>
                                                                {candidates?.length > 1 && <span style={{ color: '#444', fontSize: '9px', margin: '0 2px' }}>|</span>}
                                                                <span style={{ fontSize: '8px', color: '#666', fontWeight: 'bold' }}>BACKUPS:</span>
                                                                {backups.map((cand, ci) => (
                                                                    <div 
                                                                        key={`back-${ci}`} 
                                                                        onClick={(e) => { if (isCtrl(e)) { toggleEssentialInDraft(mapName, roleData, cand.civ); return; } if (cand.type === 'SUGGESTED') confirmAssignment(mapName, roleData.role, cand.civ); }}
                                                                        title={cand.type === 'SUGGESTED' ? `Assign ${cand.civ} to ${roleData.role} (Ctrl+click: ESSENTIAL)` : `${cand.civ} not drafted yet (Ctrl+click: ESSENTIAL)`}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '3px', opacity: cand.type === 'TARGET' ? 0.4 : 0.8, cursor: cand.type === 'SUGGESTED' ? 'pointer' : 'default', transition: 'transform 0.1s' }}
                                                                        onMouseEnter={(e) => { if(cand.type === 'SUGGESTED') e.currentTarget.style.transform = 'scale(1.15)' }}
                                                                        onMouseLeave={(e) => { if(cand.type === 'SUGGESTED') e.currentTarget.style.transform = 'scale(1)' }}
                                                                    >
                                                                        <img src={`/civs/${getCivImage(cand.civ)}`} alt={cand.civ} style={{ width: '13px', height: '13px', borderRadius: '2px', outline: essFrame(cand.civ) }} onError={(e) => e.target.style.display='none'} />
                                                                        <span style={{ fontSize: '9px', color: cand.type === 'SUGGESTED' ? C.blue : '#666', fontWeight: cand.type === 'SUGGESTED' ? 'bold' : 'normal' }}>{cand.civ.substring(0,3).toUpperCase()}</span>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}
                                                        {status !== 'LOCKED' && essentialCandidates.length > 0 && (
                                                            <select
                                                                value=""
                                                                onChange={(e) => { if (e.target.value) toggleEssentialInDraft(mapName, roleData, e.target.value); }}
                                                                title="Mark a civ of this role as ESSENTIAL for this match"
                                                                style={{ marginLeft: 'auto', backgroundColor: '#161920', color: '#ff6666', border: '1px solid #ff444466', padding: '1px 2px', borderRadius: '3px', fontSize: '9px', outline: 'none', cursor: 'pointer', maxWidth: '90px' }}
                                                            >
                                                                <option value="">+ Essential</option>
                                                                {essentialCandidates.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        )}
                                                        {canPickAny && (
                                                            <select
                                                                value=""
                                                                onChange={(e) => { if (e.target.value) confirmAssignment(mapName, roleData.role, e.target.value); }}
                                                                title="Assign any of our picked civs to this role, even if it is not in the plan"
                                                                style={{ marginLeft: essentialCandidates.length > 0 ? 0 : 'auto', backgroundColor: '#161920', color: C.cyan, border: '1px solid #444', padding: '1px 2px', borderRadius: '3px', fontSize: '9px', outline: 'none', cursor: 'pointer', maxWidth: '90px' }}
                                                            >
                                                                <option value="">+ Other</option>
                                                                {freePicks.map(c => <option key={c} value={c}>{c}{roleData.priority.includes(c) ? '' : ' (off-plan)'}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                )}

                                                {essentials.length > 0 && status !== 'LOCKED' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', backgroundColor: 'rgba(255, 68, 68, 0.06)', borderTop: '1px solid #ff444444', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '8px', color: '#ff6666', fontWeight: 'bold' }}>ESSENTIAL:</span>
                                                        {essentials.map(c => {
                                                            const picked = realPicks.includes(c) && !draft.snipedMine.includes(c);
                                                            const lost = lostCivs.includes(c);
                                                            return (
                                                                <div key={`ess-${c}`} onClick={(e) => { if (isCtrl(e)) toggleEssentialInDraft(mapName, roleData, c); }} title={picked ? `${c}: secured (Ctrl+click to unmark)` : lost ? `${c}: lost (Ctrl+click to unmark)` : `${c}: still open, secure it early (Ctrl+click to unmark)`} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '1px 3px', borderRadius: '2px', border: `1px solid ${picked ? C.blue : lost ? '#555' : '#ff4444'}`, opacity: lost ? 0.45 : 1, animation: (!picked && !lost) ? 'pulseAlertRed 1.5s infinite' : 'none' }}>
                                                                    <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '13px', height: '13px', borderRadius: '2px' }} onError={(e) => e.target.style.display='none'} />
                                                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: picked ? C.blue : lost ? '#888' : '#ff6666', textDecoration: lost ? 'line-through' : 'none' }}>{c.substring(0,3).toUpperCase()}{picked ? ' ✓' : ''}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* BENCH: all our picked civs not assigned to any role yet */}
                                    {(() => {
                                        const unassigned = realPicks.filter(c => !getConfirmedCivs().includes(c) && !draft.snipedMine.includes(c));
                                        const fits = unassigned.filter(c => roles.some(r => r.priority.includes(c)));
                                        const offPlan = unassigned.filter(c => !fits.includes(c));
                                        const chip = (c, fit) => (
                                            <div key={c} title={fit ? `${c}: in this plan` : `${c}: not in this plan (use "+ Other" in a role to assign it)`} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 7px', backgroundColor: fit ? 'rgba(102, 178, 255, 0.12)' : '#1e212b', border: `1px solid ${fit ? C.blue : '#444'}`, borderRadius: '4px' }}>
                                                <img src={`/civs/${getCivImage(c)}`} alt={c} style={{ width: '20px', height: '20px', borderRadius: '3px', opacity: fit ? 1 : 0.6 }} onError={(e) => e.target.style.display='none'} />
                                                <span style={{ fontSize: '11px', color: fit ? '#fff' : '#888', fontWeight: 'bold' }}>{c}</span>
                                            </div>
                                        );
                                        return (
                                            <div style={{ marginTop: 'auto', padding: '8px', borderTop: `2px solid ${C.blue}55`, backgroundColor: 'rgba(102, 178, 255, 0.04)', borderRadius: '0 0 4px 4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '11px', color: C.blue, fontWeight: 'bold', letterSpacing: '1px' }}>BENCH</span>
                                                    <span style={{ fontSize: '10px', color: '#888' }}>{unassigned.length} unassigned pick{unassigned.length === 1 ? '' : 's'}</span>
                                                </div>
                                                {unassigned.length === 0 ? (
                                                    <span style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>Empty</span>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                        {fits.length > 0 && <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>{fits.map(c => chip(c, true))}</div>}
                                                        {offPlan.length > 0 && (
                                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '9px', color: '#666', fontWeight: 'bold' }}>OFF-PLAN:</span>
                                                                {offPlan.map(c => chip(c, false))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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

        {/* --- VIEW: META EXPLORER --- */}
        <div style={{ display: activeTab === 'metaExplorer' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
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
                <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Liquipedia data missing.</div>
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

        {/* --- VIEW: PLAN CREATOR --- */}
        <div style={{ display: activeTab === 'planCreator' ? 'block' : 'none', margin: '-20px' }}>
            <DraftPlanCreator onPlansChanged={refreshPlans} />
        </div>

        {/* --- VIEW: RIVAL SCOUTING --- */}
        <div style={{ display: activeTab === 'rivalScouting' ? 'block' : 'none' }}>
            <RivalScouting C={C} CIVS={CIVS} getCivImage={getCivImage} rivalDrafts={rivalDrafts} refreshRivalDrafts={refreshRivalDrafts} rivalProfiles={rivalProfiles} refreshRivalProfiles={refreshRivalProfiles} />
        </div>
      </div>
    </div>
  );
}

export default ClanWarsVII;