// Parses a match page from the Clan Wars results site, copied with Ctrl+A / Ctrl+C and pasted here.

const strip = (s) => String(s || "").normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Official Spanish civ names (aoe2techtree locale) plus the variants used on the results site
const CIV_ES = {
  "Armenians": ["armenios"], "Aztecs": ["aztecas"], "Bengalis": ["bengalies"], "Berbers": ["bereberes"],
  "Bohemians": ["bohemios"], "Britons": ["britanos", "ingleses"], "Bulgarians": ["bulgaros"], "Burgundians": ["borgonones"],
  "Burmese": ["birmanos"], "Byzantines": ["bizantinos"], "Celts": ["celtas"], "Chinese": ["chinos"], "Cumans": ["cumanos"],
  "Danes": ["daneses"], "Dravidians": ["dravidicos", "dravidianos"], "Ethiopians": ["etiopes"], "Franks": ["francos"],
  "Georgians": ["georgianos"], "Goths": ["godos"], "Gurjaras": ["gurjara", "gurjaras"], "Hindustanis": ["indostanos", "hindustanos", "hindustanis"],
  "Huns": ["hunos"], "Incas": ["inca", "incas"], "Italians": ["italianos"], "Japanese": ["japoneses"], "Jurchens": ["yurchen", "jurchen", "jurchens"],
  "Khitans": ["kitan", "kitanos", "khitanos", "khitan"], "Khmer": ["jemeres", "khmer", "jemer"], "Koreans": ["coreanos"], "Lithuanians": ["lituanos"],
  "Magyars": ["magiares"], "Malay": ["malayos"], "Malians": ["malies", "malienses"], "Mapuche": ["mapuches", "mapuche"], "Mayans": ["maya", "mayas"],
  "Mongols": ["mongoles"], "Muisca": ["muiscas", "muisca"], "Persians": ["persas"], "Poles": ["polacos"], "Portuguese": ["portugueses"],
  "Romans": ["romanos"], "Saracens": ["sarracenos"], "Saxons": ["sajones"], "Shu": ["shu"], "Sicilians": ["sicilianos"], "Slavs": ["eslavos"],
  "Spanish": ["espanoles"], "Tatars": ["tartaros"], "Teutons": ["teutones"], "Tupi": ["tupis", "tupi"], "Turks": ["turcos"],
  "Varangians": ["varegos"], "Vietnamese": ["vietnamitas"], "Vikings": ["vikingos"], "Wei": ["wei"], "Wu": ["wu"],
};
const CIV_LOOKUP = {};
Object.entries(CIV_ES).forEach(([en, list]) => { CIV_LOOKUP[strip(en)] = en; list.forEach(es => { CIV_LOOKUP[es] = en; }); });
export const civToEnglish = (name) => CIV_LOOKUP[strip(name)] || null;

const MAP_LOOKUP = {
  "nomada": "Nomad", "nomad": "Nomad", "fortaleza": "Fortress", "fortress": "Fortress", "media luna": "Crescent", "crescent": "Crescent",
  "coliseo": "Colosseum", "colosseum": "Colosseum", "socotra": "Socotra", "tres leches": "Tres Leches", "grand bara": "Grand Bara",
};
export const mapToEnglish = (name) => {
  const key = strip(name);
  if (!key || key.startsWith('sin especificar')) return null;
  if (MAP_LOOKUP[key]) return MAP_LOOKUP[key];
  return String(name).trim().toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
};

// Clipboard HTML keeps the links (the draft URL); turn it into text with [text](url) links
export const htmlToText = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const BLOCK = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TR', 'TABLE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'BR']);
  const walk = (node) => {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    if (['SCRIPT', 'STYLE'].includes(node.tagName)) return '';
    if (node.tagName === 'BR') return '\n';
    const inner = Array.from(node.childNodes).map(walk).join('');
    if (node.tagName === 'A' && node.getAttribute('href')) return `[${inner.trim()}](${node.href || node.getAttribute('href')})`;
    return BLOCK.has(node.tagName) ? `\n${inner}\n` : inner;
  };
  return walk(doc.body).split('\n').map(l => l.trim()).filter(Boolean).join('\n');
};

const unlink = (s) => String(s || "").replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();

export const parseMatchPage = (text) => {
  const raw = String(text || "");
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const draftMatch = raw.match(/Draft\s*Civis[^\n]*?(https?:\/\/(?:www\.)?aoe2cm\.net\/draft\/[A-Za-z0-9_-]+)/i);
  const draftUrl = draftMatch ? draftMatch[1] : null;

  let teams = [];
  for (const l of lines) {
    const m = unlink(l).match(/^(.+?)\s*\bVS\b\s*(.+)$/) || unlink(l).match(/^(.+?)VS(.+)$/);
    if (m && !/^mapa/i.test(l)) { teams = [m[1].trim(), m[2].trim()]; break; }
  }

  const games = [];
  let current = null, team = null;
  for (const l of lines) {
    const text = unlink(l);
    const mapHead = text.match(/^Mapa\s*\d+\s*:\s*(.*?)\s*Ganador\s*:?\s*(.*)$/i) || text.match(/^Mapa\s*\d+\s*:\s*(.*)$/i);
    if (mapHead) {
      current = { map: mapToEnglish(mapHead[1]), picks: {} };
      games.push(current); team = null;
      continue;
    }
    if (!current) continue;
    if (/:$/.test(text) && !text.includes(' - ')) {
      team = text.slice(0, -1).trim();
      if (!teams.includes(team) && teams.length < 2) teams.push(team);
      continue;
    }
    const pm = text.match(/^(.+?)\s+-\s+(.+)$/);
    if (pm && team) {
      const civ = civToEnglish(pm[2]);
      if (civ) (current.picks[team] = current.picks[team] || []).push({ player: pm[1].trim(), civ });
    }
  }

  return { teams, draftUrl, games: games.filter(g => g.map && Object.keys(g.picks).length > 0) };
};

// Civs one team played across the match
export const civsPlayedBy = (parsed, teamName) => {
  const set = new Set();
  parsed.games.forEach(g => (g.picks[teamName] || []).forEach(p => set.add(p.civ)));
  return Array.from(set);
};

// Team statistics page ("Estadísticas de Mapas"): civs played per map, all sections expanded before copying
export const parseTeamStats = (text) => {
  const lines = String(text || "").split(/\r?\n/).map(l => unlink(l).trim()).filter(Boolean);
  const team = lines.length ? lines[0] : "";
  const maps = {};
  let current = null;
  for (const l of lines) {
    const clean = l.replace(/^(>|˅|⌄|v\s+)\s*/, '').trim();
    const asMap = mapToEnglish(clean);
    if (asMap && MAP_LOOKUP[strip(clean)]) { current = asMap; maps[current] = maps[current] || {}; continue; }
    if (!current) continue;
    const m = clean.match(/^(.+?)\s*(\d+)\s*(vez|veces)$/i);
    if (m) {
      const civ = civToEnglish(m[1]);
      if (civ) maps[current][civ] = (maps[current][civ] || 0) + parseInt(m[2], 10);
    }
  }
  Object.keys(maps).forEach(k => { if (Object.keys(maps[k]).length === 0) delete maps[k]; });
  return { team, maps };
};

export const detectPasteType = (text) => {
  const t = strip(text);
  if (t.includes('estadisticas de mapas') || /\d+\s*veces?\s*\(\d+%/.test(t)) return 'teamStats';
  if (t.includes('draft civis') || /mapa\s*\d+\s*:/.test(t)) return 'match';
  return 'unknown';
};
