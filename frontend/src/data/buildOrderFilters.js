// Closed lists used by the Build Orders filters and the admin editor.
// Stored in build_orders.strategy_groups and build_orders.traits (jsonb arrays of these labels).
// Order here is the order shown in the filters.

export const STRATEGY_GROUPS = [
  'Fast Castle',
  'Militia Rush (Drush)',
  'Scout Rush',
  'Archer Rush',
  'Men-at-Arms Rush',
  'Hybrid',
];

export const TRAITS = [
  'Water units',
  'Fish economy',
  'Hunt economy',
  'Town Center boom',
  'Palisade walls',
  'Monks and relics',
];

export const asList = (v) => (Array.isArray(v) ? v : []);
