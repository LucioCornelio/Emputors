// Calibration with the base build and comparison base vs variant.
//
// The base build works in real games, so at its Feudal Age click there is just enough food and the
// Town Center never waited. calibrate() finds the factor on the Survivalist food rate that makes the
// simulation behave like that (it absorbs walking, luring, building placement). Wood and gold are only
// raised when the simulation says the base build could not pay its steps; they are never lowered.
// The same factors are then used for the variant, so what matters is the difference, not the totals.
import { simulate } from './simulate.js'
import { RESOURCES } from './rates.js'

const PLENTY = 5
const TOLERANCE = 2 // seconds of delay at the click still counted as "on time"

function clickTime(result, age = 'feudal age') {
  return result.events.find((e) => e.type === 'click' && e.age === age)?.t ?? Infinity
}

function minFactor(fn, lo = 0.5, hi = 1.5) {
  if (!fn(hi)) return null
  for (let n = 0; n < 24; n++) {
    const mid = (lo + hi) / 2
    if (fn(mid)) hi = mid
    else lo = mid
  }
  return Math.round(hi * 1000) / 1000
}

/**
 * @param {object} base build (with ages)
 * @param {object} [options] simulate() options (startRes, shipSpot, civ)
 * @param {string} [age] the click used to calibrate
 */
export function calibrate(base, options = {}, age = 'feudal age') {
  const run = (calib) => simulate(base, { ...options, calib, stopAfter: age })
  const ideal = clickTime(run({ food: PLENTY, wood: PLENTY, gold: PLENTY, stone: PLENTY }))
  if (!Number.isFinite(ideal)) throw new Error(`The base build never clicks ${age}`)
  const ok = (calib) => clickTime(run(calib)) <= ideal + TOLERANCE
  // Wood and gold stay at the Survivalist rate unless the base build could not pay its steps with it
  let wood = 1
  let gold = 1
  if (!ok({ food: PLENTY, wood, gold, stone: 1 })) {
    wood = minFactor((w) => ok({ food: PLENTY, wood: w, gold: PLENTY, stone: 1 }), 1, 2) ?? 2
    gold = minFactor((g) => ok({ food: PLENTY, wood, gold: g, stone: 1 }), 1, 2) ?? 2
  }
  const food = minFactor((f) => ok({ food: f, wood, gold, stone: 1 }))
  if (food == null) throw new Error('Food calibration failed: the base build is short of food even with +50% rates')
  return { calib: { food, wood, gold, stone: 1 }, idealClick: ideal, age }
}

function milestones(result) {
  const out = {}
  for (const e of result.events) out[`${e.type} ${e.age}`] = { t: e.t, stock: e.stock, gathered: e.gathered, vils: e.vils, ships: e.ships }
  const seen = {}
  for (const u of result.unitsDone) {
    seen[u.unit] = (seen[u.unit] || 0) + 1
    out[`${u.unit} ${seen[u.unit]}`] = { t: u.t }
  }
  return out
}

const diff = (a = {}, b = {}) => Object.fromEntries(RESOURCES.map((r) => [r, (b[r] || 0) - (a[r] || 0)]))

/**
 * Runs base and variant with the base calibration.
 * @returns {{calibration, base, variant, milestones: object[], effects: object}}
 */
export function compareBuilds(base, variant, options = {}) {
  const calibration = options.calibration || calibrate(base, options)
  const opts = { ...options, calib: calibration.calib }
  delete opts.calibration
  const rb = simulate(base, opts)
  const rv = simulate(variant, opts)
  const mb = milestones(rb)
  const mv = milestones(rv)
  const keys = [...new Set([...Object.keys(mb), ...Object.keys(mv)])]
  const rows = keys.map((k) => ({
    milestone: k,
    base: mb[k] || null,
    variant: mv[k] || null,
    dt: mb[k] && mv[k] ? mv[k].t - mb[k].t : null,
    dStock: mb[k]?.stock && mv[k]?.stock ? diff(mb[k].stock, mv[k].stock) : null,
  }))
  // Effects up to the Feudal Age click of each build: gathered, spent per kind, click time
  const at = (r, age) => {
    const e = r.events.find((x) => x.type === 'click' && x.age === age)
    return e ? { t: e.t, gathered: e.gathered } : null
  }
  const sb = simulate(base, { ...opts, stopAfter: 'feudal age' })
  const sv = simulate(variant, { ...opts, stopAfter: 'feudal age' })
  const spentDiff = Object.fromEntries(Object.keys(sb.spent).map((k) => [k, diff(sb.spent[k], sv.spent[k])]))
  const effects = {
    clickFeudal: { base: at(sb, 'feudal age')?.t, variant: at(sv, 'feudal age')?.t },
    gathered: diff(sb.gathered, sv.gathered),
    spent: spentDiff,
    stockAtClick: diff(sb.events[0]?.stock, sv.events[0]?.stock),
  }
  return { calibration, base: rb, variant: rv, milestones: rows, effects }
}

/** Seconds as m:ss */
export const clock = (s) => (s == null || !Number.isFinite(s) ? '-' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`)
