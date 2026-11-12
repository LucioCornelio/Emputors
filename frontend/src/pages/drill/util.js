// Grass texture for the board
export const GRASS_BG = {
  backgroundColor: '#5a7c36',
  backgroundImage: [
    'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.05) 0 2px, transparent 3px)',
    'radial-gradient(circle at 70% 60%, rgba(0,0,0,0.06) 0 2px, transparent 3px)',
    'radial-gradient(ellipse at 30% 70%, rgba(40,70,20,0.35), transparent 45%)',
    'radial-gradient(ellipse at 75% 25%, rgba(110,140,60,0.30), transparent 40%)',
  ].join(','),
  backgroundSize: '22px 22px, 31px 31px, 100% 100%, 100% 100%',
};

// Small deterministic RNG so every forest looks the same on every visit
export const rng = (seed) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
