import { localDate, weekDates, createWorkout, summary, demoWorkouts } from './web-model.mjs';

// One list is the app's state. This MVP intentionally has no persistent storage.
const workouts = demoWorkouts();
const goal = 4;
const $ = selector => document.querySelector(selector);
const dialog = $('#log-dialog');
let lastOpener;

function render() {
  const today = new Date();
  const totals = summary(workouts, today);
  const fullHistory = location.hash === '#workouts';
  $('#overview').hidden = fullHistory;
  $('#page-title').textContent = fullHistory ? 'Every session counts.' : 'Your training, at a glance.';
  $('#breadcrumb').textContent = fullHistory ? 'Workout history' : 'Dashboard';
  $('#date-label').textContent = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.querySelectorAll('[data-view]').forEach(link => {
    const selected = link.dataset.view === (fullHistory ? 'workouts' : 'dashboard');
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  $('#week-count').replaceChildren(document.createTextNode(totals.count), unit(totals.count === 1 ? 'session' : 'sessions'));
  $('#week-minutes').replaceChildren(document.createTextNode(totals.minutes), unit('min'));
  $('#total-count').replaceChildren(document.createTextNode(totals.total), unit('sessions'));
  $('#goal-count').textContent = totals.count;
  $('#goal-progress').value = Math.min(totals.count, goal);
  $('#goal-message').textContent = totals.count >= goal ? 'Goal reached. Keep showing up for yourself.' : `${goal - totals.count} more to reach your weekly goal.`;
  renderChart(today);
  const sorted = [...workouts].reverse().sort((a, b) => b.day.localeCompare(a.day));
  const visible = fullHistory ? sorted : sorted.slice(0, 4);
  $('#history-title').textContent = fullHistory ? 'Workout history' : 'Recent workouts';
  $('#view-all').hidden = fullHistory;
  $('#workout-rows').replaceChildren(...visible.map(workoutRow));
  $('#history-count').textContent = `Showing ${visible.length} of ${workouts.length} sessions · Sample workouts are labelled`;
}
function unit(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}
function workoutRow(workout) {
  const row = document.createElement('tr');
  // Only fixed markup goes into innerHTML; user input uses textContent.
  row.innerHTML = '<td><div class="workout-title"><span class="workout-icon"><svg aria-hidden="true"><use href="#dumbbell"/></svg></span><span><span class="workout-name"></span><small class="mobile-source"></small></span></div></td><td class="workout-date"></td><td class="duration"></td><td class="source-col"><span class="workout-source"></span></td>';
  row.querySelector('.workout-name').textContent = workout.name;
  const day = new Date(`${workout.day}T12:00:00`);
  row.querySelector('.workout-date').textContent = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  row.querySelector('.duration').textContent = `${workout.minutes} min`;
  const source = row.querySelector('.workout-source');
  source.textContent = workout.sample ? 'Sample' : 'Logged';
  row.querySelector('.mobile-source').textContent = source.textContent;
  source.classList.toggle('logged', !workout.sample);
  return row;
}
function renderChart(today) {
  const dates = weekDates(today);
  const todayText = localDate(today);
  const values = dates.map(day => day > todayText ? 0 : workouts.filter(w => w.day === day).reduce((sum, w) => sum + w.minutes, 0));
  const maximum = Math.max(60, ...values);
  $('#weekly-chart').replaceChildren(...dates.map((day, index) => {
    const column = document.createElement('div');
    const future = day > todayText;
    column.className = `chart-day${day === todayText ? ' today' : ''}${future ? ' future' : ''}`;
    column.innerHTML = '<div class="bar-track"><span class="bar-value"></span><div class="bar"></div></div><span class="day-name"></span>';
    const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index];
    column.querySelector('.bar').style.height = `${Math.max(3, values[index] / maximum * 92)}px`;
    column.querySelector('.bar-value').textContent = values[index] || '';
    column.querySelector('.day-name').textContent = dayName;
    column.setAttribute('aria-label', `${dayName}: ${future ? 'upcoming' : values[index] + ' minutes'}`);
    return column;
  }));
}
function openLog(event) {
  lastOpener = event.currentTarget;
  $('#log-form').reset();
  $('#form-error').textContent = '';
  document.querySelectorAll('input').forEach(input => input.removeAttribute('aria-invalid'));
  dialog.showModal();
  $('#workout-name').focus();
}
function closeLog() { dialog.close(); }
document.querySelectorAll('[data-open-log]').forEach(button => button.addEventListener('click', openLog));
$('#close-dialog').addEventListener('click', closeLog);
$('#cancel-dialog').addEventListener('click', closeLog);
dialog.addEventListener('close', () => lastOpener?.focus());
$('#view-all').addEventListener('click', () => { location.hash = 'workouts'; });
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });
$('#log-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const workout = createWorkout($('#workout-name').value, $('#workout-minutes').value);
    workouts.push(workout);
    closeLog();
    render();
    $('#announcement').textContent = `${workout.name}, ${workout.minutes} minutes, added to your workout history.`;
  } catch (error) {
    $('#form-error').textContent = error.message;
    const invalid = !$('#workout-name').value.trim() ? $('#workout-name') : $('#workout-minutes');
    invalid.setAttribute('aria-invalid', 'true');
    invalid.focus();
  }
});
render();
// Recompute weekly boundaries if the page stays open across midnight.
setInterval(() => { if (!dialog.open) render(); }, 60000);
