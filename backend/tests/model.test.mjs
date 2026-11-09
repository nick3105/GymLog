import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate, bestEstimate, lastPerformance, validateSets } from '../static/training-model.mjs';

test('Epley estimates only supported completed sets', () => {
  assert.equal(estimate(80, 5), 93.3);
  assert.equal(estimate(80, 5, 8), 98.7);
  assert.equal(estimate(80, 9, 7), 106.7);
  assert.equal(estimate(100, 1), 100);
  for (const [weight, reps] of [[0, 8], [80, 11], ['', 5], [80, ''], [80, 2.5], ['NaN', 5]]) assert.equal(estimate(weight, reps), null);
  assert.equal(bestEstimate([{weight:'60',reps:'8'}, {weight:'62.5',reps:'8'}]),79.2);
});
test('last performance is exercise-specific across different templates', () => {
  const sessions = [{day:'2026-11-06', exercises:[{id:'squat',sets:[{weight:80,reps:5}]}]}, {day:'2026-11-04',exercises:[{id:'bench-press',sets:[{weight:60,reps:8}]}]}];
  assert.equal(lastPerformance(sessions,'bench-press').day, '2026-11-04');
  assert.equal(lastPerformance(sessions,'not-recorded'), null);
});
test('RPE is optional, invalid or incomplete sets are rejected', () => {
  const exercise = {name:'Bench press',sets:[{weight:'60',reps:'8',rpe:''}]};
  assert.doesNotThrow(()=>validateSets([exercise]));
  for(const [field, value] of [['weight',''],['weight','NaN'],['reps','2.5'],['rpe','7.2'],['rpe','11']]) {
    assert.throws(()=>validateSets([{...exercise,sets:[{...exercise.sets[0],[field]:value}]}]));
  }
});
