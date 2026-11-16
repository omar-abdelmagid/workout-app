/* Framework7 owns navigation; app.js remains the owner of workout data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const groups = {
    today: ['home', 'active'],
    programs: ['programSection', 'programDaysSection', 'daySection'],
    history: ['historySection'],
    progress: ['progressSection'],
  };
  const pages = Object.fromEntries([...document.querySelectorAll('.page[data-name]')].map(el => [el.dataset.name, el]));
  const app = new Framework7({
    el: '#app', name: 'Workout', theme: 'ios', darkMode: false,
    colors: { primary: '#171717' },
    view: { removeElements: false, iosSwipeBack: true, browserHistory: false },
    sheet: { backdrop: true, swipeToClose: true, closeOnEscape: true, swipeHandler: '.sheet-handle' },
    on: {
      // Park inactive pages inside the document so existing renderers and backup
      // listeners retain their element IDs and event handlers after a route pop.
      pageBeforeRemove(page) { $('screen-store').append(page.el); },
      pageAfterIn(page) {
        page.el.removeAttribute('inert');
        page.el.querySelector('.page-content').setAttribute('tabindex', '-1');
      },
      pageAfterOut(page) { page.el.setAttribute('inert', ''); },
    },
  });
  const views = {};
  for (const [group, ids] of Object.entries(groups)) {
    views[group] = app.views.create('#view-' + group, {
      name: group, main: group === 'today', url: '/' + ids[0] + '/',
      routes: ids.map(id => ({ path: '/' + id + '/', el: pages[id] })),
    });
  }
  function selectTab(group) {
    app.tab.show('#view-' + group);
    document.querySelectorAll('[data-app-tab]').forEach(button => {
      const selected = button.dataset.appTab === group;
      button.classList.toggle('tab-link-active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  function navigate(id) {
    const group = Object.keys(groups).find(key => groups[key].includes(id));
    if (!group) return;
    selectTab(group);
    const router = views[group].router, path = '/' + id + '/';
    if (router.url === path) return;
    if (!router.allowPageChange) return;
    if (group === 'today' && (id === 'active' || router.url === '/active/')) {
      // Starting/ending a workout replaces the Today stack. A back swipe must
      // never reveal a stale Start button that could overwrite an active session.
      router.navigate(path, { reloadAll: true });
    } else if (router.history.includes(path)) router.back(path);
    else router.navigate(path);
  }
  document.querySelectorAll('[data-app-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.dataset.appTab;
      // app.js resolves Today to the active workout and refreshes data on entry.
      window.dispatchEvent(new CustomEvent('workout-tab', { detail: group }));
    });
  });
  const sheets = {};
  function openSheet(id) {
    const el = $(id);
    sheets[id] ||= app.sheet.create({ el });
    sheets[id].open();
    return sheets[id];
  }
  function closeSheet(id) { sheets[id]?.close(); }
  let weightChanged = null;
  $('sheetWeight').addEventListener('input', event => {
    if (event.target.validity.valid) weightChanged?.(event.target.value);
  });
  $('weightDone').addEventListener('click', () => closeSheet('weightSheet'));
  window.WorkoutUI = {
    navigate, selectTab,
    openSheet, closeSheet,
    editWeight({ name, value, onInput }) {
      $('weightExercise').textContent = name;
      $('sheetWeight').value = value;
      weightChanged = onInput;
      const sheet = openSheet('weightSheet');
      sheet.once('opened', () => { $('sheetWeight').focus(); });
    },
    chooseAlternative({ name, alternative, onSelect }) {
      const actions = app.actions.create({
        buttons: [[
          { text: name, label: true },
          { text: alternative, bold: true, onClick: onSelect },
        ], [{ text: 'Cancel', color: 'gray' }]],
        on: { closed() { actions.destroy(); } },
      });
      actions.open();
    },
    confirm(text, title = 'Workout') {
      return new Promise(resolve => app.dialog.confirm(text, title, () => resolve(true), () => resolve(false)));
    },
  };
  // Exposed for diagnostics without exposing workout data or credentials.
  window.workoutFramework = app;
  selectTab('today');
})();
