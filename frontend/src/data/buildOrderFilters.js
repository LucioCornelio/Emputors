// Closed list used by the Build Orders filters and the admin editor.
// Stored in build_orders.strategy_groups (jsonb array of these labels).
// Order here is the order shown in the filters.

export const STRATEGY_GROUPS = [
  'Fast Castle',
  'Militia Rush (Drush)',
  'Scout Rush',
  'Archer Rush',
  'Men-at-Arms Rush',
  'Hybrid',
];

export const asList = (v) => (Array.isArray(v) ? v : []);

// Villagers the game starts with: the total of the steps flagged "start" (default 3)
export const startVils = (b) => {
  let n = 3;
  (b?.ages || []).forEach(a => (a.steps || []).forEach(s => { if (s.start && typeof s.vil === 'number') n = Math.max(n, s.vil); }));
  return n;
};

// The start badge is only for unusual starts: 3 is the normal start and 6 is the usual Chinese start
export const showStartBadge = (n) => n !== 3 && n !== 6;

// Builds still being worked out (tag "Under Construction"): shown with a badge
export const UNDER_CONSTRUCTION = 'Under Construction';
export const underConstruction = (b) => asList(b?.tags).includes(UNDER_CONSTRUCTION);
