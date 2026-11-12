# Emputors: architecture

Website of the Emputors clan (Age of Empires II). Owner and only maintainer: Javier (in-game LucioCornelio), who is not a programmer and works through Claude.

## Stack and hosting

| Piece | What | Notes |
|---|---|---|
| Frontend | React 19 + Vite + react-router-dom, in `frontend/` | Inline styles only (no CSS framework, no CSS modules). Dark theme: background `#161920`, gold `#ffd700`. |
| Hosting | Vercel, project root `frontend/` | `main` = production. Every other branch gets a preview URL. `frontend/vercel.json` rewrites everything to `index.html` except `/api/*`. |
| Serverless | `frontend/api/draft.js` | Proxy to `https://aoe2cm.net/api/draft/{id}` (the browser cannot call aoe2cm directly). |
| Database and login | Supabase, project `aqxleorkndmencmjczfx` | Client in `frontend/src/supabaseClient.js` (public anon key). Login with Discord OAuth. |
| Live drafts | socket.io to `https://aoe2cm.net` | Spectator connection; finished drafts arrive once as a `replay` event. |

## Pages (menu order)

| Menu | Route | File | What it does | Data |
|---|---|---|---|---|
| Home | `/` | `pages/Home.jsx` | Portal: Discord login, user profile with role, active tournament card (LEAT 11), admin shortcuts | `clan_roles` |
| Tournaments > Current Event | `/tournaments/current` | `pages/CurrentEvent.jsx` | LEAT 11: group standings, matches, third place match, grand final, rules, result logging per map (civs, YouTube link) | `match_results`; teams (`TEAM_MEMBERS`), schedule and map pool are hard-coded in the file; `public/techtree.json` |
| Tournaments > Past Events | `/tournaments/past-events` | inline in `App.jsx` | Placeholder | |
| Tournaments > Hall of Fame | `/tournaments/hall-of-fame` | inline in `App.jsx` | Placeholder | |
| Academy > Build Orders | `/academy/build-orders` | `pages/BuildOrders.jsx` | List with filters (civ, map, strategy, difficulty, search) | `build_orders` |
| | `/academy/build-orders/:buildId` | `pages/BuildOrderDetail.jsx` | Build order detail: age sections, step rows, in-game villager counter, resource badges, notes behind (i), Game Mode | `build_orders`, `clan_roles` |
| | `/academy/build-orders/:buildId/drill` | `pages/drill/BuildDrill.jsx` (+ `art.jsx`, `util.js`) | Build Drill: schematic map simulator to memorise the build | `build_orders` |
| Tools > Clan Wars VII (3v3) | `/tools/clan-wars-vii` | `pages/ClanWarsVII.jsx` + `pages/cw7/*` | Tournament draft tool (see `cw7-draft-tool.md`) | `cw7_draft_plans`, `cw7_rival_drafts`, `cw7_rival_profiles`, `public/db_3v3.json` |
| Tools > Advanced Search | `/tools/advanced-search` | `pages/AdvancedSearch.jsx` | Civ finder by tech tree: combinable filters (include, exclude, modes), civ tags (full cavalry, foot archer, cavalry archer), mark civs as used | `public/techtree.json`, `public/civtags.json` |
| Tools > LEAT11 Draft | `/tools/leat11` | `pages/Leat11Draft.jsx` + `engine.js` | LEAT 11 draft assistant: loads aoe2cm drafts (socket + `/api/draft`), suggests bans and picks (God tier, counters, roster killer, anti-flex, safe ban) | `public/db.json` (counters matrix, per-map stats from ladder and pro VODs) |
| Clan > Roster | `/clan/roster` | inline in `App.jsx` | Placeholder | |
| Clan > About | `/clan/about` | inline in `App.jsx` | Placeholder | |
| (admin) | `/admin/creator` | `pages/admin/BuildOrderCreator.jsx` | Build order editor (upsert, soft delete with `is_deleted`) | `build_orders` |
| (admin) | `/admin/draft-plan-creator` | `pages/admin/DraftPlanCreator.jsx` | CW7 draft plan editor: per map, up to 3 roles with ordered civ priorities and essentials | `cw7_draft_plans` |

Shared: `components/Navbar.jsx` (menu, Discord login), `data/iconPaths.js` (`ICON_MAP` + `iconPath()`), `data/aoeIcons.json` (game name to `/aoe/...` icon path).

## Supabase

| Table | Rows (Nov 2026) | Content |
|---|---|---|
| `clan_roles` | 9 (1 admin, 7 member, 1 guest) | `discord_username`, `role`. Matched with the Discord nickname of the session (case-insensitive). |
| `build_orders` | 10 | `id`, `title`, `civ`, `map`, `strategy`, `difficulty`, `pop_count`, `video`, `description`, `author`, `tags` (jsonb), `strategy_icons` (jsonb), `ages` (jsonb, the build itself), `whats_next` (jsonb), `is_deleted`. JSON standard: build-orders skill. |
| `match_results` | 0 | LEAT 11 results: teams, score, `map_1_data`..`map_3_data` (jsonb), `stage`, `youtube_link`, `submitted_by`. |
| `cw7_draft_plans` | 8 | `map_name`, `plan_name`, `roles` (jsonb: role, priority list, essential list). |
| `cw7_rival_drafts` | 3 | Rival drafts loaded from aoe2cm: `rival_name`, `draft_id`, `rival_side`, `events`, `turns`. |
| `cw7_rival_profiles` | 1 | `rival_name` (key), `team_name`, `map_stats` (civs played per map). |
| `backup.*` | | Copies taken before data migrations (schema not exposed to the API). |

### Permissions (RLS) and roles

- Read: public on every table.
- Write: any authenticated user (any Discord login) on every table. Role checks (admin, member, guest, team members) exist only in the interface:
  - admin: editors, modify or reset logged results, admin links.
  - member: log results.
  - team members listed in `CurrentEvent.jsx`: log their own matches.
- **Known risk:** any Discord user who logs in can write to `clan_roles` (and make themselves admin) or edit and delete build orders, plans and results. Fix: role check in the database (RLS using `clan_roles`), admin-only writes on `clan_roles`.
- Preview deployments: Supabase Auth has the redirect URL `https://*-luciocornelios-projects.vercel.app/**`, but each preview domain needs its own login.

## Static data and generators

| File | Generated by | Source |
|---|---|---|
| `public/techtree.json`, `public/civtags.json` | `data_builder/build_data.py` | aoe2techtree data |
| `public/db.json` | `data_builder/generar_db.py` | CSVs in `data_builder/data` (per-map stats, all games and VODs, counters matrix) |
| `public/db_3v3.json` | `data_builder/generar_db_3v3.py` | 3v3 stats |
| `public/aoe/**` + `src/data/aoeIcons.json` | downloaded from aoe2techtree (Nov 2026) | unit, tech, building, resource icons |
| `public/units`, `public/techs`, `public/buildings` | `scripts/icons/descargar_*.py` | AoE wiki icons (older set, still used by `ICON_MAP`) |
| `public/civs`, `public/maps`, `public/teams` | manual | civ emblems, map images, team logos |

`data_builder/main.py` is an old FastAPI engine, replaced by `frontend/src/engine.js` (runs in the browser).

## Conventions

- All UI text in English. No em dashes, no truncating ellipsis.
- Inline styles, colour constants `C` per page.
- Build: `cd frontend && npx vite build`. Existing lint errors (not blockers): `BuildOrderDetail.jsx` unused `_` and reassignment in `AgeSections`; `ClanWarsVII.jsx` setState in effect.
- Git: feature branch, preview, then `main` only when Javier says so. Check deployments with `gh api repos/LucioCornelio/Emputors/deployments?sha=<SHA>&environment=Production`.
