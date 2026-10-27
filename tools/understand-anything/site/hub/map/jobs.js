/* Agent jobs on the capability map (ORISO-Docs#216, epic #213).
   Classic script (no module syntax) so the page and node --test load the same file.
   Input: board.json items with `job` (tools/planning-map/lib/job.mjs, exported from the marked section of the
   issue description) and the finding `job-stale`; the epics data of the map. The map only renders what the export
   wrote: private, draft and redacted items never reach board.json items, so they have no job here either.
   Everything that comes from board.json is escaped; links must be https, anything else stays text. */
(function (root, factory) {
  root.MapJobs = factory(root);
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  var FILTERS = ['all', 'running', 'stopped', 'waiting-human', 'stale'];
  var STATES = ['running', 'waiting-human', 'stopped', 'failed', 'done'];
  var TXT = {
    de: {
      state: {running: 'läuft', stopped: 'gestoppt', 'waiting-human': 'wartet auf Mensch', done: 'fertig', failed: 'fehlgeschlagen'},
      count: {running: 'laufend', stopped: 'gestoppt', 'waiting-human': 'wartend auf Mensch', done: 'fertig', failed: 'fehlgeschlagen'},
      stale: 'veraltet', job: 'Job', jobs: 'Jobs', all: 'Alle', open: 'Agent-Jobs zeigen',
      filters: {all: 'Alle', running: 'laufend', stopped: 'gestoppt', 'waiting-human': 'wartet auf Mensch', stale: 'veraltet'},
      where: 'Wo', started: 'Gestartet', updated: 'Aktualisiert', model: 'Modell', next: 'Nächster Schritt', report: 'Bericht', branches: 'Branches', prs: 'Pull Requests',
      local: 'lokal', cloud: 'Cloud', title: 'Agent-Jobs', source: 'Vom Agenten in der Beschreibung des Issues gemeldet, nicht von GitHub geprüft.',
      staleLine: function (d) { return 'veraltet: seit ' + d.hours + ' Std. keine Aktualisierung (Grenze ' + d.threshold + ' Std.)'; }
    },
    en: {
      state: {running: 'running', stopped: 'stopped', 'waiting-human': 'waiting for a human', done: 'done', failed: 'failed'},
      count: {running: 'running', stopped: 'stopped', 'waiting-human': 'waiting for a human', done: 'done', failed: 'failed'},
      stale: 'stale', job: 'Job', jobs: 'Jobs', all: 'All', open: 'Show agent jobs',
      filters: {all: 'All', running: 'running', stopped: 'stopped', 'waiting-human': 'waiting for a human', stale: 'stale'},
      where: 'Where', started: 'Started', updated: 'Updated', model: 'Model', next: 'Next step', report: 'Report', branches: 'Branches', prs: 'Pull requests',
      local: 'local', cloud: 'cloud', title: 'Agent jobs', source: 'Reported by the agent in the issue description, not checked by GitHub.',
      staleLine: function (d) { return 'stale: no update for ' + d.hours + ' h (limit ' + d.threshold + ' h)'; }
    }
  };
  function tx(lang) { return TXT[lang === 'en' ? 'en' : 'de']; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function repoName(full) { var i = String(full || '').lastIndexOf('/'); return i < 0 ? String(full || '') : full.slice(i + 1); }
  function key(repo, n) { return repoName(repo) + '#' + n; }
  function isHttps(u) { return /^https:\/\//.test(u || ''); }
  function link(url, text) { return isHttps(url) ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(text) + '</a>' : '<span class="nolink">' + esc(text) + '</span>'; }
  function when(iso) { var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso || ''); return m ? m[1] + ' ' + m[2] + ' UTC' : ''; }

  function entryOf(it) {
    var st = null;
    (it.findings || []).forEach(function (f) { if (f.rule === 'job-stale') st = {hours: f.detail && f.detail.hours, threshold: f.detail && f.detail.threshold}; });
    return {repository: repoName(it.repository), number: it.number, title: it.title, url: it.url, job: it.job, stale: st};
  }

  /* Epic membership is the one of the branch sums: BoardAgg.epicMembers (board-agg.js, loaded before this file on the page).
     Returns null when no item has a job. */
  function index(board, epics) {
    var items = (board && board.items) || [], byItem = {}, any = false, BA = root.BoardAgg;
    items.forEach(function (it) {
      if (it.contentType !== 'Issue' || !it.repository || typeof it.number !== 'number' || !it.job) return;
      any = true; byItem[key(it.repository, it.number)] = entryOf(it);
    });
    if (!any) return null;
    var kids = BA.childIndex(board), has = function (k) { return !!byItem[k]; };
    var byEpic = {};
    ((epics && epics.epics) || []).forEach(function (e, i) {
      var list = BA.epicMembers(board, epics, i, has, kids).map(function (k) { return byItem[k]; });
      list.sort(function (a, b) { return a.number - b.number; });
      var counts = {running: 0, stopped: 0, 'waiting-human': 0, done: 0, failed: 0}, stale = 0;
      list.forEach(function (x) { counts[x.job.state]++; if (x.stale) stale++; });
      byEpic[i] = {total: list.length, counts: counts, stale: stale, issues: list};
    });
    return {byItem: byItem, byEpic: byEpic};
  }

  function matches(filter, x) {
    if (filter === 'all') return true;
    if (!x) return false;
    return filter === 'stale' ? !!x.stale : x.job.state === filter;
  }

  /* ref: "item:<Repo>#<n>" or "epic:<index>", the same refs as the branch badge. */
  function refEntry(idx, ref) {
    var m = idx && /^(epic|item):(.+)$/.exec(typeof ref === 'string' ? ref : '');
    if (!m) return null;
    if (m[1] === 'item') { var x = idx.byItem[m[2]]; return x ? {kind: 'item', entry: x} : null; }
    var s = idx.byEpic[+m[2]]; return s && s.total ? {kind: 'epic', epic: s} : null;
  }

  function badgeHTML(idx, ref, lang) {
    var r = refEntry(idx, ref), t = tx(lang);
    if (!r) return '';
    var label, attrs;
    if (r.kind === 'item') {
      var x = r.entry;
      label = t.job + ': ' + t.state[x.job.state] + (x.stale ? ' · ' + t.stale : '');
      attrs = ' data-job-state="' + esc(x.job.state) + '"' + (x.stale ? ' data-job-stale="1"' : '');
    } else {
      var c = r.epic.counts, parts = [];
      if (c.running) parts.push(c.running + ' ' + t.count.running);
      if (r.epic.stale) parts.push(r.epic.stale + ' ' + t.stale);
      ['waiting-human', 'stopped', 'failed'].forEach(function (s) { if (c[s]) parts.push(c[s] + ' ' + t.count[s]); });
      if (!parts.length && c.done) parts.push(c.done + ' ' + t.count.done); /* finished jobs are no call for attention: named only when nothing else is left */
      label = t.jobs + ': ' + parts.join(' · ');
      attrs = ' data-job-state="' + (c.running ? 'running' : c['waiting-human'] ? 'waiting-human' : c.failed ? 'failed' : c.stopped ? 'stopped' : 'done') + '"' + (r.epic.stale ? ' data-job-stale="1"' : '');
    }
    return '<button type="button" class="wkbadge jobbadge" data-work="' + esc(ref) + '"' + attrs + ' aria-haspopup="dialog" title="' + esc(t.open) + '">' + esc(label) + '</button>';
  }

  function jobCard(x, head, t) {
    var j = x.job, dl = '';
    function row(k, v) { if (v) dl += '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }
    row(t.where, esc(t[j.runner] || j.runner) + (j.machine ? ' · ' + esc(j.machine) : ''));
    row(t.started, esc(when(j.started)));
    row(t.updated, esc(when(j.updated)));
    row(t.model, j.model ? esc(j.model) : '');
    row(t.next, j.next ? esc(j.next) : '');
    row(t.report, j.report ? link(j.report, String(j.report).replace(/^https:\/\//, '')) : '');
    row(t.branches, (j.branches || []).length ? (j.branches || []).map(function (b) { return '<code>' + esc(b) + '</code>'; }).join(' ') : '');
    row(t.prs, (j.prs || []).length ? (j.prs || []).map(esc).join(', ') : '');
    return '<div class="jobcard" data-job-state="' + esc(j.state) + '">' +
      (head ? '<h4>' + link(x.url, x.title) + ' <span class="c">' + esc(x.repository.replace('ORISO-', '')) + ' #' + x.number + '</span></h4>' : '') +
      '<p class="jobline"><span class="jobpill" data-job-state="' + esc(j.state) + '">' + esc(t.state[j.state] || j.state) + '</span>' +
      (x.stale ? ' <span class="jobpill" data-job-stale="1">' + esc(t.stale) + '</span>' : '') + '</p>' +
      (x.stale ? '<p class="dmeta jobstale">' + esc(t.staleLine(x.stale)) + '</p>' : '') +
      '<dl class="jobdl">' + dl + '</dl></div>';
  }

  /* Block for the top of #workdlg. */
  function popupHTML(idx, ref, lang) {
    var r = refEntry(idx, ref), t = tx(lang);
    if (!r) return '';
    var cards = r.kind === 'item' ? jobCard(r.entry, false, t) : r.epic.issues.map(function (x) { return jobCard(x, true, t); }).join('');
    return '<div class="jobs"><h5 class="wkh">' + esc(t.title) + '</h5>' + cards + '<p class="dmeta">' + esc(t.source) + '</p></div>';
  }

  /* Lets the pop-up open for an issue that has a job but no branches or PRs. */
  function stub(idx, ref) {
    var r = refEntry(idx, ref);
    if (!r) return null;
    var s = {kind: r.kind, branches: 0, prs: 0, hidden: 0, issues: []};
    if (r.kind === 'item') s.title = '#' + r.entry.number + ' ' + r.entry.title;
    return s;
  }

  /* ev = BoardAgg.epicView(...): groups of items by status. Returns the same shape with the groups cut down to the
     jobs filter, and the counts of every filter over what the status and gate filters leave. */
  function applyFilter(ev, idx, filter, epicIndex) {
    var s = idx && idx.byEpic[epicIndex], counts = {all: 0, running: 0, stopped: 0, 'waiting-human': 0, stale: 0};
    var avail = !!(s && s.total);
    if (FILTERS.indexOf(filter) < 0 || !avail) filter = 'all';
    (ev.groups || []).forEach(function (g) {
      g.items.forEach(function (it) {
        counts.all++;
        var x = avail ? idx.byItem[key(it.repository, it.number)] : null;
        FILTERS.forEach(function (f) { if (f !== 'all' && matches(f, x)) counts[f]++; });
      });
    });
    if (!avail || filter === 'all') return {available: avail, filter: filter, counts: counts, ev: ev};
    var out = {};
    Object.keys(ev).forEach(function (k) { out[k] = ev[k]; });
    out.groups = [];
    ev.groups.forEach(function (g) {
      var keep = g.items.filter(function (it) { return matches(filter, idx.byItem[key(it.repository, it.number)]); });
      if (!keep.length) return;
      var c = {}; Object.keys(g).forEach(function (k) { c[k] = g[k]; });
      c.items = keep; c.count = keep.length; out.groups.push(c);
    });
    return {available: avail, filter: filter, counts: counts, ev: out};
  }

  function filterHTML(r, lang) {
    if (!r || !r.available) return '';
    var t = tx(lang);
    return '<div class="efilters jfilters" role="group" aria-label="' + esc(t.jobs) + '"><span class="jlab">' + esc(t.jobs) + '</span>' + FILTERS.map(function (f) {
      return '<button type="button" class="tog efilt" data-jfilter="' + f + '" aria-pressed="' + (r.filter === f) + '"><span class="tl">' + esc(t.filters[f]) + '</span> <span class="c">' + r.counts[f] + '</span></button>';
    }).join('') + '</div>';
  }

  return {FILTERS: FILTERS, STATES: STATES, index: index, matches: matches, badgeHTML: badgeHTML, popupHTML: popupHTML, stub: stub, applyFilter: applyFilter, filterHTML: filterHTML, has: function (idx, ref) { return !!refEntry(idx, ref); }};
});
