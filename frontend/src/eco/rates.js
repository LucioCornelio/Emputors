// Gather rates (resources per second per villager or fishing ship) for the resource keys used in
// build order steps (`res`). All rates come from Survivalist's data (econData.json).
import econ from './econData.json' with { type: 'json' }

export const RESOURCES = ['food', 'wood', 'gold', 'stone']

// Build order res key -> Survivalist gatherer. underTC (sheep and boar together) uses the shepherd rate:
// the calibration of the base build absorbs the difference.
const BASE_GATHERER = {
  sheep: 'shepherd',
  underTC: 'shepherd',
  chicken: 'shepherd',
  hunt: 'hunter',
  boar: 'hunter',
  berries: 'forager',
  fish: 'fisherman',
}

// Upgrade chains: the gather rate name Survivalist uses after the last researched upgrade.
const WOOD_CHAIN = ['double-bit axe', 'bow saw', 'two-man saw']
const GOLD_CHAIN = ['gold mining', 'gold shaft mining']
const STONE_CHAIN = ['stone mining', 'stone shaft mining']

function chainRate(base, chain, techs) {
  let rate = econ.gather[base].rate
  let name = base
  for (const tech of chain) {
    if (!techs.has(tech)) break
    rate *= econ.techs[tech]?.gather?.mult ?? 1
    name = tech
  }
  return { name, rate }
}

function farmGatherer(techs) {
  const plow = techs.has('heavy plow')
  if (techs.has('hand cart')) return 'hand cart'
  if (techs.has('wheelbarrow')) return plow ? 'wheelbarrow heavy plow' : 'wheelbarrow'
  return plow ? 'farm heavy plow' : 'farmer'
}

function shipGatherer(techs, spot) {
  const base = `fishing ship ${spot}`
  if (techs.has('gillnets')) return `${base} gillnets`
  if (techs.has('fishing lines')) return `${base} fishing lines`
  return base
}

function civBonus(civ, name) {
  const bonus = econ.civBonuses[civ]?.[name]
  return typeof bonus === 'number' ? 1 + bonus : 1
}

/**
 * Rates for every res key, given the researched techs.
 * @param {object} o
 * @param {Set<string>} [o.techs] researched techs (Survivalist names, lowercase)
 * @param {'deep'|'shore'} [o.shipSpot] where fishing ships fish
 * @param {string} [o.civ] key of econ.civBonuses (Generic by default)
 * @returns {Record<string, {res: string, rate: number, gatherer: string}>}
 */
export function gatherRates({ techs = new Set(), shipSpot = 'deep', civ = 'Generic' } = {}) {
  const out = {}
  const put = (key, gatherer, rate, res) => {
    out[key] = { res, gatherer, rate: rate * civBonus(civ, gatherer) }
  }
  for (const [key, gatherer] of Object.entries(BASE_GATHERER)) {
    put(key, gatherer, econ.gather[gatherer].rate, 'food')
  }
  const farm = farmGatherer(techs)
  put('farm', farm, econ.gather[farm].rate, 'food')
  const ship = shipGatherer(techs, shipSpot)
  put('ship', ship, econ.gather[ship].rate, 'food')
  const wood = chainRate('lumberjack', WOOD_CHAIN, techs)
  put('wood', wood.name, wood.rate, 'wood')
  const gold = chainRate('gold miner', GOLD_CHAIN, techs)
  put('gold', gold.name, gold.rate, 'gold')
  const stone = chainRate('stone miner', STONE_CHAIN, techs)
  put('stone', stone.name, stone.rate, 'stone')
  return out
}

export const econData = econ
