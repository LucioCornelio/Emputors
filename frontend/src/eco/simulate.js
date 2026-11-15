// Mode 2 core: second by second economy of a build order.
//
// Model (orientation, not exact):
// - Steps run in the order of the build. A step waits until it can be done: its villagers exist,
//   its age is reached, the Town Center is free (TC techs, age ups) and the stock pays its cost.
// - The Town Center trains villagers without pause while a coming step needs more villagers and there
//   is food for the next one (50 food paid when it starts, 25 s).
// - Each villager gathers at the Survivalist rate of the resource in `res`, times the calibration
//   factor of that resource. Builders and villagers waiting for their step gather nothing.
//   Walking and building placement are not modelled: the calibration with the base build absorbs them.
// - Fishing ships are counted from the simulation (trained at the Dock), not from `res`.
// - Buildings are paid when their step runs and are ready after their build time (one builder,
//   several buildings of one step one after another).
// - Units are paid when each one starts training; one unit at a time per producer building.
import { econData, gatherRates, RESOURCES } from './rates.js'
import { parseBuild, TC_TECHS } from './parseBuild.js'

const DEFAULTS = {
  startRes: { food: 200, wood: 200, gold: 100, stone: 200 },
  shipSpot: 'deep',
  civ: 'Generic',
  calib: { food: 1, wood: 1, gold: 1, stone: 1 },
  maxTime: 1800,
  stopAfter: null, // e.g. 'castle age': stop when that age is clicked
}

const AGE_NUMBER = { 'feudal age': 2, 'castle age': 3, 'imperial age': 4 }

const zero = () => Object.fromEntries(RESOURCES.map((r) => [r, 0]))
const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]))

function costOf(items) {
  const c = zero()
  for (const cost of items) for (const [r, v] of Object.entries(cost)) c[r] += v
  return c
}

export function simulate(build, options = {}) {
  const o = { ...DEFAULTS, ...options, calib: { ...DEFAULTS.calib, ...(options.calib || {}) } }
  const { actions, startVils } = parseBuild(build.ages || build)

  const stock = { ...zero(), ...o.startRes }
  const gathered = zero()
  const spent = { villagers: zero(), buildings: zero(), techs: zero(), units: zero(), ages: zero() }
  const techs = new Set()
  let age = 1
  const clicked = new Set()
  let rates = gatherRates({ techs, shipSpot: o.shipSpot, civ: o.civ })

  let alloc = {} // villagers per res key
  let vils = startVils // villagers that exist
  let placed = 0 // villagers placed by a step (the rest wait)
  let tcBusyUntil = 0
  let tcTraining = false
  const buildings = [] // {name, doneAt}
  const queues = {} // producer -> [{unit}]
  const producerBusy = {} // producer -> [doneAt per building]
  let ships = 0
  const pending = [] // timed events {t, fn}
  const events = [] // milestones
  const unitsDone = [] // {unit, t}
  const log = [] // per action: {ref, desc, t, waited, reason, stock}
  const waits = {}
  let idleVilSeconds = 0
  let tcIdleFoodSeconds = 0

  // villagers of the start: placed by the first step(s) with start or vil
  let i = 0
  let t = 0
  let waitedSince = 0

  const ready = (name) => buildings.filter((b) => b.name === name && b.doneAt <= t).length
  const canPay = (cost) => RESOURCES.every((r) => stock[r] >= (cost[r] || 0) - 1e-9)
  const pay = (cost, bucket) => {
    for (const r of RESOURCES) {
      stock[r] -= cost[r] || 0
      spent[bucket][r] += cost[r] || 0
    }
  }
  const missing = (cost) => RESOURCES.find((r) => stock[r] < (cost[r] || 0) - 1e-9)
  const snapshot = () => ({ t, stock: round(stock), gathered: round(gathered), vils, ships })

  // highest villager count a coming step needs before the next TC action
  function villagerTarget() {
    let target = 0
    for (let k = i; k < actions.length; k++) {
      const a = actions[k]
      if (a.tech && TC_TECHS.has(a.tech)) break
      if (a.vil != null) target = Math.max(target, a.vil)
    }
    return target
  }

  function tryAction(a) {
    if (a.needAge > age) return 'age'
    if (a.needClicked && !clicked.has(a.needClicked)) return 'age'
    // villagers
    if (a.vil != null && a.vil > placed) {
      const free = vils - placed
      if (free > 0) {
        // place available villagers one by one on the resources this step adds
        const target = a.res || {}
        for (let n = 0; n < free && placed < a.vil; n++) {
          const key = Object.keys(target).find((k) => k !== 'ship' && k !== 'ship_gold' && (alloc[k] || 0) < target[k])
          if (!key) break
          alloc[key] = (alloc[key] || 0) + 1
          placed++
        }
      }
      if (placed < a.vil) return 'villagers'
    }
    const isTcTech = a.tech && TC_TECHS.has(a.tech)
    if (isTcTech && (tcBusyUntil > t || tcTraining)) return 'tc'
    if (a.tech && !isTcTech) {
      // research building must exist
      if (a.tech === 'double-bit axe' && !ready('lumber camp')) return 'building'
      if (a.tech === 'gold mining' && !ready('mining camp')) return 'building'
      if (a.tech === 'man-at-arms' && !ready('barracks')) return 'building'
    }
    const items = a.buildings.map((b) => econData.buildings[b].cost)
    if (a.tech) items.push(econData.techs[a.tech].cost)
    const cost = costOf(items)
    if (!canPay(cost)) return missing(cost)

    // run it
    let tb = t
    for (const b of a.buildings) {
      pay(econData.buildings[b].cost, 'buildings')
      tb += econData.buildings[b].time
      buildings.push({ name: b, doneAt: tb })
    }
    if (a.tech) {
      const tech = econData.techs[a.tech]
      const ageUp = AGE_NUMBER[a.tech]
      const before = ageUp ? snapshot() : null
      pay(tech.cost, ageUp ? 'ages' : 'techs')
      const done = t + tech.time
      if (isTcTech) tcBusyUntil = done
      if (ageUp) {
        clicked.add(a.tech)
        events.push({ type: 'click', age: a.tech, ...before, after: round(stock) })
        pending.push({ t: done, fn: () => { age = ageUp; events.push({ type: 'arrive', age: a.tech, ...snapshot() }) } })
      } else {
        pending.push({ t: done, fn: () => { techs.add(a.tech); rates = gatherRates({ techs, shipSpot: o.shipSpot, civ: o.civ }) } })
      }
    }
    if (a.train) {
      const q = (queues[a.train.producer] ||= [])
      for (let n = 0; n < a.train.count; n++) q.push({ unit: a.train.unit, ref: a.ref })
    }
    // the villager state after the step (moves, builders); ships come from the simulation
    if (a.res && (a.vil != null || Object.keys(alloc).length)) {
      const next = { ...a.res }
      delete next.ship
      delete next.ship_gold
      if (a.vil != null || sameVillagers(next)) alloc = next
    }
    if (a.vil != null) placed = Math.max(placed, a.vil)
    return null
  }

  function sameVillagers(next) {
    const sum = (r) => Object.values(r).reduce((s, v) => s + v, 0)
    return sum(next) === sum(alloc)
  }

  while (t < o.maxTime) {
    // 1. finished timers
    for (let k = pending.length - 1; k >= 0; k--) {
      if (pending[k].t <= t) {
        const ev = pending.splice(k, 1)[0]
        ev.fn()
      }
    }
    // 2. steps
    while (i < actions.length) {
      const reason = tryAction(actions[i])
      if (reason) {
        const w = (waits[actions[i].ref] ||= { desc: actions[i].desc, seconds: 0, by: {} })
        w.reason = reason
        break
      }
      log.push({ ref: actions[i].ref, desc: actions[i].desc, t, waited: t - waitedSince, ...snapshot() })
      waitedSince = t
      if (o.stopAfter && actions[i].tech === o.stopAfter) {
        i++
        return finish()
      }
      i++
    }
    if (i < actions.length && waits[actions[i].ref]) {
      const w = waits[actions[i].ref]
      w.seconds++
      w.by[w.reason] = (w.by[w.reason] || 0) + 1
    }
    // 3. Town Center villagers
    if (tcBusyUntil <= t && !tcTraining) {
      const cur = actions[i]
      const reserved = cur && cur.tech && TC_TECHS.has(cur.tech)
      if (!reserved && villagerTarget() > vils) {
        if (stock.food >= 50) {
          pay(econData.units.villager.cost, 'villagers')
          tcTraining = true
          tcBusyUntil = t + econData.units.villager.time
          pending.push({ t: tcBusyUntil, fn: () => { vils++; tcTraining = false } })
        } else tcIdleFoodSeconds++
      }
    }
    // 4. other production buildings
    for (const [producer, q] of Object.entries(queues)) {
      const slots = (producerBusy[producer] ||= [])
      const count = ready(producer)
      while (slots.length < count) slots.push(0)
      for (let s = 0; s < count && q.length; s++) {
        if (slots[s] > t) continue
        const u = econData.units[q[0].unit]
        if (!canPay(u.cost)) break
        const job = q.shift()
        pay(u.cost, 'units')
        slots[s] = t + u.time
        pending.push({ t: slots[s], fn: () => { unitsDone.push({ unit: job.unit, t: slots[s] }); if (job.unit === 'fishing ship') ships++ } })
      }
    }
    // 5. gathering during this second
    idleVilSeconds += Math.max(0, vils - placed)
    for (const [key, n] of Object.entries(alloc)) {
      const r = rates[key]
      if (!r || !n) continue
      const v = r.rate * n * o.calib[r.res]
      stock[r.res] += v
      gathered[r.res] += v
    }
    if (ships) {
      const r = rates.ship
      stock.food += r.rate * ships * o.calib.food
      gathered.food += r.rate * ships * o.calib.food
    }
    t++
    if (i >= actions.length && !pending.length && Object.values(queues).every((q) => !q.length)) break
  }
  return finish()

  function finish() {
    return {
      t,
      done: i >= actions.length,
      stoppedAt: i < actions.length ? actions[i].ref : null,
      stock: round(stock),
      gathered: round(gathered),
      spent: Object.fromEntries(Object.entries(spent).map(([k, v]) => [k, round(v)])),
      events,
      unitsDone,
      log,
      waits: Object.fromEntries(Object.entries(waits).filter(([, w]) => w.seconds > 0)),
      idleVilSeconds,
      tcIdleFoodSeconds,
      calib: o.calib,
    }
  }
}
