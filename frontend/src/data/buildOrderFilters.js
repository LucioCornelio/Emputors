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
