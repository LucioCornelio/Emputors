# Handoff: status and pending work

Last update: 12 Nov 2026 (move of the website work into the "Emputors web" project).

## How Javier works

- Talks in Spanish; the website is in English.
- Sets the pace: one request at a time. Likes to see a screenshot or mockup before big visual changes, and asks "a producción" when he wants a change live.
- Judges visual work hard: clean, quiet, consistent. Loud or cluttered elements get rejected ("cantoso", "sucio"). Information density is welcome if it is tidy.

## Done in November 2026

- Build order JSON standard applied to all builds (tasks, texts, icons, phase names, reorganisations split one move per row, checkpoint rows with NEW ECO). Backup of the previous data in `backup.build_orders_20261112`.
- Real game icons (aoe2techtree) in build orders; custom resource art (food under TC, berries, deer, fish, fishing ship); wood, gold and stone icons always on their resource colour.
- Notes: advice behind an (i) tooltip (hover or tap), hidden in Game Mode; hidden actions turned into their own steps.
- Villager columns in BuildOrderDetail:
  - cyan in-game style counter (villager portraits icon) = villagers you see in game when the step starts; only on steps that add villagers; start count fixed at 3;
  - total after the step: gold "→ N" when villagers grow, grey "= N" on moves, gold on age up rows;
  - fishing ships shown apart ("+N"), never counted as villagers (the in-game counter does not count them).
- Age up rows: same height and number size as other rows, text in bold gold.
- Subtle horizontal guides between steps.
- Build Drill (`/academy/build-orders/:id/drill`, "Practice" button): schematic map with trees, sheep and boar under the TC, berries, deer, mines, shore and deep water, golden farms that grow with farmers; villager spawner with + and -, drag or click; building palette with Build and research/train menus; validation per step (villagers, buildings, command); hints after 2 misses; Reveal; "Don't forget" popup for steps without villager work; How to play panel; log of the build.
- New build `any-hybrid-21-4-fire-galleys-archers` (21+4 Vils, Any, Hybrid, Fire Galleys into Archers).
- Repo cleanup: Supabase client is now a dependency of `frontend/`, committed root `node_modules` removed, unused files removed, icon scripts in `scripts/`.

## Pending, in suggested order

1. **Security (priority):** RLS by role. Today any Discord login can write everywhere, including `clan_roles`. Proposal: a SQL function that reads the role of the current user from `clan_roles`, admin-only writes on `clan_roles`, `build_orders`, `cw7_draft_plans`; members for `match_results` and rival scouting. Needs Javier's approval of the exact policies.
2. **Build order consistency audit** (build-orders skill, validator over all builds). Rule agreed: when something is built, it appears in the text and in the icon. Known cases in "17 Vils | Any | Arabia | Forward Archery Range":
   - "2 vils to wood" shows the Lumber Camp icon but the text does not say it is built;
   - "Move 2 from stragglers to gold and build a Mining Camp" says it in the text but has no icon;
   - "Move 5 from stragglers to the Lumber Camp" shows crossed swords (default fallback icon), wrong.
   Many `reallocate` rows that build something have `icon: null`; check all builds.
3. **Hybrid build, to confirm with Javier:** civ ("Any" was assumed), map image (`public/maps/Hybrid.png` missing), assumptions made from his Excel: first wood vil builds the Lumber Camp; the 4 vils moved from wood to food go to berries and build a Mill; the 2 Archery Range builders come from wood; his note "1 from berries + barrack builder" did not match the numbers and was left out.
4. **More visual adjustments to build order rows:** Javier announced more; wait for his list.
5. **Build Drill next steps** (proposed, not started): Drill hub with filters and mastery per build; Study mode (blocks grouped by rules, cover and reveal); Quiz mode ("What's next?", 5 options with tricky distractors: wrong villager count, later step, other resource, same step from another build); progress saving (open question: private per user or visible to the clan); optional strict order inside combined steps; building counts ("Build 2 Houses" currently accepts one).
6. Start villager count is fixed at 3; civs that start with more villagers would need a field in the build.
7. Placeholders without content: Past Events, Hall of Fame, Roster, About.
8. `TODO.md`: tag cloud in Advanced Search, clean old icons, bold numbers and keywords (done for build orders).
