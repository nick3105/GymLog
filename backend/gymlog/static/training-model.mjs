// The server repeats validation and computes the stored estimate independently.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function estimate(weight, reps, rpe = null) {
  if (weight === '' || reps === '') return null;
  weight = Number(weight); reps = Number(reps);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1000 || !Number.isInteger(reps) || reps < 1 || reps > 10) return null;
  const effort = rpe === null || rpe === "" ? 10 : Number(rpe);
  if (!Number.isFinite(effort) || effort < 1 || effort > 10 || effort * 2 % 1) return null;
  const effective = Math.min(10, reps + 10 - effort);
  return Math.round((effective === 1 ? weight : weight * (1 + effective/30)) * 10) / 10;
}
export function bestEstimate(sets) {
  const values = sets.map(s => estimate(s.weight, s.reps, s.rpe)).filter(value => value !== null);
  return values.length ? Math.max(...values) : null;
}
export function lastPerformance(sessions, exerciseId) {
  for (const session of sessions) {
    const exercise = session.exercises.find(e => e.id === exerciseId);
    if (exercise) return { day: session.day, sets: exercise.sets };
  }
  return null;
}
export function validateSets(exercises) {
  for (const exercise of exercises) {
    for (const [i, set] of exercise.sets.entries()) {
      const prefix = `${exercise.name}, set ${i+1}: `;
      if (set.weight === '' || !Number.isFinite(Number(set.weight)) || Number(set.weight) < 0 || Number(set.weight) > 1000) throw new Error(prefix + 'enter a weight from 0 to 1000 kg.');
      if (!/^\d+$/.test(String(set.reps)) || Number(set.reps) < 1 || Number(set.reps) > 100) throw new Error(prefix + 'enter whole-number reps from 1 to 100.');
      if (set.rpe !== '' && (!Number.isFinite(Number(set.rpe)) || Number(set.rpe) < 1 || Number(set.rpe) > 10 || (Number(set.rpe)*2)%1)) throw new Error(prefix + 'RPE must be 1–10 in steps of 0.5, or left blank.');
    }
  }
}
