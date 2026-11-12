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

## Rival scouting (`cw7_rival_drafts`, `cw7_rival_profiles`)

- Load past drafts of a rival from aoe2cm (id or URL) and choose which side the rival played in each one.
- Paste results pages from the Clan Wars results site (Ctrl+A, Ctrl+C):
  - match page: civs played per map, draft link;
  - team statistics page ("Estadísticas de Mapas", all sections expanded): civs played per map, stored as `map_stats` in the rival profile.
- Civ and map names are translated from the Spanish site names (`CIV_ES`, `MAP_LOOKUP`).

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
