# Handoff: status and pending work

Last update: 13 Nov 2026 (build order list filters).

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
- 6 builds imported from Javier's Excel (12 Nov 2026): `khmer-any-22pop-fc-knights`, `any-arena-26pop-fc-scouts-monks`, `hindustanis-any-24pop-fc-camels`, `any-any-24pop-fc-boom`, `any-arena-25pop-castle-drop`, `any-any-27pop-drush-fc`. Backups `backup.build_orders_20261112_excel`, `_excel2`, `_excel3`. Title rule: `N+M Vils` = N villagers at the Feudal Age click, M villagers added before the Castle Age click. Builds that do not depend on a map use map `Any`, drawn by `public/maps/Any.png` (Castle Age shield). Drush FC moves during the advance to Feudal were filled in by Claude at Javier's request (no source data).
- Build order audit (12 Nov 2026): 13 checks of the build-orders skill run on the 10 builds and every finding fixed with Javier's data (villager counts in every phase, buildings in text and icon, no default icons, res only on villager steps, NEW ECO only on global redistributions). Backups `backup.build_orders_20261112_scouts`, `_std9`, `_round3`, `_round4`. Age up steps accept `vil_label` (e.g. "75-80") to show a target instead of the last counted total (Burgundians Imperial Age).
- Tres Leches build (13 Nov 2026): clone of Hybrid with 9 starting villagers. Steps with `"start": true` are the villagers the game starts with (maps that start with more than 3): no in-game counter and they set the starting total. Map image `public/maps/Tres Leches.png`. Backup `backup.build_orders_20261113_tresleches`.
- Build order detail for big screens (13 Nov 2026): page up to 1200px with a proportional zoom of the whole build (auto 1.0 up to 1366px, about 1.26 at 1920px); navbar and title card take the same width as the content (`html[data-page-w]` sets `#root` width); A- / A+ control next to Game Mode (80% to 150%, stored in localStorage `bo-size-v2`). Game Mode scrolls the Dark Age header to the top and shows tall blinking page down bars at mid height on both sides (the 4th visible line from the bottom becomes the top line). Mobile layout unchanged.
- Build order list filters (13 Nov 2026): new column `build_orders.strategy_groups` (jsonb array; Fast Castle, Militia Rush (Drush), Scout Rush, Archer Rush, Men-at-Arms Rush, Hybrid; Drush FC is in two groups). The strategy filter uses the groups; the detailed strategy stays in the title and the card tag (clicking it filters by the build's first group). "With VOD" checkbox shows only builds with a video. Admin editor requires at least one group. Backup `backup.build_orders_20261113_filters`. A closed list of traits was proposed and rejected by Javier.
- Repo cleanup: Supabase client is now a dependency of `frontend/`, committed root `node_modules` removed, unused files removed, icon scripts in `scripts/`.

## Pending, in suggested order

1. **Security:** RLS by role applied in Supabase on 12 Nov 2026 (see architecture.md). Web changes (teams from `leat11_team_members`, CW7 login notice, Sabaronte schedule fix) on branch `claude/project-thread-facz6b`, pending Javier's review and "a producción". Next step suggested: store the numeric Discord ID in `clan_roles` so roles survive nickname changes.
2. **Build order audit:** done (see above).
3. **Hybrid build:** assumptions from his Excel confirmed by Javier on 12 Nov 2026.
4. **More visual adjustments to build order rows:** Javier announced more; wait for his list.
5. **Build Drill next steps** (proposed, not started): Drill hub with filters and mastery per build; Study mode (blocks grouped by rules, cover and reveal); Quiz mode ("What's next?", 5 options with tricky distractors: wrong villager count, later step, other resource, same step from another build); progress saving (open question: private per user or visible to the clan); optional strict order inside combined steps; building counts ("Build 2 Houses" currently accepts one).
6. Start villager count is fixed at 3; civs that start with more villagers would need a field in the build.
7. Placeholders without content: Past Events, Hall of Fame, Roster, About.
8. `TODO.md`: tag cloud in Advanced Search, clean old icons, bold numbers and keywords (done for build orders).

## Ideas para más adelante

Ideas noted by Javier on 13 Nov 2026. Not started: do not implement until he asks.

1. **Build order variants by differences (main goal).** Not a full simulator: start from a build that already works and calculate only the effect of a change, because the existing build already includes the real walking times and building placement. It must answer questions such as:
   - "Can I do this build with one villager less?": resources missing or left over at the age up click, seconds the click moves earlier, and which reorganization compensates.
   - "I want constant ship production from the dock and a single archery range instead of 3 galleys and 2 archery ranges": difference in consumption per resource, villagers needed on each resource and in which steps to move them.

   Key rule: every change is calculated with all its effects, not only the obvious one. Example: one villager less means about 60 food less gathered, but also 50 food not spent on creating it (net about 10 less), and it also frees TC time that moves the click earlier and reduces what the other villagers gather until then. Results are estimates and are shown with their assumptions.

   The maths is done by a deterministic module (costs, production times, gather rates, economy upgrades). The build-orders skill uses it and returns the modified build in the standard format. First test case: Hybrid with constant ship production and 1 archery range.

2. **Eco Calculator.** Its own section of the website, equivalent to https://aoe2-de-tools.herokuapp.com/villagers-required/ (villagers required for constant production, with economy and civilization bonuses), with a better design and using the same calculation module. Data: costs and times from the aoe2techtree data we already use; gather rates measured by Survivalist (credit Survivalist on the page). To do first: find out exactly where that page gets its data.

   Gather rates (clarified by Javier on 13 Nov 2026): calculations use the effective rates (walking included) measured by Survivalist. The page shows a visible citation crediting Survivalist with a link to the tool (https://aoe2-de-tools.herokuapp.com/villagers-required/). Raw in-game rates (Age of Empires wiki on Fandom) are only a reference or fallback.
