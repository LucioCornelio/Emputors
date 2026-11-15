// Mode 1: villagers needed per resource to sustain constant production (same idea as Survivalist's
// "Villagers Required" tool).
import { econData, gatherRates, RESOURCES } from './rates.js'

// Which res key gathers each resource in the calculation.
const DEFAULT_SOURCE = { food: 'farm', wood: 'wood', gold: 'gold', stone: 'stone' }

/**
 * @param {object} o
 * @param {{unit: string, buildings?: number}[]} o.production units in constant production
 * @param {Set<string>|string[]} [o.techs] researched eco techs
 * @param {Record<string,string>} [o.source] res key used for each resource (default farm, wood, gold, stone)
 * @param {string} [o.civ]
 * @returns {{perSecond: Record<string,number>, villagers: Record<string,number>, total: number, rates: Record<string,number>, lines: object[]}}
 */
export function continuousProduction({ production, techs = [], source = {}, civ = 'Generic', shipSpot = 'deep' }) {
  const rates = gatherRates({ techs: new Set(techs), civ, shipSpot })
  const src = { ...DEFAULT_SOURCE, ...source }
  const perSecond = Object.fromEntries(RESOURCES.map((r) => [r, 0]))
  const lines = []
  for (const { unit, buildings = 1 } of production) {
    const u = econData.units[unit]
    if (!u) throw new Error(`Unknown unit: ${unit}`)
    const line = { unit, buildings, perSecond: {} }
    for (const [res, amount] of Object.entries(u.cost)) {
      const v = (amount / u.time) * buildings
      perSecond[res] += v
      line.perSecond[res] = v
    }
    lines.push(line)
  }
  const villagers = {}
  const usedRates = {}
  let total = 0
  for (const res of RESOURCES) {
    if (!perSecond[res]) continue
    const rate = rates[src[res]].rate
    usedRates[res] = rate
    villagers[res] = perSecond[res] / rate
    total += villagers[res]
  }
  return { perSecond, villagers, total, rates: usedRates, lines }
}
