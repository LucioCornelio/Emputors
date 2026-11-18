import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rivalChoices, fitRivalModel, analyzeScenarios, matchWinChance } from './mapDraftEngine.js';

const POOL = ['Colosseum', 'Crescent', 'Fortress', 'Grand Bara', 'Nomad', 'Socotra', 'Tres Leches'];
const drafts = JSON.parse(readFileSync(new URL('./mapDraftEngine.fixture.json', import.meta.url)));
const OURS = { Colosseum: 0.62, Socotra: 0.60, 'Tres Leches': 0.58, 'Grand Bara': 0.52, Nomad: 0.45, Fortress: 0.42, Crescent: 0.38 };

test('a snipe only compares the two maps of the pair', () => {
  const c = rivalChoices(drafts[0], POOL);
  const snipe = c.find(x => x.kind === 'snipe');
  assert.deepEqual(snipe.options.sort(), ['Colosseum', 'Nomad']);
  const ban = c.find(x => x.kind === 'ban');
  assert.deepEqual(ban.options.sort(), ['Crescent', 'Grand Bara', 'Tres Leches']);
});

test('DK model: favourites on top, Colosseum and Tres Leches close', () => {
  const { utility: u } = fitRivalModel(drafts, POOL);
  const order = [...POOL].sort((a, b) => u[b] - u[a]);
  assert.deepEqual(order.slice(0, 3), ['Socotra', 'Nomad', 'Fortress']);
  assert.ok(Math.abs(u.Colosseum - u['Tres Leches']) < 0.15);
});

test('match win chance (2 of 3)', () => {
  assert.equal(matchWinChance([0.5, 0.5, 0.5]), 0.5);
  assert.ok(Math.abs(matchWinChance([0.6, 0.6, 0.6]) - 0.648) < 1e-9);
});

test('scenarios: probabilities add up and every final has 3 maps', () => {
  const { utility } = fitRivalModel(drafts, POOL);
  [true, false].forEach(weFirst => {
    const r = analyzeScenarios({ pool: POOL, ours: OURS, utility, weFirst });
    const total = r.finals.reduce((a, f) => a + f.prob, 0);
    assert.ok(Math.abs(total - 1) < 1e-3, `total ${total}`);
    r.finals.forEach(f => assert.equal(f.maps.length, 3));
    assert.ok(r.winChance > 0.5 && r.winChance < 0.7);
    assert.ok(r.lines.length > 0);
  });
});

test('with Nomad + Socotra from the rival, we never ban Socotra and we pick Tres Leches', () => {
  const { utility } = fitRivalModel(drafts, POOL);
  const r = analyzeScenarios({ pool: POOL, ours: OURS, utility, weFirst: true, firstPick: 'Colosseum' });
  assert.equal(r.lines[0].steps[0].map, 'Colosseum');
  assert.equal(r.firstPicks.length, 7);
  const line = r.lines.find(l => l.theirPicks.join() === 'Nomad,Socotra');
  assert.ok(line);
  const ourPicks = line.steps.filter(s => s.us && s.kind === 'pick').map(s => s.map);
  assert.ok(ourPicks.includes('Tres Leches'));
});

test('our own choice at a point of the draft is followed and changes the outcome', () => {
  const { utility } = fitRivalModel(drafts, POOL);
  const base = analyzeScenarios({ pool: POOL, ours: OURS, utility, weFirst: true, firstPick: 'Colosseum' });
  const line = base.lines.find(l => l.theirPicks.join() === 'Nomad,Socotra');
  const second = line.steps[3];
  assert.ok(second.us && second.kind === 'pick' && second.alternatives.length > 1);
  const other = second.alternatives.find(a => a.map !== second.map).map;
  const r = analyzeScenarios({ pool: POOL, ours: OURS, utility, weFirst: true, firstPick: 'Colosseum', overrides: { [second.stateKey]: other } });
  const changed = r.lines.find(l => l.theirPicks.join() === 'Nomad,Socotra');
  assert.equal(changed.steps[3].map, other);
  assert.equal(changed.steps[3].forced, true);
});
