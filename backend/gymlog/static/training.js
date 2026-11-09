import { localDate, bestEstimate, lastPerformance, validateSets } from './training-model.mjs';

const $ = selector => document.querySelector(selector);
let csrf = '';
let username = '';
let data = { exercises: [], templates: [], sessions: [] };
let builder = { name: '', exercises: [] };
let active = null;
let saving = false;
let signedIn = false;
const view = $('#view');
const format = value => Number(value).toLocaleString('en-GB', { maximumFractionDigits: 1 });
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const dateLabel = day => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

async function api(path, body) {
  const options = { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' };
  if (body !== undefined) {
    options.method = 'POST';
    options.headers['X-CSRF-Token'] = csrf;
    options.body = JSON.stringify(body);
  }
  let response;
  try { response = await fetch(`/api/${path}`, options); }
  catch { throw new Error('Cannot reach your journal. Check your connection. Your form has not been cleared.'); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The journal server did not respond correctly. Please try again.'); }
  if (!response.ok) {
    const error = new Error(result.error || 'The request could not be saved.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function error(message = '') {
  $('#global-error').textContent = message;
  $('#global-error').hidden = !message;
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = !message;
}
function status(text) {
  $('#save-status').replaceChildren();
  const dot = document.createElement('span'); dot.className = 'status-dot';
  $('#save-status').append(dot, document.createTextNode(text));
}
function showLogin(message = '') {
  signedIn = false;
  $('#app-screen').hidden = true;
  $('#login-screen').hidden = false;
  $('#login-error').textContent = message;
}
function showApp() {
  signedIn = true;
  $('#profile-badge').textContent = username + ' · KG';
  $('#login-screen').hidden = true;
  $('#app-screen').hidden = false;
  render();
}
function handleError(problem) {
  if (problem.status === 401) showLogin('Please sign in again. Your unfinished form is still here.');
  else { error(problem.message); status('Not saved · please retry'); }
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#login-submit'); button.disabled = true;
  $('#login-error').textContent = '';
  try {
    const session = await api('session'); csrf = session.csrf;
    const result = await api('login', { username: $('#username').value, password: $('#password').value }); csrf = result.csrf; username = result.username;
    data = await api('state'); $('#password').value = ''; showApp();
  } catch (problem) { $('#login-error').textContent = problem.message; }
  finally { button.disabled = false; }
});

async function signOut() {
  if (saving) return;
  if ((active || builder.name || builder.exercises.length) && !confirm('Sign out and discard your unfinished form? Saved workouts will stay in your journal.')) return;
  try {
    await api('logout', {});
    active = null; builder = { name: '', exercises: [] };
    data = { exercises: [], templates: [], sessions: [] };
    csrf = ''; username = ''; $('#login-form').reset(); showLogin();
    history.replaceState(null, '', '#home');
  } catch (problem) { handleError(problem); }
}
$('#sign-out').addEventListener('click', signOut);
$('#mobile-sign-out').addEventListener('click', signOut);
$('#refresh-data').addEventListener('click', async () => {
  if (saving || active) { toast('Finish or discard your active session before refreshing.'); return; }
  const button = $('#refresh-data'); button.disabled = true;
  try { data = await api('state'); render(); status('Journal is up to date'); toast('Loaded your latest saved workouts.'); }
  catch (problem) { handleError(problem); }
  finally { button.disabled = false; }
});

function route() { return location.hash.slice(1) || 'home'; }
function navigate(next) {
  if (saving) return;
  if (active && next !== 'session') {
    if (!confirm('Discard this unfinished session? Saved sessions will not be changed.')) return;
    active = null;
  }
  if (route() === 'create' && next !== 'create' && (builder.name || builder.exercises.length)) {
    if (!confirm('Discard this unsaved workout template?')) return;
    builder = { name: '', exercises: [] };
  }
  if (location.hash === '#' + next) render();
  else location.hash = next;
}
document.querySelectorAll('a[href^="#"]').forEach(link => {
  if (link.classList.contains('skip')) return;
  link.addEventListener('click', event => { event.preventDefault(); navigate(link.hash.slice(1)); });
});
window.addEventListener('hashchange', () => {
  // Browser Back must not silently discard a draft. Keep the session reachable.
  if (signedIn) { render(); window.scrollTo({ top: 0 }); }
});
window.addEventListener('beforeunload', event => {
  if (active || builder.name || builder.exercises.length) { event.preventDefault(); event.returnValue = ''; }
});

function render() {
  if (!signedIn) return;
  error(); toast('');
  let page = route();
  if (page === 'session' && !active) { page = 'start'; history.replaceState(null, '', '#start'); }
  const section = page.startsWith('review/') ? 'review' : page;
  const names = { home: 'Home', start: 'Start workout', create: 'Create workout', session: 'Active session', review: 'Review workouts', weight: 'Weight Tracker' };
  $('#breadcrumb').textContent = names[section] || 'Home';
  document.querySelectorAll('[data-nav]').forEach(link => {
    const current = link.dataset.nav === section || (section === 'session' && link.dataset.nav === 'start');
    link.classList.toggle('active', current);
    if (current) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  const titles = { weight: ['Weight Tracker', 'Record your body weight and see how it changes over time.'], home: ['Make your next session count.', 'Your workouts and progress, together in one place.'], start: ['Pick your workout.', 'Choose a saved template and make it your own today.'], create: ['Build your next workout.', 'Choose your exercises. Set your targets. Repeat whenever you like.'], session: [active?.name || 'Your session', 'Enter your actual results. RPE is optional. All weights are in kilograms.'], review: ['Look back. Move forward.', 'Your completed sessions, saved in your journal.'] };
  const title = titles[section] || titles.home;
  $('#page-title').textContent = title[0]; $('#page-subtitle').textContent = title[1];
  $('#refresh-data').disabled = Boolean(active);
  if (page === 'session') status('Active session · not yet saved');
  if (page.startsWith('review/')) renderReviewDetail(page.slice(7));
  else if (page === 'create') renderBuilder();
  else if (page === 'start') renderTemplates();
  else if (page === 'session') renderSession();
  else if (page === 'review') renderReviews();
  else if (page === 'weight') renderWeights();
  else renderHome();
}

function renderHome() {
  view.innerHTML = `<p class="home-intro">A good training plan is one you come back to. Create your routine, log every set, and use your last session to guide your next one.</p>
  <div class="choice-grid">${[
    ['01', 'dumbbell', 'Start workout', 'Choose a saved session and log your sets.', 'start'],
    ['02', 'plus', 'Create workout', 'Build a repeatable workout with your own targets.', 'create'],
    ['03', 'list', 'Review workouts', 'Revisit the weights, reps and effort you recorded.', 'review'],
    ['04', 'target', 'Weight Tracker', 'Log your body weight and follow your trend.', 'weight']
  ].map(([number, glyph, title, text, destination], index) => `<button class="choice ${index === 0 ? 'highlight' : ''}" data-go="${destination}"><span class="choice-number">${number} / YOUR TRAINING</span>${icon(glyph)}<h2>${title}</h2><p>${text}</p><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
  <div class="summary-strip"><div><strong>${data.templates.length}</strong><span>Saved workouts</span></div><div><strong>${data.sessions.length}</strong><span>Completed sessions</span></div><div><strong>${data.sessions.length ? esc(dateLabel(data.sessions[0].day)) : '—'}</strong><span>Last session</span></div></div>
  ${active ? '<p class="session-note">You have an unfinished session. <button class="text-button" data-go="session">Return to active session →</button></p>' : ''}`;
}
function empty(title, text, destination, label) {
  return `<div class="empty-state">${icon('dumbbell')}<h2>${title}</h2><p>${text}</p><button class="button primary" data-go="${destination}">${label} →</button></div>`;
}
function renderTemplates() {
  if (!data.templates.length) { view.innerHTML = empty('Your routine starts here.', 'Create your first workout template, then return here to start a session.', 'create', 'Create workout'); return; }
  view.innerHTML = `<div class="view-header"><div><h2>Your saved workouts</h2><p>${data.templates.length} repeatable ${data.templates.length === 1 ? 'workout' : 'workouts'}</p></div><button class="text-button" data-go="create">+ Create workout</button></div><div class="template-grid">${data.templates.map(template => `<article class="template-card"><span class="eyebrow">YOUR ROUTINE</span><h2>${esc(template.name)}</h2><p class="card-meta">${template.exercises.length} exercises · ${template.exercises.reduce((sum, e) => sum + e.sets, 0)} sets</p><ul>${template.exercises.map(e => `<li><span>${esc(e.name)}</span><small>${e.sets} sets</small></li>`).join('')}</ul><button class="button primary" data-start="${template.id}">Start session <span>→</span></button></article>`).join('')}</div>`;
}
function targetsFor(e) {
  return e.targets || Array.from({length:e.sets}, () => ({reps:e.targetReps, weight:e.targetWeight, rpe:null}));
}
const newTarget = () => ({reps:8, weight:'', rpe:''});
function renderBuilder(selection = '') {
  view.innerHTML = `<form id="builder-form" novalidate><div class="form-panel"><label for="template-name">Workout name</label><input class="workout-name-input" id="template-name" maxlength="60" placeholder="e.g. Upper body A" value="${esc(builder.name)}" required><div class="exercise-picker"><div><label for="exercise-choice">Add an exercise</label><select id="exercise-choice"><option value="">Choose from your exercise catalogue</option>${data.exercises.map(e => `<option value="${esc(e.id)}" ${e.id === selection ? "selected" : ""}>${esc(e.name)} · ${esc(e.group)}</option>`).join('')}</select></div><button type="button" class="button secondary" data-action="add-exercise">+ Add</button></div><p class="saving-note">Set targets now; record your actual results during the session.</p></div>
  <div class="builder-list">${builder.exercises.map((e, i) => `<section class="builder-card"><div class="exercise-title"><div><h2>${exerciseLink(e, i+1 + ". ")}</h2><p>${esc(e.group)}</p></div><button type="button" class="remove-exercise" data-remove="${i}" aria-label="Remove ${esc(e.name)}">Remove</button></div><div class="sets-head builder-target-row" aria-hidden="true"><span>SET</span><span>TARGET REPS</span><span>TARGET KG</span><span>TARGET RPE</span><span></span></div>${e.targets.map((target,j) => `<div class="set-input-row builder-target-row"><span class="set-index">${j+1}</span>${[['reps',1,100,1,'Target reps'],['weight',0,1000,'any','Target weight'],['rpe',1,10,.5,'Target RPE']].map(([key,min,max,step,label])=>`<input type="number" inputmode="${key==='reps'?'numeric':'decimal'}" aria-label="${esc(e.name)} set ${j+1} ${label}" min="${min}" max="${max}" step="${step}" ${key==='reps'?'required':'placeholder="Optional"'} value="${esc(target[key])}" data-builder="${i}:${j}:${key}">`).join('')}<button class="remove-exercise" type="button" data-remove-set="${i}:${j}" aria-label="Remove set ${j+1}" ${e.targets.length===1?'disabled':''}>×</button></div>`).join('')}<button type="button" class="text-button" data-add-set="${i}">+ Add set</button></section>`).join('')}</div>
  ${builder.exercises.length ? '' : '<p class="builder-empty">Add at least one exercise to build your workout.</p>'}<p class="error" id="builder-error" role="alert"></p><div class="sticky-actions"><p>Saved templates can be used again on any device.</p><div><button type="button" class="button secondary" data-go="home">Cancel</button><button type="submit" class="button primary" ${saving ? 'disabled' : ''}>${saving ? 'Saving…' : 'Save workout'} ${icon('check')}</button></div></div></form>`;
}

function previousText(exerciseId) {
  const previous = lastPerformance(data.sessions, exerciseId);
  if (!previous) return '<strong>Last session:</strong> No previous results for this exercise yet.';
  return `<strong>Last session · ${dateLabel(previous.day)}:</strong> ${previous.sets.map(s => `${format(s.weight)} kg × ${s.reps}${s.rpe !== null ? ' @ RPE ' + format(s.rpe) : ''}`).join(' · ')}`;
}
function estimateMarkup(value) {
  return value === null ? '—<span>kg</span>' : `${format(value)}<span>kg</span>`;
}
function renderSession() {
  view.innerHTML = `<div class="session-header"><div><h2>${active.exercises.length} exercises · ${active.exercises.reduce((sum, e) => sum + e.sets.length, 0)} sets</h2><p>${dateLabel(active.day)} · Unsaved until you finish</p></div><button class="danger-button" data-action="discard-session">Discard session</button></div><form id="session-form" novalidate>${active.exercises.map((exercise, i) => `<section class="exercise-section"><p class="previous-performance">${previousText(exercise.id)}</p><article class="exercise-card"><div class="exercise-title"><div class="exercise-tag"><span class="exercise-order">${String(i+1).padStart(2,'0')}</span><div><h2>${exerciseLink(exercise)}</h2><p>ACTUAL RESULTS</p></div></div><div class="estimate"><small>ESTIMATED 1RM</small><strong id="estimate-${i}">${estimateMarkup(bestEstimate(exercise.sets))}</strong></div></div><div class="sets-head" aria-hidden="true"><span>SET</span><span>WEIGHT <small>KG</small></span><span>REPS</span><span>RPE <small>OPTIONAL</small></span></div>${exercise.sets.map((set, j) => `<div class="set-input-row"><span class="set-index">${j+1}</span><input aria-label="${esc(exercise.name)} set ${j+1} weight in kilograms" type="number" inputmode="decimal" min="0" max="1000" step="any" required placeholder="${targetsFor(exercise)[j].weight ?? 'kg'}" value="${esc(set.weight)}" data-set="${i}:${j}:weight"><input aria-label="${esc(exercise.name)} set ${j+1} reps" type="number" inputmode="numeric" min="1" max="100" step="1" required placeholder="${targetsFor(exercise)[j].reps}" value="${esc(set.reps)}" data-set="${i}:${j}:reps"><input aria-label="${esc(exercise.name)} set ${j+1} RPE optional" type="number" inputmode="decimal" min="1" max="10" step="0.5" placeholder="${targetsFor(exercise)[j].rpe ?? '—'}" value="${esc(set.rpe)}" data-set="${i}:${j}:rpe"></div>`).join('')}<p class="target-line">Placeholders show your targets. Enter your actual results, or 0 kg for bodyweight-only sets.</p></article></section>`).join('')}<p class="session-note">Estimated 1RM uses the best eligible set (1–10 reps, positive weight). With RPE, estimated reps in reserve (10 − RPE) are added, capped at 10 effective reps. Without RPE, only actual reps count. This is an estimate, not a tested maximum.</p><p class="error" id="session-error" role="alert"></p><div class="sticky-actions"><p>Your template stays unchanged. Only this session's results are saved.</p><div><button type="submit" class="button primary" ${saving ? 'disabled' : ''}>${saving ? 'Saving session…' : 'Finish & save session'} ${icon('check')}</button></div></div></form>`;
}
function renderReviews() {
  if (!data.sessions.length) { view.innerHTML = empty('Your first session is waiting.', 'Finish a workout and your actual sets, reps and effort will appear here.', 'start', 'Start workout'); return; }
  view.innerHTML = `<div class="view-header"><h2>${data.sessions.length} completed ${data.sessions.length === 1 ? 'session' : 'sessions'}</h2></div><div class="review-list">${data.sessions.map(s => `<button class="review-card" data-go="review/${s.id}"><div><span class="date">${dateLabel(s.day)}</span><h2>${esc(s.name)}</h2><p>${s.exercises.length} exercises · ${s.exercises.reduce((sum, e) => sum + e.sets.length, 0)} completed sets</p></div><span aria-hidden="true">↗</span></button>`).join('')}</div>`;
}
function renderReviewDetail(id) {
  const session = data.sessions.find(s => s.id === id);
  if (!session) { view.innerHTML = empty('Session not found.', 'Refresh your journal to load the latest saved sessions.', 'review', 'Back to history'); return; }
  $('#page-title').textContent = session.name;
  $('#page-subtitle').textContent = `${dateLabel(session.day)} · Completed and saved`;
  view.innerHTML = `<button class="back-button" data-go="review">← All sessions</button>${session.exercises.map((e, i) => `<section class="exercise-section"><article class="exercise-card"><div class="exercise-title"><div class="exercise-tag"><span class="exercise-order">${i+1}</span><div><h2>${exerciseLink(e)}</h2><p>${e.sets.length} COMPLETED ${e.sets.length === 1 ? 'SET' : 'SETS'}</p></div></div><div class="estimate"><small>ESTIMATED 1RM</small><strong>${estimateMarkup(bestEstimate(e.sets))}</strong></div></div><table class="review-set-table"><thead><tr><th>SET</th><th>WEIGHT</th><th>REPS</th><th>RPE</th></tr></thead><tbody>${e.sets.map((s, j) => `<tr><td>${j+1}</td><td>${format(s.weight)} kg</td><td>${s.reps}</td><td>${s.rpe === null ? '—' : format(s.rpe)}</td></tr>`).join('')}</tbody></table></article></section>`).join('')}<p class="session-note">These are the actual results saved for this session. Your repeatable workout template has not changed.</p>`;
}

view.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'template-name') builder.name = input.value;
  if (input.dataset.builder) {
    const [i, j, field] = input.dataset.builder.split(':'); builder.exercises[i].targets[j][field] = input.value;
  }
  if (input.dataset.set && active) {
    const [i, j, field] = input.dataset.set.split(':'); active.exercises[i].sets[j][field] = input.value;
    $(`#estimate-${i}`).innerHTML = estimateMarkup(bestEstimate(active.exercises[i].sets));
  }
});
view.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button || saving) return;
  if (button.dataset.exercise) { showExercise(button.dataset.exercise, button.dataset.label); return; }
  if (button.dataset.go) { event.preventDefault(); navigate(button.dataset.go); return; }
  if (button.dataset.remove !== undefined) { builder.exercises.splice(Number(button.dataset.remove), 1); renderBuilder(); return; }
  if (button.dataset.addSet !== undefined || button.dataset.removeSet !== undefined) {
    const [i,j] = (button.dataset.addSet ?? button.dataset.removeSet).split(':').map(Number);
    const targets = builder.exercises[i].targets;
    if (button.dataset.addSet !== undefined && targets.length < 20) targets.push(newTarget());
    if (button.dataset.removeSet !== undefined && targets.length > 1) targets.splice(j,1);
    renderBuilder($('#exercise-choice').value);
    return;
  }
  if (button.dataset.action === 'add-exercise') {
    const exercise = data.exercises.find(e => e.id === $('#exercise-choice').value);
    if (!exercise) { $('#builder-error').textContent = 'Choose an exercise before adding it.'; return; }
    const existing = builder.exercises.find(e => e.id === exercise.id);
    if (existing) {
      if (existing.targets.length < 20) existing.targets.push(newTarget());
      renderBuilder(exercise.id);
      return;
    }
    if (builder.exercises.length >= 20) { $('#builder-error').textContent = 'A workout can contain up to 20 exercises.'; return; }
    builder.exercises.push({ ...exercise, targets: Array.from({length:3}, newTarget) }); renderBuilder(exercise.id); return;
  }
  if (button.dataset.action === 'discard-session') { navigate('start'); return; }
  if (button.dataset.start) {
    if (active && !confirm('Discard your unfinished session and start a new one?')) return;
    button.disabled = true;
    try {
      data = await api('state');
      const template = data.templates.find(t => t.id === button.dataset.start);
      if (!template) throw new Error('That template is no longer available. Refresh your workouts.');
      active = { clientId: crypto.randomUUID(), templateId: template.id, name: template.name, day: localDate(), exercises: template.exercises.map(e => ({ ...e, targets: targetsFor(e), sets: Array.from({ length: e.sets }, () => ({ weight: '', reps: '', rpe: '' })) })) };
      history.pushState(null, '', '#session'); render();
    } catch (problem) { handleError(problem); button.disabled = false; }
  }
});

view.addEventListener('submit', async event => {
  event.preventDefault(); if (saving) return;
  const form = event.target;
  if (form.id === 'weight-form') {
    const feedback = $('#weight-error');
    const button = form.querySelector('button');
    if (!form.reportValidity()) return;
    saving = true; button.disabled = true;
    try {
      const saved = await api('weights', {day: $('#weight-day').value, kg: $('#weight-kg').value});
      data.weights = [...(data.weights || []).filter(entry => entry.day !== saved.day), saved].sort((a,b) => a.day.localeCompare(b.day));
      renderWeights(); toast('Body weight saved.');
    } catch (problem) { feedback.textContent = problem.message; }
    finally { saving = false; button.disabled = false; }
    return;
  }
  if (form.id === 'builder-form') {
    const feedback = $('#builder-error'); feedback.textContent = '';
    if (!builder.name.trim()) { feedback.textContent = 'Give your workout a name.'; $('#template-name').focus(); return; }
    if (!builder.exercises.length) { feedback.textContent = 'Add at least one exercise.'; return; }
    if (!form.reportValidity()) return;
    saving = true; form.querySelector('[type="submit"]').disabled = true; status('Saving workout…');
    try {
      const saved = await api('templates', builder);
      data.templates.unshift(saved); builder = { name: '', exercises: [] };
      saving = false; history.pushState(null, '', '#start'); render(); status('Saved to your journal'); toast('Workout saved. You can start it now, or return to it on another device.');
    } catch (problem) { feedback.textContent = problem.message; handleError(problem); }
    finally { saving = false; const current = $('#builder-form [type="submit"]'); if (current) current.disabled = false; }
  }
  if (form.id === 'session-form') {
    const feedback = $('#session-error'); feedback.textContent = '';
    try { validateSets(active.exercises); }
    catch (problem) { feedback.textContent = problem.message; feedback.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    saving = true; form.querySelector('[type="submit"]').disabled = true; status('Saving session…');
    try {
      const saved = await api('sessions', active);
      data.sessions = [saved, ...data.sessions.filter(s => s.id !== saved.id)];
      active = null; saving = false; history.pushState(null, '', `#review/${saved.id}`); render(); status('Saved to your journal'); toast('Session saved. Your results are ready for your next workout.');
    } catch (problem) { feedback.textContent = problem.message; handleError(problem); }
    finally { saving = false; const current = $('#session-form [type="submit"]'); if (current) current.disabled = false; }
  }
});

async function boot() {
  $('#login-submit').disabled = true;
  try {
    const session = await api('session'); csrf = session.csrf;
    if (session.authenticated) { username = session.username; data = await api('state'); showApp(); }
    else showLogin();
  } catch (problem) { showLogin(problem.message); }
  finally { $('#login-submit').disabled = false; }
}
boot();


function exerciseLink(exercise, prefix = '') {
  return `<button type="button" class="exercise-link" data-exercise="${esc(exercise.id)}" data-label="${esc(exercise.name)}">${esc(prefix + exercise.name)} <span aria-hidden="true">↗</span></button>`;
}

function lineChart(points, description) {
  if (!points.length) return '<p class="chart-empty">No measurements yet.</p>';
  const values = points.map(p => p.value);
  const times = points.map(p => Date.parse(p.day));
  const span = times.at(-1) - times[0];
  const min = Math.min(...values), max = Math.max(...values);
  const padding = Math.max((max - min) * .12, .5);
  const y = value => 155 - (value - min + padding) / (max - min + padding * 2) * 125;
  const coords = points.map((point, i) => [54 + (span ? (times[i] - times[0]) / span * 510 : 255), y(point.value)]);
  return `<figure class="trend"><svg viewBox="0 0 600 190" role="img" aria-label="${esc(description)}">${[35,95,155].map(py => `<path d="M54 ${py}H565" class="gridline"/><text x="45" y="${py+4}" text-anchor="end">${format(min-padding+(155-py)/125*(max-min+padding*2))}</text>`).join('')}<polyline class="trend-line" points="${coords.map(c=>c.join(',')).join(' ')}"/>${coords.map(([x,py],i)=>`<circle cx="${x}" cy="${py}" r="4"><title>${esc(dateLabel(points[i].day))}: ${format(values[i])} kg</title></circle>`).join('')}<text x="54" y="179">${esc(dateLabel(points[0].day))}</text>${span ? `<text x="565" y="179" text-anchor="end">${esc(dateLabel(points.at(-1).day))}</text>` : ''}</svg><figcaption>${esc(description)} · kg</figcaption></figure>`;
}

function showExercise(id, name) {
  const points = data.sessions.flatMap(session => {
    const exercise = session.exercises.find(e => e.id === id);
    const value = exercise ? bestEstimate(exercise.sets) : null;
    return value === null ? [] : [{day:session.day,value,completedAt:session.completedAt}];
  }).sort((a,b) => a.day.localeCompare(b.day) || a.completedAt.localeCompare(b.completedAt));
  const best = points.length ? format(Math.max(...points.map(p=>p.value))) + ' kg' : '—';
  const recent = points.length ? format(points.at(-1).value) + ' kg' : '—';
  $('#exercise-dashboard-content').innerHTML = `<p class="eyebrow">EXERCISE PERFORMANCE</p><h2 id="exercise-dashboard-title">${esc(name)}</h2><div class="summary-strip"><div><strong>${best}</strong><span>Best estimated 1RM</span></div><div><strong>${recent}</strong><span>Latest estimated 1RM</span></div></div>${lineChart(points,'Estimated 1RM over time')}<p class="session-note">Based on completed sessions. Estimates use the same RPE rule throughout your history.</p>`;
  $('#exercise-dashboard').showModal();
}

function renderWeights() {
  const entries = data.weights || [];
  const latest = entries.at(-1);
  view.innerHTML = `<form class="form-panel weight-form" id="weight-form"><div><label for="weight-day">Date</label><input id="weight-day" type="date" value="${localDate()}" required></div><div><label for="weight-kg">Body weight (kg)</label><input id="weight-kg" type="number" inputmode="decimal" min="1" max="700" step="any" required></div><button class="button primary">Save weight</button><p class="error" id="weight-error" role="alert"></p></form><section class="panel"><h2>Body weight over time</h2><p class="subtitle">${latest ? 'Latest: ' + format(latest.kg) + ' kg · ' + esc(dateLabel(latest.day)) : 'Add your first measurement to see your trend.'}</p>${lineChart(entries.map(e=>({day:e.day,value:e.kg})),'Body weight over time')}<p class="session-note">One entry per date. Saving the same date updates that measurement.</p>${entries.length ? `<details><summary>Measurement history</summary><table><thead><tr><th>Date</th><th>Weight</th></tr></thead><tbody>${[...entries].reverse().map(e=>`<tr><td>${esc(dateLabel(e.day))}</td><td>${format(e.kg)} kg</td></tr>`).join('')}</tbody></table></details>` : ''}</section>`;
}

$('#register-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  $('#login-error').textContent = '';
  try {
    csrf = (await api('session')).csrf;
    const result = await api('register', {username: $('#new-username').value, password: $('#new-password').value});
    csrf = result.csrf; username = result.username;
    $('#register').open = false;
    event.target.reset();
    data = await api('state');
    history.replaceState(null, '', '#home');
    showApp();
  } catch (problem) { $('#login-error').textContent = problem.message; }
  finally { button.disabled = false; }
});
