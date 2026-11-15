// Run with: npm run test:eco (from frontend/)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gatherRates, econData } from './rates.js'
import { continuousProduction } from './continuous.js'
import { parseBuild } from './parseBuild.js'
import { simulate } from './simulate.js'
import { calibrate, compareBuilds } from './compare.js'
import hybrid from './fixtures/hybrid.json' with { type: 'json' }
import hybridMaa from './fixtures/hybrid-maa.json' with { type: 'json' }

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`)

test('Survivalist rates are loaded with their upgrades', () => {
  const dark = gatherRates()
  near(dark.wood.rate, 0.39, 0.001, 'lumberjack')
  near(dark.farm.rate, 0.338, 0.001, 'farmer')
  near(dark.ship.rate, 25.3 / 60, 0.001, 'fishing ship deep')
  near(dark.underTC.rate, 0.33, 0.001, 'shepherd')
  const feudal = gatherRates({ techs: new Set(['double-bit axe', 'gold mining', 'wheelbarrow']) })
  near(feudal.wood.rate, 0.468, 0.001, 'double-bit axe')
  near(feudal.gold.rate, 0.437, 0.001, 'gold mining')
  near(feudal.farm.rate, 23.03 / 60, 0.001, 'farm with wheelbarrow')
  assert.ok(econData.source.survivalist.commit.length >= 7)
})

test('Constant production: villagers per resource', () => {
  // Fire Galley 75 W 45 G in 49 s, Feudal rates with Double-Bit Axe
  const r = continuousProduction({ production: [{ unit: 'fire galley', buildings: 1 }], techs: ['double-bit axe'] })
  near(r.villagers.wood, 75 / 49 / 0.468, 0.01, 'wood')
  near(r.villagers.gold, 45 / 49 / 0.38, 0.01, 'gold')
  const two = continuousProduction({ production: [{ unit: 'fire galley', buildings: 2 }, { unit: 'archer', buildings: 1 }] })
  near(two.perSecond.gold, (2 * 45) / 49 + 45 / 35, 0.001, 'gold per second')
})

test('Build parsing reads buildings, techs, units and age ups', () => {
  const { actions, startVils } = parseBuild(hybrid.ages)
  assert.equal(startVils, 3)
  const byDesc = (d) => actions.find((a) => a.desc.startsWith(d))
  assert.deepEqual(byDesc('1 vil builds House, Dock and House').buildings, ['house', 'house', 'dock'])
  assert.deepEqual(byDesc('2 vils from stragglers build 2 Archery Ranges').buildings, ['archery range', 'archery range'])
  assert.equal(byDesc('10 vils to farms').buildings.length, 10)
  assert.deepEqual(byDesc('Train 4 Fishing Ships').train, { unit: 'fishing ship', count: 4, producer: 'dock' })
  assert.equal(byDesc('Click Feudal Age').tech, 'feudal age')
  assert.equal(byDesc('Research Double-Bit Axe').tech, 'double-bit axe')
})

test('Simulation of the base Hybrid: Town Center never waits for food and the click comes after 21 vils and Loom', () => {
  const r = simulate(hybrid, { calib: { food: 5, wood: 5, gold: 5 }, stopAfter: 'feudal age' })
  const click = r.events.find((e) => e.type === 'click')
  assert.equal(click.t, 18 * 25 + 25) // 18 villagers and Loom
  assert.equal(click.vils, 21)
  assert.equal(r.tcIdleFoodSeconds, 0)
})

test('Calibration: the base build has just enough food at the Feudal click', () => {
  const cal = calibrate(hybrid)
  assert.ok(cal.calib.food > 0.7 && cal.calib.food < 1.2, `food factor ${cal.calib.food}`)
  const r = simulate(hybrid, { calib: cal.calib, stopAfter: 'feudal age' })
  const click = r.events.find((e) => e.type === 'click')
  near(click.t, cal.idealClick, 3, 'click on time')
  near(click.stock.food, 500, 15, 'food at the click')
})

test('One villager less: 50 food not spent, less gathered, earlier click (all effects)', () => {
  const v = structuredClone(hybrid)
  const dark = v.ages[0].steps
  dark[6] = { ...dark[6], vil: 20, desc: '6 vils to food under TC (13 total)', res: { ...dark[6].res, underTC: 13 } }
  for (let k = 7; k < dark.length; k++) {
    if (dark[k].vil) dark[k].vil = 20
    if (dark[k].res.underTC) dark[k].res = { ...dark[k].res, underTC: 13 }
  }
  v.ages[1].steps.forEach((s) => { if (s.vil) s.vil = 20 })
  v.ages[1].steps[0].res = { ...v.ages[1].steps[0].res, underTC: 5 }
  const c = compareBuilds(hybrid, v)
  assert.equal(c.effects.spent.villagers.food, -50)
  assert.ok(c.effects.gathered.food < -20, `food gathered ${c.effects.gathered.food}`)
  const dt = c.effects.clickFeudal.variant - c.effects.clickFeudal.base
  assert.ok(dt < 0 && dt > -25, `click moves earlier but less than one villager time: ${dt}`)
})

test('Test case: Hybrid into Men-at-Arms keeps the Feudal timing and has 3 Militia before Feudal', () => {
  const c = compareBuilds(hybrid, hybridMaa)
  const row = (k) => c.milestones.find((m) => m.milestone === k)
  const click = row('click feudal age')
  assert.ok(click.dt <= 2, `Feudal click delay ${click.dt}`)
  const arrive = row('arrive feudal age').variant.t
  assert.ok(row('militia 3').variant.t <= arrive, 'third Militia ready before reaching Feudal')
  const firstGalley = row('fire galley 1')
  assert.ok(firstGalley.dt <= 15, `first Fire Galley delay ${firstGalley.dt}`)
  // no step waits for food or gold more than a few seconds after the click
  for (const [ref, w] of Object.entries(c.variant.waits)) {
    if (ref.startsWith('0.')) continue
    assert.ok((w.by.food || 0) <= 5 && (w.by.gold || 0) <= 5, `${w.desc} waits ${JSON.stringify(w.by)}`)
  }
})
