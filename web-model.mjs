// Plain data functions: no interface dependencies.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function weekDates(today = new Date()) {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + index);
    return localDate(day);
  });
}
export function createWorkout(name, minutes, today = new Date()) {
  name = String(name).trim();
  if (!name || name.length > 50) throw new Error('Enter a workout name between 1 and 50 characters.');
  if (!/^\d+$/.test(String(minutes))) throw new Error('Duration must be a whole number of minutes.');
  const duration = Number(minutes);
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) throw new Error('Duration must be between 1 and 600 minutes.');
  return { name, minutes: duration, day: localDate(today), sample: false };
}
export function summary(workouts, today = new Date()) {
  const start = weekDates(today)[0];
  const end = localDate(today);
  const weekly = workouts.filter(workout => workout.day >= start && workout.day <= end);
  return { count: weekly.length, minutes: weekly.reduce((total, workout) => total + workout.minutes, 0), total: workouts.length };
}
export function demoWorkouts(today = new Date()) {
  return [['Upper body strength', 45, 0], ['Easy cardio', 25, 2], ['Lower body strength', 50, 4]].map(([name, minutes, ago]) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    day.setDate(day.getDate() - ago);
    return { name, minutes, day: localDate(day), sample: true };
  });
}
