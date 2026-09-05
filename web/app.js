const els = {
  search: document.querySelector('#searchInput'),
  menuButton: document.querySelector('#menuButton'),
  menu: document.querySelector('#mainMenu'),
  tabs: document.querySelectorAll('.menu-item[data-view]'),
  views: document.querySelectorAll('.view'),
  dayChips: document.querySelector('#dayChips'),
  location: document.querySelector('#locationFilter'),
  track: document.querySelector('#trackFilter'),
  type: document.querySelector('#typeFilter'),
  bookmarkedOnly: document.querySelector('#bookmarkedOnly'),
  clearFilters: document.querySelector('#clearFilters'),
  resultCount: document.querySelector('#resultCount'),
  scheduleList: document.querySelector('#scheduleList'),
  bookmarkList: document.querySelector('#bookmarkList'),
  bookmarkBadge: document.querySelector('#bookmarkBadge'),
  clearBookmarks: document.querySelector('#clearBookmarks'),
  statBookmarks: document.querySelector('#statBookmarks'),
  statDays: document.querySelector('#statDays'),
  statHours: document.querySelector('#statHours'),
  agendaList: document.querySelector('#agendaList'),
  exportBookmarks: document.querySelector('#exportBookmarks'),
  importBookmarks: document.querySelector('#importBookmarks'),
  dialog: document.querySelector('#sessionDialog'),
  dialogContent: document.querySelector('#dialogContent'),
  closeDialog: document.querySelector('#closeDialog'),
};

const STORE_KEY = 'matsuricon2026.bookmarks';
let sessions = [];
let bookmarks = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));
let filters = { day: '', search: '', location: '', track: '', type: '', bookmarkedOnly: false };

bindEvents();
init();

async function init() {
  let data;
  try {
    const res = await fetch('/api/schedule');
    if (!res.ok) throw new Error('API unavailable');
    data = await res.json();
  } catch {
    const res = await fetch('assets/schedule.json');
    data = await res.json();
  }
  logVisit();
  sessions = data.sessions.map(normalizeSession).sort((a, b) => a.startDate - b.startDate || a.title.localeCompare(b.title));
  buildFilterOptions();
  updateHeroOffset();
  renderAll();
}

function normalizeSession(s) {
  const types = splitList(s.types);
  return {
    ...s,
    typesList: types,
    startDate: new Date(s.start_iso),
    endDate: s.end_iso ? new Date(s.end_iso) : null,
    searchText: [s.title, s.date, s.day, s.start_time, s.end_time, s.location, s.track, s.types, s.guests, s.description].join(' ').toLowerCase(),
  };
}

function splitList(value) {
  return (value || '').split(/[;,]/).map(x => x.trim()).filter(Boolean);
}

function bindEvents() {
  els.menuButton.addEventListener('click', () => {
    const open = els.menu.classList.toggle('open');
    els.menuButton.setAttribute('aria-expanded', String(open));
  });
  els.tabs.forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
  els.search.addEventListener('input', () => { filters.search = els.search.value.trim().toLowerCase(); renderSchedule(); });
  [els.location, els.track, els.type].forEach(select => select.addEventListener('change', () => {
    filters.location = els.location.value; filters.track = els.track.value; filters.type = els.type.value; renderSchedule();
  }));
  els.bookmarkedOnly.addEventListener('change', () => { filters.bookmarkedOnly = els.bookmarkedOnly.checked; renderSchedule(); });
  els.clearFilters.addEventListener('click', clearFilters);
  els.clearBookmarks.addEventListener('click', () => { if (confirm('Remove all bookmarks from this browser?')) { bookmarks.clear(); saveBookmarks(); renderAll(); } });
  els.exportBookmarks.addEventListener('click', exportBookmarks);
  els.importBookmarks.addEventListener('change', importBookmarks);
  els.closeDialog.addEventListener('click', () => els.dialog.close());
  window.addEventListener('resize', updateHeroOffset);
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
}

function updateHeroOffset() {
  const heroHeight = document.querySelector('.hero').offsetHeight;
  document.documentElement.style.setProperty('--hero-offset', `${heroHeight}px`);
}

function handleHeaderScroll() {
  document.body.classList.toggle('scrolled', window.scrollY > 70);
  if (window.scrollY > 70) {
    els.menu.classList.remove('open');
    els.menuButton.setAttribute('aria-expanded', 'false');
  }
}

function buildFilterOptions() {
  buildDayChips();
  fillSelect(els.location, unique(sessions.map(s => s.location).filter(Boolean)));
  fillSelect(els.track, unique(sessions.map(s => s.track).filter(Boolean)));
  fillSelect(els.type, unique(sessions.flatMap(s => s.typesList)));
}

function buildDayChips() {
  const orderedDays = [];
  const seen = new Set();
  sessions.forEach(s => {
    if (!seen.has(s.day)) {
      seen.add(s.day);
      orderedDays.push({ label: `${s.day} ${shortDate(s.startDate)}`, value: s.day });
    }
  });
  const days = [{ label: 'All', value: '' }, ...orderedDays];
  els.dayChips.innerHTML = days.map(d => `<button class="day-chip ${d.value === filters.day ? 'active' : ''}" data-day="${d.value}">${d.label}</button>`).join('');
  els.dayChips.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    filters.day = btn.dataset.day;
    buildDayChips();
    renderSchedule();
  }));
}

function fillSelect(select, values) {
  const first = select.querySelector('option').outerHTML;
  select.innerHTML = first + values.map(v => `<option value="${escapeAttr(v)}">${escapeHtml(v)}</option>`).join('');
}

function renderAll() {
  renderSchedule();
  renderBookmarks();
  renderDashboard();
  els.bookmarkBadge.textContent = bookmarks.size;
}

function renderSchedule() {
  const list = filteredSessions();
  els.resultCount.textContent = `${list.length} shown`;
  els.scheduleList.innerHTML = renderGroupedCards(list);
  wireCards(els.scheduleList);
}

function filteredSessions() {
  return sessions.filter(s => {
    if (filters.day && s.day !== filters.day) return false;
    if (filters.search && !s.searchText.includes(filters.search)) return false;
    if (filters.location && s.location !== filters.location) return false;
    if (filters.track && s.track !== filters.track) return false;
    if (filters.type && !s.typesList.includes(filters.type)) return false;
    if (filters.bookmarkedOnly && !bookmarks.has(s.id)) return false;
    return true;
  });
}

function renderBookmarks() {
  const list = bookmarkedSessions();
  els.bookmarkList.innerHTML = list.length ? renderGroupedCards(list) : empty('No bookmarks yet. Tap “Save” on sessions to build your personal schedule.');
  wireCards(els.bookmarkList);
}

function renderDashboard() {
  const list = bookmarkedSessions();
  els.statBookmarks.textContent = list.length;
  els.statDays.textContent = unique(list.map(s => s.date)).length;
  const hours = list.reduce((sum, s) => sum + durationHours(s), 0);
  els.statHours.textContent = hours ? hours.toFixed(hours % 1 ? 1 : 0) : '0';
  els.agendaList.innerHTML = list.length ? renderAgenda(list) : empty('Your dashboard will fill in when you bookmark sessions.');
}

function bookmarkedSessions() {
  return sessions.filter(s => bookmarks.has(s.id));
}

function renderGroupedCards(list) {
  if (!list.length) return empty('No sessions match those filters.');
  let lastDate = '';
  return list.map(s => {
    const heading = s.date !== lastDate ? `<h2 class="date-heading">${escapeHtml(s.day)} • ${escapeHtml(s.date)}</h2>` : '';
    lastDate = s.date;
    return heading + renderCard(s);
  }).join('');
}

function renderCard(s) {
  const saved = bookmarks.has(s.id);
  const pills = [s.location, s.track, ...s.typesList, s.guests && `Guest: ${s.guests}`].filter(Boolean);
  return `<article class="card" data-id="${s.id}">
    <div class="card__top">
      <div>
        <div class="time">${escapeHtml(s.start_time)}${s.end_time ? `–${escapeHtml(s.end_time)}` : ''}</div>
        <h3 class="title">${escapeHtml(s.title)}</h3>
      </div>
      <button class="bookmark-btn ${saved ? 'saved' : ''}" data-action="bookmark">${saved ? 'Saved' : 'Save'}</button>
    </div>
    <div class="meta">${pills.slice(0, 5).map(p => `<span class="pill">${escapeHtml(p)}</span>`).join('')}</div>
    ${s.description ? `<p class="description">${escapeHtml(s.description)}</p>` : ''}
    <div class="card-actions"><button class="details-btn" data-action="details">Details</button></div>
  </article>`;
}

function renderAgenda(list) {
  const grouped = groupBy(list, s => `${s.day} • ${s.date}`);
  return Object.entries(grouped).map(([day, items]) => `<div class="agenda-day"><h3>${escapeHtml(day)}</h3>${items.map(s => `<div class="agenda-item"><strong>${escapeHtml(s.start_time)}</strong><div><strong>${escapeHtml(s.title)}</strong><br><small>${escapeHtml(s.location || 'No location')}</small></div></div>`).join('')}</div>`).join('');
}

function wireCards(root) {
  root.querySelectorAll('[data-action="bookmark"]').forEach(btn => btn.addEventListener('click', e => {
    const id = e.target.closest('.card').dataset.id;
    bookmarks.has(id) ? bookmarks.delete(id) : bookmarks.add(id);
    saveBookmarks();
    renderAll();
  }));
  root.querySelectorAll('[data-action="details"]').forEach(btn => btn.addEventListener('click', e => openDetails(e.target.closest('.card').dataset.id)));
}

function openDetails(id) {
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  els.dialogContent.innerHTML = `<h2>${escapeHtml(s.title)}</h2>
    <p class="time">${escapeHtml(s.day)} ${escapeHtml(s.date)} • ${escapeHtml(s.start_time)}${s.end_time ? `–${escapeHtml(s.end_time)}` : ''}</p>
    <div class="meta">${[s.location, s.track, ...s.typesList, s.guests && `Guest: ${s.guests}`].filter(Boolean).map(p => `<span class="pill">${escapeHtml(p)}</span>`).join('')}</div>
    ${s.description ? `<p>${escapeHtml(s.description)}</p>` : '<p class="muted">No description provided.</p>'}
    <p><a href="${escapeAttr(s.detail_url)}" target="_blank" rel="noopener">Open original Eventeny listing</a></p>`;
  els.dialog.showModal();
}

function switchView(view) {
  els.tabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));
  els.views.forEach(v => v.classList.toggle('active', v.id === `${view}View`));
  els.menu.classList.remove('open');
  els.menuButton.setAttribute('aria-expanded', 'false');
  if (view === 'dashboard') renderDashboard();
  if (view === 'bookmarks') renderBookmarks();
}

function clearFilters() {
  filters = { day: '', search: '', location: '', track: '', type: '', bookmarkedOnly: false };
  els.search.value = ''; els.location.value = ''; els.track.value = ''; els.type.value = ''; els.bookmarkedOnly.checked = false;
  buildDayChips(); renderSchedule();
}

function saveBookmarks() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...bookmarks]));
}

function exportBookmarks() {
  const data = JSON.stringify({ app: 'matsuricon-2026', bookmarks: [...bookmarks] }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'matsuricon-2026-bookmarks.json'; a.click();
  URL.revokeObjectURL(url);
}

async function importBookmarks(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.bookmarks;
    if (!Array.isArray(ids)) throw new Error('Invalid bookmark file');
    bookmarks = new Set(ids.map(String).filter(id => sessions.some(s => s.id === id)));
    saveBookmarks(); renderAll(); switchView('dashboard');
  } catch (err) { alert(err.message); }
  event.target.value = '';
}

function logVisit() {
  try {
    const body = JSON.stringify({ path: location.pathname, width: innerWidth, referrer: document.referrer || '' });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/visit', new Blob([body], { type: 'application/json' }));
    else fetch('/api/visit', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch {}
}

function durationHours(s) {
  if (!s.endDate || Number.isNaN(s.endDate)) return 0;
  return Math.max(0, (s.endDate - s.startDate) / 36e5);
}
function unique(arr) { return [...new Set(arr)].sort((a, b) => String(a).localeCompare(String(b))); }
function groupBy(arr, fn) { return arr.reduce((obj, item) => ((obj[fn(item)] ||= []).push(item), obj), {}); }
function shortDate(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }
function empty(msg) { return `<div class="empty">${escapeHtml(msg)}</div>`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function escapeAttr(value = '') { return escapeHtml(value); }
