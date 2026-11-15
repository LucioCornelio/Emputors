// Turns the steps of a build order (build_orders.ages, standard of the build-orders skill) into actions
// the simulation understands. Only what costs resources or changes the economy is read: villagers and
// their resource (vil, res), buildings (icon + desc), research, training and age ups.
import { econData } from './rates.js'

// Icon key prefix (lowercase) -> building name in econData.buildings
const BUILDING_ICONS = [
  ['house', 'house'],
  ['dock', 'dock'],
  ['lumber_camp', 'lumber camp'],
  ['mining_camp', 'mining camp'],
  ['mill', 'mill'],
  ['barracks', 'barracks'],
  ['archery_range', 'archery range'],
  ['stable', 'stable'],
  ['blacksmith', 'blacksmith'],
  ['market', 'market'],
  ['town_center', 'town center'],
  ['outpost', 'outpost'],
  ['monastery', 'monastery'],
]

// Unit -> building that trains it
const PRODUCER = {
  villager: 'town center',
  'fishing ship': 'dock',
  'transport ship': 'dock',
  galley: 'dock',
  'fire galley': 'dock',
  'demolition raft': 'dock',
  militia: 'barracks',
  'man-at-arms': 'barracks',
  spearman: 'barracks',
  'eagle scout': 'barracks',
  archer: 'archery range',
  skirmisher: 'archery range',
  'scout cavalry': 'stable',
  knight: 'stable',
  'camel scout': 'stable',
}

// Techs researched at the Town Center (they stop villager production)
export const TC_TECHS = new Set(['loom', 'wheelbarrow', 'hand cart', 'town watch', 'town patrol', 'feudal age', 'castle age', 'imperial age'])

// Phase name -> [age the step needs, clicked age it needs]
const PHASES = {
  'Dark Age': { age: 1 },
  'Advancing to Feudal Age': { age: 1, clicked: 'feudal age' },
  'Feudal Age': { age: 2 },
  'Advancing to Castle Age': { age: 2, clicked: 'castle age' },
  'Castle Age': { age: 3 },
  'Advancing to Imperial Age': { age: 3, clicked: 'imperial age' },
  'Imperial Age': { age: 4 },
}

export function singularUnit(name) {
  const n = name.toLowerCase().trim()
  if (econData.units[n]) return n
  for (const cut of [1, 2]) {
    const s = n.slice(0, -cut)
    if (econData.units[s]) return s
  }
  throw new Error(`Unknown unit: ${name}`)
}

function techName(name) {
  const n = name.toLowerCase().trim()
  if (!econData.techs[n]) throw new Error(`Unknown tech: ${name}`)
  return n
}

const PLURALS = { 'archery range': 'archery ranges', house: 'houses', barracks: 'barracks', farm: 'farms', dock: 'docks', 'lumber camp': 'lumber camps', 'mining camp': 'mining camps', mill: 'mills', stable: 'stables', outpost: 'outposts' }

function buildingsOf(step, prevRes) {
  const icons = Array.isArray(step.icon) ? step.icon : step.icon ? [step.icon] : []
  const list = []
  for (const icon of icons) {
    const key = String(icon).toLowerCase()
    const hit = BUILDING_ICONS.find(([prefix]) => key.startsWith(prefix))
    if (hit) list.push(hit[1])
  }
  // "build 2 Archery Ranges": the number in the text wins over a single icon
  const desc = (step.desc || '').toLowerCase()
  const counted = []
  for (const name of new Set(list)) {
    const m = desc.match(new RegExp(`(\\d+) (?:${name}|${PLURALS[name] || name + 's'})\\b`))
    const n = m ? Number(m[1]) : list.filter((b) => b === name).length
    for (let i = 0; i < n; i++) counted.push(name)
  }
  // Farms: one per new farmer
  const farmDelta = (step.res?.farm || 0) - (prevRes?.farm || 0)
  for (let i = 0; i < farmDelta; i++) counted.push('farm')
  return counted
}

/**
 * @param {object[]} ages build_orders.ages
 * @returns {{actions: object[], startVils: number}}
 */
export function parseBuild(ages) {
  const actions = []
  let prevRes = {}
  let startVils = 0
  ages.forEach((phase, a) => {
    const req = PHASES[phase.name]
    if (!req) throw new Error(`Unknown phase: ${phase.name}`)
    phase.steps.forEach((step, s) => {
      const desc = step.desc || ''
      const act = {
        ref: `${a}.${s}`,
        phase: phase.name,
        desc,
        needAge: req.age,
        needClicked: req.clicked || null,
        vil: step.vil == null ? null : Number(step.vil),
        res: step.res && Object.keys(step.res).length ? { ...step.res } : null,
        buildings: buildingsOf(step, prevRes),
        tech: null,
        train: null,
      }
      if (step.start) startVils = Math.max(startVils, act.vil || 0)
      const research = desc.match(/^Research (.+)$/i)
      if (step.task === 'research' && research) act.tech = techName(research[1])
      const click = desc.match(/^Click (Feudal|Castle|Imperial) Age/i)
      if (step.task === 'age_up' && click) act.tech = `${click[1].toLowerCase()} age`
      const train = desc.match(/^Train (\d+) (.+)$/i)
      if (step.task === 'train' && train) {
        const unit = singularUnit(train[2])
        act.train = { unit, count: Number(train[1]), producer: PRODUCER[unit] }
        if (!act.train.producer) throw new Error(`No producer known for ${unit}`)
      }
      if (act.res) prevRes = act.res
      actions.push(act)
    })
  })
  return { actions, startVils: startVils || 3 }
}
