# Clan Wars VII draft tool (3v3)

Route `/tools/clan-wars-vii`. Files: `pages/ClanWarsVII.jsx` (page, plan view, execution draft), `pages/cw7/RivalScouting.jsx` (rival tab), `pages/cw7/forecast.js` (rival model and forecast), `pages/cw7/matchPage.js` (parsing of pasted results pages), `pages/admin/DraftPlanCreator.jsx` (plan editor).

## Tournament format

- Map pool (`MAP_POOL`): Colosseum, Crescent, Fortress, Grand Bara, Nomad, Socotra, Tres Leches.
- Modes: PA3 (3 maps) and BO5 (5 maps). Pick slots per side, reserved and shown as placeholders from the start: PA3 = 12, BO5 = 19.
- Drafts run on aoe2cm.net (captains mode). Some drafts have hidden picks and snipes.

## Draft plans (`cw7_draft_plans`)

- One or more named plans per map. Each plan has up to 3 roles; each role has an ordered civ priority list and a list of essential civs.
- Edited in `/admin/draft-plan-creator`. In the execution draft, Ctrl+click on a civ in a role (or "+ Essential") marks or unmarks it as essential (red frame). Overrides are kept per map and role.

## Execution draft

- Connects to a live aoe2cm draft as spectator (socket.io, `set_role` SPECTATOR with the name `Emputors`) or loads a finished one (single `replay` event). Connection status is visible.
- aoe2cm-like board: picks fill from the centre outwards, bans per team with a separator, per-side bans and snipes, hidden picks handled. Both sides cannot hold the same civ.
- Bench redesign: available, taken and banned civs per role at a glance.

## Civ Planner (`pages/cw7/CivPlanner.jsx`)

- Offline sandbox to build a "plan A": choose PA3 or BO5 and the maps, pick a plan per map, then click suggested civs (role priority lists) to fill each role.
- A civ can be used only once across all maps and roles: elsewhere it shows crossed out with the map name, and clicking it moves it. Civs suggested on more than one selected map have a gold frame; essentials a red outline. "Plan A" strip summarises the assignment.
- Summary below the maps: per role the favourite (assigned civ) and up to 3 alternatives (next civs of the role list not used anywhere), plus a player name per slot. Copy buttons (all maps, or one map) put a WhatsApp-ready text (bold with `*`) on the clipboard.
- No aoe2cm connection, no picks or bans.
- Match selector: "Sandbox (this browser only)" (localStorage `cw7-civ-planner-v1`) or a saved match from `cw7_civ_scenarios` (one row per match: name, rival, PA3/BO5, date, `scenarios` jsonb, `role_edits` jsonb). Last selected match in localStorage `cw7-civ-planner-match`.
- A match holds several scenarios (tabs A, B, C...), one per possible map draft outcome. Each scenario = maps, plan per map, assigned civs and players. "+ Scenario" adds an empty one, "Duplicate" copies the current one. "Save as match" turns the sandbox into a new match (scenario A).
- "Edit list" on a role: reorder, remove or add civs for this match only (`role_edits`, key `map|plan|role`); the plan in Plan Creator is unchanged. Edited roles show "MATCH EDIT" and can be reset.
- Compare: map and role rows against scenarios; gold = same civ as most scenarios, blue = different. Copy per scenario or all scenarios (WhatsApp text).
- Admin edits and changes save automatically (debounced); members see saved matches read only (RLS: members read, admin insert/update/delete).

## Map Draft (`pages/cw7/MapDraftPlanner.jsx`, `pages/cw7/mapDraftEngine.js`)

- Pre-match scenario generator for the map draft against one rival (PA3 only: pick A, pick B, pick B, pick A, ban A, ban B, snipe B, snipe A, where A = host; the map left over is the Admin pick and starting map). Colours as in the Execution Draft: host blue, guest gold, picks green, bans red.
- "Our first pick" defaults to our best rated map; each option shows the model's match win chance (the differences are usually under one point, so it is a guide, not a rule).
- Our side: win chance per map (clan base, changed per rival), saved in this browser only (localStorage `cw7-map-draft-v1`). Match win = chance to win at least 2 of the 3 maps.
- Rival model: every pick, ban and snipe in their map drafts is a choice among the maps available at that moment (a snipe only compares the two maps of the pair). Fitted as a choice model with a prior (`fitRivalModel`); shown as a preference order with Favourite / Neutral / Low tags.
- Engine (`analyzeScenarios`): enumerates the whole draft tree; our moves maximise the match win chance, rival moves follow the model with probabilities (not a perfect opponent). Outputs the likely final map sets, the win chance of each possible first pick of ours (can be fixed in "Our first pick") and our line grouped by the rival's picks.
- "Send to Civ Planner" opens the Civ Planner with those maps: if a match is selected, it opens the scenario with the same maps or (admin) adds a new scenario; otherwise it fills the sandbox.
- Tests: `node --test src/pages/cw7/mapDraftEngine.test.js` (fixture with three real map drafts).

## Rival scouting (`cw7_rival_drafts`, `cw7_rival_profiles`)

- Load past drafts of a rival from aoe2cm (id or URL) and choose which side the rival played in each one.
- Paste results pages from the Clan Wars results site (Ctrl+A, Ctrl+C):
  - match page: civs played per map, draft link;
  - team statistics page ("Estadísticas de Mapas", all sections expanded): civs played per map, stored as `map_stats` in the rival profile.
- Civ and map names are translated from the Spanish site names (`CIV_ES`, `MAP_LOOKUP`).
- Two views: Register (paste box, add draft, team statistics) and Profile (full width: Map drafts and Civ drafts of the chosen rival).
- Map drafts (`mapDrafts.js`, `MapDraftsView.jsx`): stored in `cw7_rival_drafts` like civ drafts, no extra column. A draft is a map draft when none of its chosen options is a civ (`isMapDraft`); map drafts are left out of the civ model and the forecast. aoe2cm map ids are slugs (`grand-bara`) turned into names (`Grand Bara`).
  - Profile shows plain-language patterns (most banned and most picked map, which rival pick they snipe, maps lost to snipes), one card per map (picked, banned, sniped by them, lost to snipe, starting map, final maps) and a draft by draft table (sniped maps crossed out).
  - Starting map = the pick made by NONE: the map left over after picks, bans and snipes; the match starts on it (PA3: all three maps are played). Nothing depends on the number of turns, so BO5 presets work the same way; how BO5 final maps are read may need a review when the format is used.
  - When loading any draft, the rival and side are pre-selected if a captain nick matches exactly one rival's stored drafts. A match page with a "Draft Mapas" link (or any second aoe2cm link) loads the map draft right after the civ draft is saved.

## Rival model (`forecast.js`)

- Picks only. Each rival pick is a choice among the civs still available at that moment: unavailable civs (banned or taken) count for nothing, available but skipped civs count as exposure without a pick.
- Earlier picks weigh more: weight `1 / (1 + 0.3 * (n - 1))`.
- `preference = (weighted picks + ALPHA * base) / (weighted exposure + ALPHA)` with `ALPHA = 4` (civs with little evidence are pulled to the average).
- Map stats boost: civs the rival played on today's maps get +25% per game, up to x2.
- Preference ratio = preference against an average civ (x1.0), shown in the rival profile.

## Forecast and suggestions

- Window: number of exclusive rival picks between our current pick and our following pick (`rivalPicksInWindow`; unknown format assumes 2).
- Risk label per civ: NOW if ratio >= 3, SOON if ratio >= 1.5, CAN WAIT otherwise or when the rival has no pick in the window.
- Next Pick Queue: led by our own priorities. Position values `[1, 0.6, 0.4, 0.3, 0.2]` for the role list; score = (best position value + 0.15 per extra role that wants the civ) x pressure, where pressure = clamp(0.6 + 0.2 x rival ratio, 0.7, 1.4) when the rival can pick in the window, else 0.7. Essentials are flagged.
- Heads-up: rival favourites that are only a secondary option for us (take them now if you want them).
- Ban Candidates: rival favourites that are worth little to us.
