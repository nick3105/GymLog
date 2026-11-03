import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkout, localDate, weekDates, summary, demoWorkouts } from './web-model.mjs';

test('trims valid names and applies local date', () => {
  assert.deepEqual(createWorkout('  Cardio ', '45', new Date(2026, 10, 3)), { name: 'Cardio', minutes: 45, day: '2026-11-03', sample: false });
});
test('rejects invalid entries and accepts duration limits', () => {
  for (const [name, minutes] of [['', '30'], ['   ', '30'], ['x'.repeat(51), '30'], ['Run','0'], ['Run','601'], ['Run','-1'], ['Run','2.5'], ['Run','abc'], ['Run',''], ['Run','1e2']]) assert.throws(() => createWorkout(name, minutes));
  assert.equal(createWorkout('Run', '1').minutes, 1);
  assert.equal(createWorkout('Run', '600').minutes, 600);
});
test('week crosses years and excludes past week and future dates', () => {
  const today = new Date(2027, 0, 3);
  assert.equal(weekDates(today)[0], '2026-12-28');
  const rows = [{ day: '2026-12-27', minutes: 10 }, { day: '2026-12-28', minutes: 20 }, { day: '2027-01-03', minutes: 30 }, { day: '2027-01-04', minutes: 40 }];
  assert.deepEqual(summary(rows, today), { count: 2, minutes: 50, total: 4 });
  assert.deepEqual(summary(rows, new Date(2027,0,4)), { count: 1, minutes: 40, total: 4 });
  assert.deepEqual(summary([], today), { count: 0, minutes: 0, total: 0 });
});
test('samples use calendar offsets and weeks start Monday', () => {
  const today = new Date(2026, 10, 2);
  assert.equal(localDate(today), '2026-11-02');
  assert.equal(summary(demoWorkouts(today), today).count, 1);
  assert.deepEqual(weekDates(new Date(2026, 2, 29)), ['2026-03-23','2026-03-24','2026-03-25','2026-03-26','2026-03-27','2026-03-28','2026-03-29']);
});
