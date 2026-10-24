/* View switch of the capability map: State | Health | Plan (ORISO-Docs#214, epic #213).
   Classic script (no module syntax) so the page and node --test load the same file.

   Hash: "#view=<state|health|plan>&node=<node id>". The node id is the one of the deep links (#199);
   "#node=<id>" alone is the State view, so every existing link keeps working. The node carries zoom path
   and selection, so switching views keeps the same area open.

   Hooks, one object per view in VIEWS (add a layer by filling in your view, no change to map.js):
     title        {de, en}   label of the switch button
     legend(lang) string     plain text under the map; '' keeps the default legend of the State view
     colour(block) string|null  colour token name (assets/tokens.css, without "--") that fills the squares
                              of this block; null keeps the State layers
     panel(block, lang, node, ctx) string  HTML (escaped by the view) added on top of the block detail; '' for none.
                              ctx (optional) = {hcheck: scopes of the health check, #220}; wrappers forward it
                              node = the block's capability node id ("capability:<id>", #199), null if it has none
     mark(block) boolean       true: the square gets the idea mark (class vmark, set by map.js); ideas of the Plan canvas (#223)
   Idea layer (#223): setIdeas(doc, slugOf) takes map/data/ideas.json, tools(view, lang, labelOf) returns the HTML of the
   tool row above the map (idea list in Plan, "Show ideas" toggle in State and Health), selectIdea/toggleIdeas change it.
   #217 fills VIEWS.health.panel (criteria box), #218 the colours and the run panel (setHealth). Details: hub README, "Views".
   badge(block) {band, text}|null  optional: data for the small score badge of a top-level square (Health); map.js sets data-hband and data-hs from it.
   setCriteria(doc): hands over map/data/criteria.json (optional asset, ORISO-Docs#217); map.js calls it once at start.
   setHealth(doc, slugFn): hands over map/data/health.json (optional asset, ORISO-Docs#218): the latest run record per scope.
   refactor(block, lang) {state, text}|null  optional: the small refactoring marker of a top-level square (Health, ORISO-Docs#222); map.js sets data-rf and data-rft from it.
   setRefactoring(index, slugFn): hands over BoardAgg.refactoring(board, epics) (ORISO-Docs#222): marker on the squares and the "Refactoring" section of the Health panel.
   setSteering(doc): hands over map/data/steering.json (optional asset, ORISO-Docs#221): the Health panel appends a Steering section.
   healthCheck(scopes, lang): HTML of the "Send health check" section for the drilled-in scope (ORISO-Docs#220); in Health only: the block panel
                              gets it through withHealthCheck (ctx.hcheck), folder and file views from map.js. */
(function (root, factory) {
  root.MapViews = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var DEFAULT_VIEW = 'state';
  var VIEW_IDS = ['state', 'health', 'plan'];
  var NODE_MAX = 512;

  function comingView(title, text) {
    function legend(lang) { return text[lang === 'en' ? 'en' : 'de']; }
    return {
      title: title,
      legend: legend,
      colour: function () { return 'neutral'; },
      panel: function (block, lang) { return '<p class="vnote">' + legend(lang) + '</p>'; }
    };
  }


  /* ───────── Health: criteria box (ORISO-Docs#217) ─────────
     Data: criteria.json, built from platform/capabilities/health/*.md by publication.mjs. Every string is escaped,
     the only link is the GitHub web editor for a file of the reviewed criteria set (https guard below). */
  var CRITERIA = null;
  var HAS = Object.prototype.hasOwnProperty;
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function setCriteria(doc) {
    CRITERIA = (isObj(doc) && doc.schemaVersion === 1 && isObj(doc.capabilities) && isObj(doc.files) && isObj(doc.source)) ? doc : null;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }

  var CT = {
    de: {head: 'Kriterien', none: 'Keine Kriterien veröffentlicht: Die Kriteriendatei fehlt, die Quadrate bleiben neutral.',
      unknown: 'Keine Kriterien für diesen Bereich.', rules: 'Regeldatei', metric: 'Kennzahl', weight: 'Gewicht', off: 'aus', from: 'aus',
      tests: 'Tests', noTests: 'keine festgelegt', instr: 'Prüfanweisung', inside: 'Engere Regeln in diesem Bereich', files: 'Dateien',
      edit: 'Bearbeiten', editFor: 'Datei auf GitHub bearbeiten (Pull Request): ', path: 'Pfad',
      perRepo: 'Wirksam je Repository (so bewertet ein Prüflauf)', version: 'Version', same: 'gleich wie oben', latest: 'vom letzten Prüflauf verwendet'},
    en: {head: 'Criteria', none: 'No criteria published: the criteria file is missing, the squares stay neutral.',
      unknown: 'No criteria for this area.', rules: 'Criteria file', metric: 'Metric', weight: 'Weight', off: 'off', from: 'from',
      tests: 'Tests', noTests: 'none defined', instr: 'Reviewer instruction', inside: 'Narrower rules inside this area', files: 'Files',
      edit: 'Edit', editFor: 'Edit file on GitHub (opens a pull request): ', path: 'Path',
      perRepo: 'Effective per repository (what a health run is judged by)', version: 'Version', same: 'same as above', latest: 'used by the latest run'}
  };
  var MT = {
    'size': {de: ['Größe', 'Zeilen je Datei'], en: ['Size', 'lines per file']},
    'test-ratio': {de: ['Testanteil', 'Testzeilen je Codezeile'], en: ['Test ratio', 'test lines per code line']},
    'lint': {de: ['Lint', 'Funde'], en: ['Lint', 'findings']},
    'duplication': {de: ['Duplikate', '% doppelte Zeilen'], en: ['Duplication', '% duplicated lines']},
    'crap': {de: ['CRAP je Funktion', 'Punkte je Funktion'], en: ['CRAP per function', 'points per function']},
    'email-render': {de: ['E-Mail-Darstellung', 'Vorlagen, die nicht rendern'], en: ['E-mail rendering', 'templates that fail to render']},
    'email-links': {de: ['E-Mail-Links', 'defekte Links'], en: ['E-mail links', 'broken links']},
    'email-languages': {de: ['E-Mail-Sprachen', 'Sprachvarianten vorhanden'], en: ['E-mail languages', 'language variants present']}
  };

  var EDIT_REPO = 'OpenResilienceInitiative/ORISO-Docs'; /* the only repository an Edit link may point to */
  /* Edit link: only https://github.com/<owner>/<repo>/edit/dev/<path>, built from validated parts. Anything else: no link. */
  function editUrl(id) {
    var src = CRITERIA.source, f = HAS.call(CRITERIA.files, id) ? CRITERIA.files[id] : null;
    if (!f || typeof src.repository !== 'string' || typeof f.path !== 'string') return null;
    if (src.repository !== EDIT_REPO) return null;
    if (!/^[A-Za-z0-9_.\/-]+$/.test(f.path) || /(^|\/)\.\.?(\/|$)/.test(f.path) || f.path.charAt(0) === '/' || f.path.indexOf('//') >= 0) return null;
    var url = 'https://github.com/' + src.repository + '/edit/dev/' + f.path;
    return /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/edit\/dev\/[A-Za-z0-9_.\/-]+$/.test(url) ? url : null;
  }
  function fileName(id) {
    var f = HAS.call(CRITERIA.files, id) ? CRITERIA.files[id] : null;
    return f && typeof f.path === 'string' ? f.path.replace(/^.*\//, '') : String(id) + '.md';
  }
  function num(n, lang) { var s = String(n); return lang === 'de' ? s.replace('.', ',') : s; }

  function metricRow(name, m, lang, T, origin) {
    var known = HAS.call(MT, name) ? MT[name][lang] : [name, isObj(CRITERIA.metrics) && isObj(CRITERIA.metrics[name]) ? CRITERIA.metrics[name].unit : ''];
    var sign = m.better === 'higher' ? '≥ ' : '≤ ';
    return '<li><span class="crit-n">' + esc(known[0]) + ' <code>' + esc(name) + '</code></span>' +
      '<span class="crit-v">' + sign + esc(num(m.threshold, lang)) + '</span> <span class="crit-u">' + esc(known[1]) + '</span>' +
      '<span class="crit-w">' + T.weight + ' ' + esc(num(m.weight, lang)) + (m.weight === 0 ? ' (' + T.off + ')' : '') + '</span>' +
      (origin ? '<span class="crit-o">' + T.from + ' <code>' + esc(fileName(m.origin)) + '</code></span>' : '') + '</li>';
  }
  function metricList(eff, lang, T, only) {
    var rows = Object.keys(eff.metrics).filter(function (n) { return !only || eff.metrics[n].origin === only; })
      .map(function (n) { return metricRow(n, eff.metrics[n], lang, T, true); });
    return rows.length ? '<ul class="crit-m">' + rows.join('') + '</ul>' : '';
  }
  function origins(eff, into) {
    into[eff.matched] = 1; into[eff.tests.origin] = 1; into[eff.instruction.origin] = 1;
    Object.keys(eff.metrics).forEach(function (n) { into[eff.metrics[n].origin] = 1; });
  }
  /* Effective criteria per repository (criteria.json byRepo, ORISO-Docs#213 review): a run resolves its scope with the path
     "<repo>/", so a frontend repository can be judged by narrower rules than the capability-wide set above. One block per
     repository the capability has code in; the one of the latest run is marked (data-crit-latest). */
  function repoEntry(cap, repo) {
    var c = CRITERIA && HAS.call(CRITERIA.capabilities, cap) ? CRITERIA.capabilities[cap] : null;
    var e = c && isObj(c.byRepo) && HAS.call(c.byRepo, repo) ? c.byRepo[repo] : null;
    return e && isObj(e.effective) && isObj(e.effective.metrics) && typeof e.version === 'string' ? e : null;
  }
  function repoBlocks(c, block, lang, T, used) {
    if (!isObj(c.byRepo)) return '';
    var latest = recordOf(block), wide = c.effective;
    var repos = Object.keys(c.byRepo).sort().filter(function (r) { return /^[A-Za-z0-9_.-]{1,100}$/.test(r) && isObj(c.byRepo[r]) && isObj(c.byRepo[r].effective) && isObj(c.byRepo[r].effective.metrics); });
    if (!repos.length) return '';
    return '<div class="crit-k crit-repos"><h5>' + T.perRepo + '</h5>' + repos.map(function (repo) {
      var x = c.byRepo[repo], e = x.effective, isLatest = !!latest && latest.scope.repo === repo;
      origins(e, used);
      var same = e.matched === wide.matched && JSON.stringify(e.metrics) === JSON.stringify(wide.metrics);
      return '<div class="crit-in" data-crit-repo="' + esc(repo) + '"' + (isLatest ? ' data-crit-latest' : '') + '><p class="crit-meta"><code>' + esc(repo) + '</code> → <code>' + esc(fileName(e.matched)) + '</code>' +
        (typeof x.version === 'string' ? ' · ' + T.version + ' <code title="' + esc(x.version) + '">' + esc(x.version.slice(0, 12)) + '</code>' : '') +
        (isLatest ? ' · <strong>' + T.latest + '</strong>' : '') + '</p>' +
        (same ? '<p class="crit-none">' + T.same + '</p>' : metricList(e, lang, T)) + '</div>';
    }).join('') + '</div>';
  }
  function criteriaBox(block, lang, node) {
    var T = CT[lang === 'en' ? 'en' : 'de'];
    lang = lang === 'en' ? 'en' : 'de';
    if (!CRITERIA) return '<p class="vnote">' + T.none + '</p>';
    var cap = typeof node === 'string' && node.indexOf('capability:') === 0 ? node.slice(11) : null;
    var c = cap !== null && HAS.call(CRITERIA.capabilities, cap) ? CRITERIA.capabilities[cap] : null;
    if (!c || !isObj(c.effective)) return '<p class="vnote">' + T.unknown + '</p>';
    var e = c.effective, used = {};
    origins(e, used);
    var out = '<section class="crit" aria-label="' + T.head + '"><h4 class="crit-h">' + T.head + '</h4>' +
      '<p class="crit-meta">' + T.rules + ' <code>' + esc(fileName(e.matched)) + '</code></p>' + metricList(e, lang, T) +
      '<div class="crit-k"><h5>' + T.tests + ' <span class="crit-o">' + T.from + ' <code>' + esc(fileName(e.tests.origin)) + '</code></span></h5>' +
      (e.tests.list.length ? '<ul>' + e.tests.list.map(function (t) { return '<li><code>' + esc(t) + '</code></li>'; }).join('') + '</ul>' : '<p class="crit-none">' + T.noTests + '</p>') + '</div>' +
      '<div class="crit-k"><h5>' + T.instr + ' <span class="crit-o">' + T.from + ' <code>' + esc(fileName(e.instruction.origin)) + '</code></span></h5>' +
      '<div class="crit-instr">' + esc(e.instruction.text) + '</div></div>';
    var inside = Array.isArray(c.inside) ? c.inside : [];
    if (inside.length) {
      out += '<div class="crit-k"><h5>' + T.inside + '</h5>' + inside.map(function (x) {
        origins(x.effective, used);
        return '<div class="crit-in"><p class="crit-meta">' + T.path + ' <code>' + esc(x.scope) + '</code> → <code>' + esc(fileName(x.file)) + '</code></p>' +
          metricList(x.effective, lang, T, x.file) + '</div>';
      }).join('') + '</div>';
    }
    out += repoBlocks(c, block, lang, T, used);
    var links = Object.keys(used).sort().map(function (id) {
      var url = editUrl(id);
      return '<li><code>' + esc(fileName(id)) + '</code>' + (url ? ' <a data-crit-edit="' + esc(id) + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
        esc(T.editFor + fileName(id)) + '">' + T.edit + '</a>' : '') + '</li>';
    });
    return out + '<div class="crit-k"><h5>' + T.files + '</h5><ul class="crit-f">' + links.join('') + '</ul></div></section>';
  }

  /* ───────── Health: latest run record (ORISO-Docs#218) ─────────
     Data: health.json = { schemaVersion: 1, records: [latest run record per scope] }, built by publication.mjs from health/runs/.
     NO INVENTED DATA: every number on the page is a field of a record. Each number sits in an element with data-from="<path in
     the record>" so a test can trace it; the page computes nothing but the colour band of the overall score (bands in README)
     and the display format (decimal comma in German, 7 characters of the commit). A square without a record, or a record with
     overall null (nothing could be scored), is grey: "no data". Record texts (reasons, sources) are untrusted: text only. */
  var RECORDS = [], HSLUG = function () { return null; };
  var ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, SHA_RE = /^[0-9a-f]{40}$/;
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function txt(x, max) { return typeof x === 'string' && x.length <= max ? x : null; }
  function cleanMetric(m, i) {
    if (!isObj(m) || !txt(m.name, 64) || (m.status !== 'measured' && m.status !== 'not-available') || !isNum(m.threshold)) return null;
    if (m.better !== 'lower' && m.better !== 'higher') return null;
    var measured = m.status === 'measured';
    if (measured && !isNum(m.value)) return null;
    return {
      i: i, name: m.name, status: m.status, value: measured ? m.value : null, threshold: m.threshold, better: m.better, unit: txt(m.unit, 200) || '',
      pass: measured && typeof m.pass === 'boolean' ? m.pass : null, source: txt(m.source, 400) || '',
      reason: !measured && isObj(m.details) ? txt(m.details.reason, 400) : null,
      ciSetup: !measured && isObj(m.details) && CI_STATES.indexOf(m.details.state) >= 0
    };
  }
  /* details.state of a "not available" metric that comes from how the run was set up, not from the code: the scheduled workflow
     never runs the checkouts' eslint (ci-setup) and has no coverage step (no-coverage). ORISO-Docs#213 review, finding 10. */
  var CI_STATES = ['ci-setup', 'no-coverage'];
  function ciNote(r, T) {
    var list = r.metrics.filter(function (m) { return m.ciSetup && m.reason; });
    if (!list.length) return '';
    return '<div class="hk hci" data-ci-note><p class="vnote">' + T.ciHead + '</p><ul class="hci-l">' + list.map(function (m) {
      return '<li><code>' + esc(m.name) + '</code>: ' + from('metrics[' + m.i + '].details.reason', m.reason) + '</li>';
    }).join('') + '</ul></div>';
  }
  function cleanVerdict(v, i) {
    if (!isObj(v) || !txt(v.criterion, 100) || !isNum(v.score) || !Array.isArray(v.reasons)) return null;
    return {i: i, criterion: v.criterion, score: v.score, reasons: v.reasons.map(function (r, j) { return {j: j, text: txt(r, 1000)}; }).filter(function (r) { return r.text; })};
  }
  function cleanRecord(r) {
    if (!isObj(r) || r.schemaVersion !== 1 || !isObj(r.scope) || !isObj(r.run) || !isObj(r.links) || !Array.isArray(r.metrics)) return null;
    var cap = txt(r.scope.capability, 64), repo = txt(r.scope.repo, 100);
    var path = r.scope.path === null ? null : txt(r.scope.path, 300);
    if (!cap || !repo || (r.scope.path !== null && !path)) return null;
    if (!SHA_RE.test(r.commit) || typeof r.startedAt !== 'string' || !ISO_RE.test(r.startedAt)) return null;
    if (r.overall !== null && !(isNum(r.overall) && r.overall >= 0 && r.overall <= 100)) return null;
    var src = /^https:\/\/github\.com\/OpenResilienceInitiative\/[A-Za-z0-9_.-]+\/tree\/[0-9a-f]{40}(?:\/[A-Za-z0-9_.@\/-]+)?$/.test(r.links.source) ? r.links.source : null;
    return {
      scope: {capability: cap, repo: repo, path: path}, commit: r.commit, startedAt: r.startedAt, model: r.model === null ? null : txt(r.model, 100),
      criteriaVersion: txt(r.criteriaVersion, 64) || '', runId: txt(r.run.runId, 64) || '', overall: r.overall,
      metrics: r.metrics.map(cleanMetric).filter(Boolean), verdict: Array.isArray(r.verdict) ? r.verdict.map(cleanVerdict).filter(Boolean) : [],
      source: src, graphNode: txt(r.links.graphNode, 512)
    };
  }
  /* doc: map/data/health.json; slugFn(blockId) -> capability id of the square, or null. */
  function setHealth(doc, slugFn) {
    RECORDS = isObj(doc) && doc.schemaVersion === 1 && Array.isArray(doc.records) ? doc.records.map(cleanRecord).filter(Boolean) : [];
    HSLUG = typeof slugFn === 'function' ? slugFn : function () { return null; };
    HISTORY = cleanHistory(doc);
  }
  function newest(a, b) { return !a || b.startedAt > a.startedAt ? b : a; }
  /* The record a square shows: the newest run of the whole capability (no folder path). */
  function recordOf(block) {
    var cap = block ? HSLUG(block.id) : null, best = null;
    if (!cap) return null;
    RECORDS.forEach(function (r) { if (r.scope.capability === cap && r.scope.path === null) best = newest(best, r); });
    return best;
  }
  function recordsOf(block) {
    var cap = block ? HSLUG(block.id) : null;
    return cap ? RECORDS.filter(function (r) { return r.scope.capability === cap; }) : [];
  }
  function bandOf(score) { return score >= 80 ? 'good' : score >= 60 ? 'fair' : score >= 40 ? 'weak' : 'poor'; }
  function healthColour(block) {
    var r = recordOf(block);
    return r && r.overall !== null ? 'ua-health-' + bandOf(r.overall) : 'neutral';
  }
  function healthBadge(block) {
    var r = recordOf(block);
    return r && r.overall !== null ? {band: bandOf(r.overall), text: String(r.overall)} : null;
  }

  var HT = {
    de: {head: 'Letzter Prüflauf', none: 'Kein Prüflauf für diese Fähigkeit: keine Daten.', noScore: 'Gesamtwert: keine Daten (kein Kriterium konnte bewertet werden).',
      overall: 'Gesamtwert', date: 'Datum', model: 'Modell', noModel: 'keines (nur Kennzahlen)', commit: 'Commit', repo: 'Repository', path: 'Ordner', whole: 'ganze Fähigkeit',
      crit: 'Kriterien-Version', run: 'Lauf', critSet: 'Kriterien des Repositorys', critMatch: 'vom Lauf verwendet', critChanged: 'Kriterien haben sich seit diesem Lauf geändert', metrics: 'Kennzahlen', value: 'Wert', limit: 'Schwelle', met: 'erfüllt', missed: 'nicht erfüllt', na: 'nicht verfügbar',
      src: 'Quelle', verdict: 'Urteil des Modells', score: 'Punkte', links: 'Verweise', github: 'Quelltext auf GitHub', node: 'Graph-Knoten', others: 'Weitere Läufe in dieser Fähigkeit',
      band: {good: 'gut', fair: 'mittel', weak: 'schwach', poor: 'kritisch'},
      ciHead: 'Nicht bewertet wegen der Einrichtung des Laufs, nicht wegen des Codes. Geplante Läufe können Lint und CRAP noch nicht bewerten: Der Job mit dem Modell-Schlüssel führt kein eslint der Repositorys aus, und es gibt keinen Coverage-Schritt.'},
    en: {head: 'Latest health run', none: 'No health run for this capability: no data.', noScore: 'Overall: no data (no criterion could be scored).',
      overall: 'Overall', date: 'Date', model: 'Model', noModel: 'none (metrics only)', commit: 'Commit', repo: 'Repository', path: 'Folder', whole: 'whole capability',
      crit: 'Criteria version', run: 'Run', critSet: 'Criteria of the repository', critMatch: 'used by this run', critChanged: 'criteria changed since this run', metrics: 'Metrics', value: 'Value', limit: 'Threshold', met: 'met', missed: 'not met', na: 'not available',
      src: 'Source', verdict: 'Model verdict', score: 'Score', links: 'Links', github: 'Source on GitHub', node: 'Graph node', others: 'Other runs in this capability',
      band: {good: 'good', fair: 'fair', weak: 'weak', poor: 'critical'},
      ciHead: 'Not scored because of how the run was set up, not because of the code. Scheduled runs cannot score lint and crap yet: the job that holds the model secret never runs the repositories\' eslint, and there is no coverage step.'}
  };
  function from(path, text) { return '<span data-from="' + esc(path) + '">' + esc(text) + '</span>'; }
  function when(iso) { return iso.slice(0, 10) + ' ' + iso.slice(11, 16) + ' UTC'; }
  function metricLabel(name, lang) { return HAS.call(MT, name) ? MT[name][lang][0] : name; }
  function unitLabel(m, lang) { return HAS.call(MT, m.name) ? MT[m.name][lang][1] : m.unit; }

  function runMetrics(r, lang, T) {
    if (!r.metrics.length) return '';
    return '<div class="hk"><h5>' + T.metrics + '</h5><ul class="hmet">' + r.metrics.map(function (m) {
      var at = 'metrics[' + m.i + ']', sign = m.better === 'higher' ? '≥ ' : '≤ ';
      var state = m.status === 'not-available' ? 'na' : m.pass ? 'met' : 'missed';
      return '<li class="hm" data-metric="' + esc(m.name) + '" data-state="' + state + '">' +
        '<span class="crit-n">' + esc(metricLabel(m.name, lang)) + ' <code>' + esc(m.name) + '</code></span>' +
        (m.status === 'measured'
          ? '<span class="hv">' + T.value + ' ' + from(at + '.value', num(m.value, lang)) + '</span>'
          : '<span class="hv">' + esc(T.na) + '</span>') +
        '<span class="hth">' + T.limit + ' ' + sign + from(at + '.threshold', num(m.threshold, lang)) + '</span> <span class="crit-u">' + esc(unitLabel(m, lang)) + '</span>' +
        '<span class="hst">' + esc(state === 'na' ? T.na : state === 'met' ? T.met : T.missed) + '</span>' +
        (m.reason ? '<span class="hrs">' + from(at + '.details.reason', m.reason) + '</span>' : '') +
        (m.source ? '<span class="hsrc">' + T.src + ': ' + from(at + '.source', m.source) + '</span>' : '') + '</li>';
    }).join('') + '</ul></div>';
  }
  function runVerdict(r, lang, T) {
    if (!r.verdict.length) return '';
    return '<div class="hk"><h5>' + T.verdict + '</h5><ul class="hver">' + r.verdict.map(function (v) {
      return '<li><strong data-from="verdict[' + v.i + '].criterion">' + esc(v.criterion) + '</strong> ' + T.score + ' ' + from('verdict[' + v.i + '].score', num(v.score, lang)) +
        '<ul>' + v.reasons.map(function (x) { return '<li>' + from('verdict[' + v.i + '].reasons[' + x.j + ']', x.text) + '</li>'; }).join('') + '</ul></li>';
    }).join('') + '</ul></div>';
  }
  function othersBox(others, lang, T) {
    if (!others.length) return '';
    return '<div class="hk"><h5>' + T.others + '</h5><ul class="hother">' + others.map(function (o) {
      return '<li data-rec-start="' + esc(o.startedAt) + '" data-rec-repo="' + esc(o.scope.repo) + '" data-rec-path="' + esc(o.scope.path === null ? '' : o.scope.path) + '"><code data-from="scope.repo">' + esc(o.scope.repo) + '</code>' +
        (o.scope.path === null ? '' : '/<code data-from="scope.path">' + esc(o.scope.path) + '</code>') + ' <time datetime="' + esc(o.startedAt) + '" data-from="startedAt">' + esc(when(o.startedAt)) + '</time> · ' +
        (o.overall === null ? esc(T.na) : T.overall + ' ' + from('overall', num(o.overall, lang))) + '</li>';
    }).join('') + '</ul></div>';
  }
  /* The criteria set of the record's repository (criteria.json byRepo) next to the record, and whether the run used it. */
  function runCriteria(r, T) {
    var e = CRITERIA ? repoEntry(r.scope.capability, r.scope.repo) : null;
    if (!e) return '';
    var match = r.criteriaVersion === e.version;
    return '<dt>' + T.critSet + '</dt><dd data-run-criteria="' + (match ? 'match' : 'changed') + '"><code>' + esc(fileName(e.effective.matched)) + '</code> · ' +
      esc(match ? T.critMatch : T.critChanged) + '</dd>';
  }
  function runBox(r, lang, T, others) {
    var out = '<section class="hrun" aria-label="' + T.head + '"><h4 class="crit-h">' + T.head + '</h4>';
    if (r.overall === null) out += '<p class="vnote hnos">' + T.noScore + '</p>';
    else out += '<p class="hband" data-hband="' + bandOf(r.overall) + '"><span class="hl">' + T.overall + '</span> <strong class="hscore">' + from('overall', num(r.overall, lang)) + '</strong> ' +
      '<span class="hword">' + esc(T.band[bandOf(r.overall)]) + '</span></p>';
    out += '<dl class="hmeta"><dt>' + T.date + '</dt><dd><time datetime="' + esc(r.startedAt) + '" data-from="startedAt">' + esc(when(r.startedAt)) + '</time></dd>' +
      '<dt>' + T.model + '</dt><dd>' + (r.model === null ? '<span data-from="model">' + esc(T.noModel) + '</span>' : '<code data-from="model">' + esc(r.model) + '</code>') + '</dd>' +
      '<dt>' + T.commit + '</dt><dd><code data-from="commit" title="' + esc(r.commit) + '">' + esc(r.commit.slice(0, 7)) + '</code></dd>' +
      '<dt>' + T.repo + '</dt><dd><code data-from="scope.repo">' + esc(r.scope.repo) + '</code></dd>' +
      '<dt>' + T.path + '</dt><dd>' + (r.scope.path === null ? esc(T.whole) : '<code data-from="scope.path">' + esc(r.scope.path) + '</code>') + '</dd>' +
      (r.criteriaVersion ? '<dt>' + T.crit + '</dt><dd><code data-from="criteriaVersion" title="' + esc(r.criteriaVersion) + '">' + esc(r.criteriaVersion.slice(0, 12)) + '</code></dd>' : '') +
      (r.runId ? '<dt>' + T.run + '</dt><dd><code data-from="run.runId">' + esc(r.runId) + '</code></dd>' : '') + runCriteria(r, T) + '</dl>';
    out += runMetrics(r, lang, T) + ciNote(r, T) + runVerdict(r, lang, T);
    var links = [];
    if (r.source) links.push('<li><a data-health-source href="' + esc(r.source) + '" target="_blank" rel="noopener noreferrer">' + T.github + '</a></li>');
    if (r.graphNode) links.push('<li>' + T.node + ' <code data-from="links.graphNode">' + esc(r.graphNode) + '</code></li>');
    if (links.length) out += '<div class="hk"><h5>' + T.links + '</h5><ul class="hlinks">' + links.join('') + '</ul></div>';
    out += othersBox(others, lang, T);
    return out + '</section>';
  }
  function runPanel(block, lang) {
    lang = lang === 'en' ? 'en' : 'de';
    var T = HT[lang], r = recordOf(block);
    var others = recordsOf(block).filter(function (o) { return o !== r; }).sort(function (a, b) { return a.startedAt < b.startedAt ? 1 : -1; }).slice(0, 8);
    if (!r) return '<p class="vnote hno">' + T.none + '</p>' + othersBox(others, lang, T);
    return runBox(r, lang, T, others);
  }
  function healthView() {
    var base = comingView({de: 'Gesundheit', en: 'Health'}, {de: '', en: ''});
    base.legend = function (lang) {
      var de = lang !== 'en';
      if (!RECORDS.length) return de ? 'Gesundheit: Noch kein Prüflauf veröffentlicht, alle Quadrate sind grau (keine Daten).' : 'Health: no health run published yet, all squares are grey (no data).';
      return de ? 'Gesundheit: Farbe nach Gesamtwert des letzten Prüflaufs (gut ab 80, mittel ab 60, schwach ab 40, sonst kritisch). Grau: keine Daten.'
        : 'Health: colour by the overall score of the latest run (good from 80, fair from 60, weak from 40, otherwise critical). Grey: no data.';
    };
    base.colour = healthColour;
    base.badge = healthBadge;
    base.panel = function (block, lang, node) {
      var run = ''; try { run = runPanel(block, lang); } catch (e) { run = '<p class="vnote">' + HT[lang === 'en' ? 'en' : 'de'].none + '</p>'; }
      var box = ''; try { box = criteriaBox(block, lang, node); } catch (e) { box = '<p class="vnote">' + CT[lang === 'en' ? 'en' : 'de'].unknown + '</p>'; }
      return run + box;
    };
    return base;
  }

  /* ───────── Health: steering comments (ORISO-Docs#221) ─────────
     Data: steering.json (optional asset, built by tools/planning-map/steering.mjs export). Only comments of OWNER, MEMBER and
     COLLABORATOR are exported; the check is repeated here, so a hand-edited file cannot show an outside voice. Every string is
     escaped, links are https links to issues of OpenResilienceInitiative/ORISO-Docs and nothing else. The section is appended to
     the output of the Health panel by withSteering() below, it does not touch the criteria box. */
  var STEERING = null;
  var ST_REPO = 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/';
  var ST_ISSUE = /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Docs\/issues\/[1-9][0-9]*$/;
  var ST_COMMENT = /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Docs\/issues\/[1-9][0-9]*#issuecomment-[0-9]+$/;
  var ST_LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
  var ST_DATE = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  var ST_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var ST_MEMBER = ['OWNER', 'MEMBER', 'COLLABORATOR'];
  function setSteering(doc) {
    STEERING = (isObj(doc) && doc.schemaVersion === 1 && isObj(doc.capabilities)) ? doc : null;
  }
  var ST = {
    de: {head: 'Steuerung', note: 'Hinweise von Mitgliedern für diesen Bereich. Agenten lesen sie vor der Arbeit.', none: 'Noch keine Hinweise von Mitgliedern.',
      add: 'Kommentar auf GitHub hinzufügen', noIssue: 'Für diesen Bereich gibt es noch kein Steuerungs-Issue. Anlegen mit (ohne --apply ist es ein Probelauf):',
      cut: 'gekürzt, ganzer Kommentar auf GitHub', by: 'von'},
    en: {head: 'Steering', note: 'Direction from members for this area. Agents read it before they work.', none: 'No steering comments yet.',
      add: 'Add a comment on GitHub', noIssue: 'There is no steering issue for this area yet. Create it with (without --apply it is a dry run):',
      cut: 'cut short, full comment on GitHub', by: 'by'}
  };
  function stDate(iso, lang) {
    var m = ST_DATE.exec(iso);
    return lang === 'de' ? m[3] + '.' + m[2] + '.' + m[1] : m[1] + '-' + m[2] + '-' + m[3];
  }
  function stComments(list) {
    return (Array.isArray(list) ? list : []).filter(function (c) {
      return isObj(c) && ST_MEMBER.indexOf(c.authorAssociation) >= 0 && typeof c.author === 'string' && ST_LOGIN.test(c.author) &&
        typeof c.createdAt === 'string' && ST_DATE.test(c.createdAt) && typeof c.body === 'string';
    }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0; });
  }
  function steeringBox(lang, node) {
    lang = lang === 'en' ? 'en' : 'de';
    var T = ST[lang];
    var id = typeof node === 'string' && node.indexOf('capability:') === 0 ? node.slice(11) : null;
    if (id === null || id.length > 64 || !ST_ID.test(id)) return '';
    var entry = STEERING && HAS.call(STEERING.capabilities, id) && isObj(STEERING.capabilities[id]) ? STEERING.capabilities[id] : null;
    var url = entry && isObj(entry.issue) && typeof entry.issue.url === 'string' && ST_ISSUE.test(entry.issue.url) ? entry.issue.url : null;
    var out = '<section class="steer" aria-label="' + T.head + '"><h4 class="steer-h">' + T.head + '</h4><p class="steer-note">' + T.note + '</p>';
    if (!url) {
      return out + '<p class="steer-none">' + T.noIssue + '</p><pre class="steer-cmd"><code data-steer-cmd>node tools/planning-map/steering.mjs ensure --capability ' + id + ' --apply</code></pre></section>';
    }
    var list = stComments(entry.comments);
    out += list.length ? '<ul class="steer-l">' + list.map(function (c) {
      var link = typeof c.url === 'string' && ST_COMMENT.test(c.url) ? c.url : null;
      var when = '<time datetime="' + esc(c.createdAt) + '">' + stDate(c.createdAt, lang) + '</time>';
      return '<li class="steer-c"><p class="steer-m"><strong>' + esc(c.author) + '</strong> <span class="steer-o">' + esc(c.authorAssociation.toLowerCase()) + '</span> · ' +
        (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + when + '</a>' : when) + '</p>' +
        '<div class="steer-b">' + esc(c.body.slice(0, 2000)) + '</div>' +
        (c.truncated === true && link ? '<p class="steer-o"><a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + T.cut + '</a></p>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="steer-none">' + T.none + '</p>';
    return out + '<p class="steer-add"><a data-steer-add href="' + esc(url + '#new_comment_field') + '" target="_blank" rel="noopener noreferrer">' + T.add + ' ↗</a></p></section>';
  }
  function withSteering(view) {
    var inner = view.panel;
    view.panel = function (block, lang, node, ctx) {
      var extra = '';
      try { extra = steeringBox(lang, node); } catch (e) { extra = ''; }
      return inner(block, lang, node, ctx) + extra;
    };
  }

  /* ───────── Health: history, comparison, links (ORISO-Docs#219) ─────────
     compareRuns(a, b): a = the earlier run, b = the later one. Each is a full run record (as cleaned for the panel, or raw) or a compact
     history entry of health.json; both have metrics[{name,value,threshold,better,score}], verdict[{criterion,score}] and overall.
     Pure: language free. It returns codes (reasons) and the texts the records carry (notes); historyBox() turns them into DE/EN. */
  function round6(x) { return Math.round(x * 1e6) / 1e6; }
  function dir(delta, better) { return delta === 0 ? 'same' : (delta < 0) === (better === 'lower') ? 'better' : 'worse'; }
  function textsOf(list) {
    return (Array.isArray(list) ? list : []).map(function (x) { return typeof x === 'string' ? x : isObj(x) && typeof x.text === 'string' ? x.text : null; }).filter(Boolean);
  }
  function within(v, t, better) { return better === 'higher' ? v >= t : v <= t; }
  function metricNote(m) { var r = m ? (typeof m.reason === 'string' ? m.reason : isObj(m.details) && typeof m.details.reason === 'string' ? m.details.reason : null) : null; return r ? [r] : []; }
  function compareMetric(x, y) {
    var one = y || x, better = one.better === 'higher' ? 'higher' : 'lower';
    var out = {name: one.name, better: better, from: x && isNum(x.value) ? x.value : null, to: y && isNum(y.value) ? y.value : null, delta: null, direction: 'unknown',
      scoreFrom: x && isNum(x.score) ? x.score : null, scoreTo: y && isNum(y.score) ? y.score : null, scoreDelta: null,
      thresholdFrom: x && isNum(x.threshold) ? x.threshold : null, thresholdTo: y && isNum(y.threshold) ? y.threshold : null, reasons: [], notes: {from: metricNote(x), to: metricNote(y)}};
    if (out.scoreFrom !== null && out.scoreTo !== null) out.scoreDelta = round6(out.scoreTo - out.scoreFrom);
    if (!x) out.reasons.push('only-in-later');
    else if (!y) out.reasons.push('only-in-earlier');
    else if (out.from === null) out.reasons.push('not-measured-before');
    else if (out.to === null) out.reasons.push('not-measured-now');
    else {
      out.delta = round6(out.to - out.from);
      out.direction = dir(out.delta, better);
      var was = out.thresholdFrom !== null && within(out.from, out.thresholdFrom, better), is = out.thresholdTo !== null && within(out.to, out.thresholdTo, better);
      out.reasons.push(out.delta === 0 ? 'unchanged' : !was && is ? 'into-threshold' : was && !is ? 'out-of-threshold' : was ? 'within-both' : 'beyond-both');
    }
    if (x && y && out.thresholdFrom !== out.thresholdTo) out.reasons.push('threshold-changed');
    return out;
  }
  function compareCriterion(x, y) {
    var out = {criterion: (y || x).criterion, from: x && isNum(x.score) ? x.score : null, to: y && isNum(y.score) ? y.score : null, delta: null, direction: 'unknown', reasons: [],
      notes: {from: textsOf(x && x.reasons), to: textsOf(y && y.reasons)}};
    if (!x) out.reasons.push('only-in-later');
    else if (!y) out.reasons.push('only-in-earlier');
    else if (out.from !== null && out.to !== null) { out.delta = round6(out.to - out.from); out.direction = dir(out.delta, 'higher'); out.reasons.push(out.delta === 0 ? 'unchanged' : 'score-changed'); }
    return out;
  }
  function runLike(r) { return isObj(r) && Array.isArray(r.metrics) && (r.overall === null || isNum(r.overall)); }
  function union(a, b, key) {
    var seen = {}, out = [];
    b.concat(a).forEach(function (x) { if (isObj(x) && typeof x[key] === 'string' && !HAS.call(seen, x[key])) { seen[x[key]] = true; out.push(x[key]); } });
    return out;
  }
  function pick(list, key, name) { for (var i = 0; i < list.length; i++) if (isObj(list[i]) && list[i][key] === name) return list[i]; return null; }
  function compareRuns(a, b) {
    if (!runLike(a) || !runLike(b)) return null;
    var va = Array.isArray(a.verdict) ? a.verdict : [], vb = Array.isArray(b.verdict) ? b.verdict : [];
    var metrics = union(a.metrics, b.metrics, 'name').map(function (n) { return compareMetric(pick(a.metrics, 'name', n), pick(b.metrics, 'name', n)); });
    var criteria = union(va, vb, 'criterion').map(function (n) { return compareCriterion(pick(va, 'criterion', n), pick(vb, 'criterion', n)); });
    var overall = {from: a.overall, to: b.overall, delta: null, direction: 'unknown'};
    if (a.overall !== null && b.overall !== null) { overall.delta = round6(b.overall - a.overall); overall.direction = dir(overall.delta, 'higher'); }
    var counts = {better: 0, worse: 0, same: 0, unknown: 0};
    metrics.concat(criteria).forEach(function (x) { counts[x.direction]++; });
    return {overall: overall, metrics: metrics, criteria: criteria, counts: counts,
      criteriaChanged: typeof a.criteriaVersion === 'string' && typeof b.criteriaVersion === 'string' && a.criteriaVersion !== b.criteriaVersion};
  }

  /* History data: health.json "history" = [{scope, total, runs: [compact run, oldest first]}], built by platform/lib/health-run.mjs
     (at most 50 runs per scope). Every field is checked here again; an entry that fails is dropped, never repaired. */
  var HISTORY = [], NODE_LINK = null;
  var FILE_RE = /^health\/runs\/[A-Za-z0-9_.@\/-]+\.json$/, TREE_RE = /^https:\/\/github\.com\/OpenResilienceInitiative\/[A-Za-z0-9_.-]+\/tree\/[0-9a-f]{40}(?:\/[A-Za-z0-9_.@\/-]+)?$/;
  var VIEWER_RE = /^https:\/\/understand\.oriso\.org\//;
  function safePath(p) { return typeof p === 'string' && p.split('/').every(function (seg) { return seg !== '' && seg !== '.' && seg !== '..'; }); }
  function cleanHMetric(m) {
    if (!isObj(m) || !txt(m.name, 64) || (m.better !== 'lower' && m.better !== 'higher') || !isNum(m.threshold)) return null;
    if ((m.value !== null && !isNum(m.value)) || (m.score !== null && !isNum(m.score))) return null;
    return {name: m.name, value: m.value, threshold: m.threshold, better: m.better, score: m.score};
  }
  function cleanHRun(r) {
    if (!isObj(r) || typeof r.startedAt !== 'string' || !ISO_RE.test(r.startedAt) || !SHA_RE.test(r.commit)) return null;
    if (typeof r.file !== 'string' || !FILE_RE.test(r.file) || !safePath(r.file)) return null;
    if (r.overall !== null && !(isNum(r.overall) && r.overall >= 0 && r.overall <= 100)) return null;
    if (!Array.isArray(r.metrics) || !Array.isArray(r.verdict) || (r.model !== null && !txt(r.model, 100))) return null;
    var verdict = r.verdict.map(function (v) { return isObj(v) && txt(v.criterion, 100) && isNum(v.score) ? {criterion: v.criterion, score: v.score} : null; });
    if (verdict.indexOf(null) >= 0) return null;
    var metrics = r.metrics.map(cleanHMetric);
    if (metrics.indexOf(null) >= 0) return null;
    return {file: r.file, startedAt: r.startedAt, commit: r.commit, model: r.model, overall: r.overall, criteriaVersion: txt(r.criteriaVersion, 64) || '', metrics: metrics, verdict: verdict};
  }
  function cleanHistory(doc) {
    var list = isObj(doc) && Array.isArray(doc.history) ? doc.history : [];
    return list.map(function (h) {
      if (!isObj(h) || !isObj(h.scope) || !Array.isArray(h.runs)) return null;
      var cap = txt(h.scope.capability, 64), repo = txt(h.scope.repo, 100);
      var path = h.scope.path === null ? null : txt(h.scope.path, 300);
      if (!cap || !repo || /^\.+$/.test(repo) || !/^[A-Za-z0-9_.-]+$/.test(repo) || (path !== null && (!path || !safePath(path)))) return null;
      var runs = h.runs.map(cleanHRun).filter(Boolean).sort(function (a, b) { return a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0; });
      var total = isNum(h.total) && h.total >= runs.length && Math.floor(h.total) === h.total ? h.total : runs.length;
      return runs.length ? {scope: {capability: cap, repo: repo, path: path}, total: total, runs: runs} : null;
    }).filter(Boolean);
  }
  /* fn(nodeId) -> URL of the Understand viewer for that node (map.js passes its deep-link helper). Anything but https on the viewer host is dropped. */
  function setNodeLink(fn) { NODE_LINK = typeof fn === 'function' ? fn : null; }
  function nodeHref(scope) {
    if (!NODE_LINK) return null;
    var id = scope.path === null ? 'capability:' + scope.capability : scope.repo + '::folder:' + scope.path, u;
    try { u = NODE_LINK(id); } catch (e) { return null; }
    return typeof u === 'string' && VIEWER_RE.test(u) ? u : null;
  }
  function treeHref(scope, commit) {
    var u = 'https://github.com/OpenResilienceInitiative/' + scope.repo + '/tree/' + commit + (scope.path === null ? '' : '/' + scope.path);
    return TREE_RE.test(u) ? u : null;
  }
  function historyOf(r) {
    if (!r) return null;
    for (var i = 0; i < HISTORY.length; i++) {
      var s = HISTORY[i].scope;
      if (s.capability === r.scope.capability && s.repo === r.scope.repo && s.path === r.scope.path) return HISTORY[i];
    }
    return null;
  }

  var HH = {
    de: {head: 'Verlauf', runs: function (n) { return n + (n === 1 ? ' Lauf' : ' Läufe'); }, lastOf: function (n, t) { return 'letzte ' + n + ' von ' + t + ' Läufen'; },
      trend: 'Verlauf des Gesamtwerts', latest: 'letzter Lauf', noScore: 'ohne Wert', noModel: 'keines (nur Kennzahlen)', overall: 'Gesamtwert',
      node: 'Graph-Knoten', source: 'Quelltext auf GitHub', file: 'Laufprotokoll', compare: 'Mit letztem Lauf vergleichen', alone: 'Kein früherer Lauf zum Vergleichen.',
      later: 'letzter Lauf', earlier: 'dieser Lauf', changed: 'Die Kriterien haben sich zwischen den Läufen geändert, der Vergleich gilt mit Vorbehalt.',
      metrics: 'Kennzahlen', criteria: 'Kriterien des Modells', score: 'Punkte', value: 'Wert', limit: 'Schwelle', na: 'nicht verfügbar',
      summary: function (c) { return c.better + ' besser, ' + c.worse + ' schlechter, ' + c.same + ' unverändert, ' + c.unknown + ' nicht vergleichbar'; },
      reasonsLater: 'Begründung (letzter Lauf)', reasonsEarlier: 'Begründung (dieser Lauf)',
      dir: {better: 'besser', worse: 'schlechter', same: 'unverändert', unknown: 'nicht vergleichbar'},
      why: {'into-threshold': 'jetzt innerhalb der Schwelle', 'out-of-threshold': 'jetzt außerhalb der Schwelle', 'within-both': 'in beiden Läufen innerhalb der Schwelle',
        'beyond-both': 'in beiden Läufen außerhalb der Schwelle', unchanged: 'unverändert', 'threshold-changed': 'Schwelle geändert', 'not-measured-before': 'im früheren Lauf nicht messbar',
        'not-measured-now': 'im letzten Lauf nicht messbar', 'only-in-later': 'nur im letzten Lauf', 'only-in-earlier': 'nur im früheren Lauf', 'score-changed': 'Urteil des Modells geändert'}},
    en: {head: 'History', runs: function (n) { return n + (n === 1 ? ' run' : ' runs'); }, lastOf: function (n, t) { return 'last ' + n + ' of ' + t + ' runs'; },
      trend: 'Trend of the overall score', latest: 'latest run', noScore: 'no score', noModel: 'none (metrics only)', overall: 'Overall',
      node: 'Graph node', source: 'Source on GitHub', file: 'Run record', compare: 'Compare with latest', alone: 'No earlier run to compare with.',
      later: 'latest run', earlier: 'this run', changed: 'The criteria changed between the runs; read the comparison with care.',
      metrics: 'Metrics', criteria: 'Criteria judged by the model', score: 'Score', value: 'Value', limit: 'Threshold', na: 'not available',
      summary: function (c) { return c.better + ' better, ' + c.worse + ' worse, ' + c.same + ' unchanged, ' + c.unknown + ' not comparable'; },
      reasonsLater: 'Reasons (latest run)', reasonsEarlier: 'Reasons (this run)',
      dir: {better: 'better', worse: 'worse', same: 'unchanged', unknown: 'not comparable'},
      why: {'into-threshold': 'now within the threshold', 'out-of-threshold': 'now beyond the threshold', 'within-both': 'within the threshold in both runs',
        'beyond-both': 'beyond the threshold in both runs', unchanged: 'unchanged', 'threshold-changed': 'threshold changed', 'not-measured-before': 'could not be measured in the earlier run',
        'not-measured-now': 'could not be measured in the latest run', 'only-in-later': 'only in the later run', 'only-in-earlier': 'only in the earlier run', 'score-changed': 'verdict of the model changed'}}
  };
  var DIR_MARK = {better: '↑', worse: '↓', same: '=', unknown: '?'};
  function signed(d, lang) { return d === null ? '' : d === 0 ? '0' : (d > 0 ? '+' : '−') + num(Math.abs(d), lang); }

  /* The trend: an SVG built with DOM APIs, coloured by CSS classes only (no style attribute). Without a DOM (node tests of other modules) it is left out. */
  var SVGNS = 'http://www.w3.org/2000/svg', TW = 320, TH = 150, TL = 30, TR = 12, TT = 10, TB = 26;
  function svgEl(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, String(attrs[k])); });
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function trendSvg(runs, T, lang) {
    if (typeof document === 'undefined' || !document || typeof document.createElementNS !== 'function') return '';
    var svg = svgEl('svg', {viewBox: '0 0 ' + TW + ' ' + TH, 'class': 'hh-svg', role: 'img', 'aria-label': T.trend + ': ' + T.runs(runs.length) + ', ' + runs[0].startedAt.slice(0, 10) + ' – ' + runs[runs.length - 1].startedAt.slice(0, 10)});
    var t0 = Date.parse(runs[0].startedAt), t1 = Date.parse(runs[runs.length - 1].startedAt), pw = TW - TL - TR, ph = TH - TT - TB;
    function X(r) { return t1 === t0 ? TL + pw / 2 : TL + pw * (Date.parse(r.startedAt) - t0) / (t1 - t0); }
    function Y(s) { return TT + ph * (100 - s) / 100; }
    [0, 40, 60, 80, 100].forEach(function (g) {
      svg.appendChild(svgEl('line', {'class': 'hh-grid', x1: TL, x2: TW - TR, y1: Y(g).toFixed(1), y2: Y(g).toFixed(1)}));
      svg.appendChild(svgEl('text', {'class': 'hh-t hh-ty', x: TL - 4, y: (Y(g) + 3).toFixed(1)}, String(g)));
    });
    var seg = [];
    function flush() { if (seg.length > 1) svg.appendChild(svgEl('polyline', {'class': 'hh-line', points: seg.join(' ')})); seg = []; }
    runs.forEach(function (r) { if (r.overall === null) flush(); else seg.push(X(r).toFixed(1) + ',' + Y(r.overall).toFixed(1)); });
    flush();
    runs.forEach(function (r, i) {
      if (r.overall === null) return;
      var c = svgEl('circle', {'class': 'hh-pt hh-b-' + bandOf(r.overall) + (i === runs.length - 1 ? ' hh-last' : ''), cx: X(r).toFixed(1), cy: Y(r.overall).toFixed(1), r: i === runs.length - 1 ? 5 : 4, 'data-start': r.startedAt});
      c.appendChild(svgEl('title', {}, when(r.startedAt) + ': ' + num(r.overall, lang)));
      svg.appendChild(c);
    });
    svg.appendChild(svgEl('text', {'class': 'hh-t hh-tx', x: runs.length > 1 ? TL : TL + pw / 2, y: TH - 8, 'text-anchor': runs.length > 1 ? 'start' : 'middle'}, runs[0].startedAt.slice(0, 10)));
    if (runs.length > 1) svg.appendChild(svgEl('text', {'class': 'hh-t hh-tx', x: TW - TR, y: TH - 8, 'text-anchor': 'end'}, runs[runs.length - 1].startedAt.slice(0, 10)));
    return svg.outerHTML;
  }

  function sideNotes(list, label) {
    return list.length ? '<span class="hd-n"><em>' + esc(label) + ':</em> ' + list.map(esc).join(' · ') + '</span>' : '';
  }
  function whyText(codes, T, item) {
    return codes.map(function (c) {
      var t = T.why[c] || c;
      return c === 'threshold-changed' ? t + ' (' + num(item.thresholdFrom, T === HH.de ? 'de' : 'en') + ' → ' + num(item.thresholdTo, T === HH.de ? 'de' : 'en') + ')' : t;
    }).join(', ');
  }
  function cmpBox(c, T, lang) {
    var out = '<p class="hd-sum" data-cmp-counts>' + esc(T.summary(c.counts)) + '</p>';
    if (c.criteriaChanged) out += '<p class="vnote hd-warn" data-cmp-changed>' + T.changed + '</p>';
    var o = c.overall;
    out += '<p class="hd hd-o" data-overall-delta="' + (o.delta === null ? '' : o.delta) + '" data-direction="' + o.direction + '"><strong>' + T.overall + '</strong> ' +
      (o.from === null ? esc(T.noScore) : '<span data-cmp-from>' + num(o.from, lang) + '</span>') + ' → ' + (o.to === null ? esc(T.noScore) : '<span data-cmp-to>' + num(o.to, lang) + '</span>') +
      (o.delta === null ? '' : ' <span class="hd-d">' + signed(o.delta, lang) + '</span>') + ' <span class="hd-w"><span aria-hidden="true">' + DIR_MARK[o.direction] + '</span> ' + esc(T.dir[o.direction]) + '</span></p>';
    if (c.metrics.length) out += '<h5 class="hd-h">' + T.metrics + '</h5><ul class="hd-l">' + c.metrics.map(function (m) {
      return '<li class="hd hd-' + m.direction + '" data-metric="' + esc(m.name) + '" data-direction="' + m.direction + '">' +
        '<span class="hd-n1">' + esc(metricLabel(m.name, lang)) + ' <code>' + esc(m.name) + '</code></span> ' +
        '<span class="hd-v">' + (m.from === null ? esc(T.na) : num(m.from, lang)) + ' → ' + (m.to === null ? esc(T.na) : num(m.to, lang)) + '</span>' +
        (m.delta === null ? '' : ' <span class="hd-d">' + signed(m.delta, lang) + '</span>') + ' <span class="hd-w"><span aria-hidden="true">' + DIR_MARK[m.direction] + '</span> ' + esc(T.dir[m.direction]) + '</span>' +
        '<span class="hd-r">' + esc(whyText(m.reasons, T, m)) + '</span>' + sideNotes(m.notes.from, T.earlier) + sideNotes(m.notes.to, T.later) + '</li>';
    }).join('') + '</ul>';
    if (c.criteria.length) out += '<h5 class="hd-h">' + T.criteria + '</h5><ul class="hd-l">' + c.criteria.map(function (m) {
      return '<li class="hd hd-' + m.direction + '" data-criterion="' + esc(m.criterion) + '" data-direction="' + m.direction + '">' +
        '<span class="hd-n1">' + esc(m.criterion) + '</span> <span class="hd-v">' + T.score + ' ' + (m.from === null ? esc(T.na) : num(m.from, lang)) + ' → ' + (m.to === null ? esc(T.na) : num(m.to, lang)) + '</span>' +
        (m.delta === null ? '' : ' <span class="hd-d">' + signed(m.delta, lang) + '</span>') + ' <span class="hd-w"><span aria-hidden="true">' + DIR_MARK[m.direction] + '</span> ' + esc(T.dir[m.direction]) + '</span>' +
        '<span class="hd-r">' + esc(whyText(m.reasons, T, m)) + '</span>' + sideNotes(m.notes.from, T.reasonsEarlier) + sideNotes(m.notes.to, T.reasonsLater) + '</li>';
    }).join('') + '</ul>';
    return out;
  }
  function runItem(r, scope, latest, latestFull, T, lang) {
    var isLast = r === latest, node = nodeHref(scope), src = treeHref(scope, r.commit);
    var out = '<li class="hh-run' + (isLast ? ' hh-isLast' : '') + '" data-run-start="' + esc(r.startedAt) + '"><p class="hh-head"><time datetime="' + esc(r.startedAt) + '" data-from="startedAt">' + esc(when(r.startedAt)) + '</time> ' +
      (isLast ? '<span class="hh-tag">' + T.latest + '</span> ' : '') +
      (r.overall === null ? '<span class="hh-na">' + T.noScore + '</span>' : '<span class="hh-score" data-hband="' + bandOf(r.overall) + '"><span class="hl">' + T.overall + '</span> <strong data-from="overall">' + num(r.overall, lang) + '</strong></span>') +
      '</p><p class="hh-meta">' + (r.model === null ? '<span data-from="model">' + esc(T.noModel) + '</span>' : '<code data-from="model">' + esc(r.model) + '</code>') +
      ' · <code data-from="commit" title="' + esc(r.commit) + '">' + esc(r.commit.slice(0, 7)) + '</code> · <code class="hh-file" data-from="file">' + esc(r.file) + '</code></p>';
    var links = [];
    if (node) links.push('<a data-hh-node href="' + esc(node) + '" target="_blank" rel="noopener noreferrer">' + T.node + ' ↗</a>');
    if (src) links.push('<a data-hh-source href="' + esc(src) + '" target="_blank" rel="noopener noreferrer">' + T.source + ' ↗</a>');
    if (links.length) out += '<p class="hh-links">' + links.join(' ') + '</p>';
    if (!isLast) {
      var c = compareRuns(r, latestFull);
      if (c) out += '<details class="hh-cmp"><summary>' + T.compare + '</summary>' + cmpBox(c, T, lang) + '</details>';
    }
    return out + '</li>';
  }
  /* The section of the Health panel. full = the cleaned latest record the run box shows (has the reasons), used as "after" when it is the newest run. */
  function historyBox(block, lang) {
    lang = lang === 'en' ? 'en' : 'de';
    var T = HH[lang], r = recordOf(block), h = historyOf(r);
    if (!h) return '';
    var runs = h.runs, last = runs[runs.length - 1];
    var full = r && r.startedAt === last.startedAt && r.commit === last.commit ? r : last;
    var out = '<section class="hhist" aria-label="' + T.head + '"><h4 class="crit-h">' + T.head + '</h4><p class="hh-note" data-hh-count>' +
      (h.total > runs.length ? T.lastOf(runs.length, h.total) : T.runs(runs.length)) + '</p>';
    var svg = trendSvg(runs, T, lang);
    if (svg) out += '<figure class="hh-fig">' + svg + '</figure>';
    if (runs.length < 2) out += '<p class="vnote hh-alone">' + T.alone + '</p>';
    out += '<ol class="hh-list">' + runs.slice().reverse().map(function (x) { return runItem(x, h.scope, last, full, T, lang); }).join('') + '</ol>';
    return out + '</section>';
  }
  function withHistory(view) {
    var inner = view.panel;
    view.panel = function (block, lang, node, ctx) {
      var extra = '';
      try { extra = historyBox(block, lang); } catch (e) { extra = ''; }
      return inner(block, lang, node, ctx) + extra;
    };
  }

  /* ───────── Health: "Send health check" (ORISO-Docs#220) ─────────
     One separate section, its own function: healthCheck(scopes, lang). It shows the EXACT command that files a health check
     request for the scope the map is drilled into (capability, folder or file), the same pattern as the release move without
     a transport (plan-ui.js): the static map has no write path, an operator runs the command with their own gh login. The
     command is a dry run; "Copy with --apply" adds --apply. map.js builds the scopes from the open view, copies on [data-copy].
     scopes: [{capability, repo, path: folder|null, kind: 'capability'|'folder'|'file', file?}]. A scope that is not a plain
     capability id, repository name and relative folder gets NO command: nothing is built from text that could carry shell syntax. */
  var HC_RUNNER = 'node tools/planning-map/plan.mjs health-check';
  var HC_CAP = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, HC_REPO = /^[A-Za-z0-9_.-]{1,100}$/, HC_PATH = /^[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)*$/;
  function healthCheckCommand(s, apply) {
    if (!isObj(s) || typeof s.capability !== 'string' || !HC_CAP.test(s.capability) || typeof s.repo !== 'string' || !HC_REPO.test(s.repo)) return null;
    if (s.path !== null && s.path !== undefined) {
      if (typeof s.path !== 'string' || s.path.length > 300 || !HC_PATH.test(s.path) || s.path.split('/').some(function (p) { return p === '.' || p === '..'; })) return null;
    }
    return HC_RUNNER + ' --capability ' + s.capability + ' --repo ' + s.repo + (s.path ? ' --path ' + s.path : '') + (apply ? ' --apply' : '');
  }
  var HCT = {
    de: {head: 'Gesundheitsprüfung senden', note: 'Legt auf GitHub eine Anfrage für diesen Bereich an, die ein Agent oder eine Person abarbeitet. Die Karte schreibt selbst nichts: Der Befehl läuft auf Ihrem Rechner mit Ihrem gh-Login.',
      dry: 'Ohne --apply ist es ein Probelauf und schreibt nichts. Gibt es für den Bereich schon eine offene Anfrage, wird sie gefunden und es entsteht keine zweite.',
      folder: 'Ordner', whole: 'ganze Fähigkeit', file: 'Datei', asFolder: 'Eine Datei wird als ihr Ordner geprüft:', copy: 'Befehl kopieren', copyApply: 'Mit --apply kopieren', none: 'Für diesen Bereich gibt es keinen Befehl.'},
    en: {head: 'Send health check', note: 'Files a request on GitHub for this area, to be picked up by an agent or a person. The map writes nothing itself: the command runs on your machine with your gh login.',
      dry: 'Without --apply it is a dry run and writes nothing. If the area already has an open request, it is found and no second one is made.',
      folder: 'Folder', whole: 'whole capability', file: 'File', asFolder: 'A file is checked as its folder:', copy: 'Copy command', copyApply: 'Copy with --apply', none: 'There is no command for this area.'}
  };
  function healthCheck(scopes, lang) {
    if (!Array.isArray(scopes) || !scopes.length) return '';
    var T = HCT[lang === 'en' ? 'en' : 'de'];
    var items = scopes.map(function (s) {
      var cmd = healthCheckCommand(s, false);
      if (!isObj(s)) return '';
      var where = '<code>' + esc(String(s.repo)) + '</code> · ' + (s.path ? T.folder + ' <code>' + esc(String(s.path)) + '</code>' : T.whole);
      var file = s.kind === 'file' && typeof s.file === 'string' ? '<p class="hcheck-note">' + T.file + ' <code>' + esc(s.file) + '</code>. ' + T.asFolder + '</p>' : '';
      if (!cmd) return '<li class="hcheck-i"><p class="hcheck-w">' + where + '</p><p class="hcheck-note">' + T.none + '</p></li>';
      return '<li class="hcheck-i" data-hcheck-scope="' + esc(s.capability + '/' + s.repo + (s.path ? '/' + s.path : '')) + '"><p class="hcheck-w">' + where + '</p>' + file +
        '<pre class="hcheck-cmd"><code data-hcheck-cmd>' + esc(cmd) + '</code></pre>' +
        '<p class="hcheck-b"><button type="button" class="hcheck-copy" data-copy="' + esc(cmd) + '">' + T.copy + '</button> ' +
        '<button type="button" class="hcheck-copy" data-copy="' + esc(healthCheckCommand(s, true)) + '">' + T.copyApply + '</button></p></li>';
    }).join('');
    return '<section class="hcheck" aria-label="' + esc(T.head) + '" data-hcheck><h4 class="hcheck-h">' + T.head + '</h4><p class="hcheck-note">' + T.note + '</p>' +
      '<ul class="hcheck-l">' + items + '</ul><p class="hcheck-note">' + T.dry + '</p></section>';
  }

  /* The block panel of Health carries the health check section right after the criteria box (ORISO-Docs#220): map.js passes the
     scopes of the open block as ctx.hcheck (4th panel argument, forwarded by every wrapper); folder and file views add it themselves. */
  function withHealthCheck(view) {
    var inner = view.panel;
    view.panel = function (block, lang, node, ctx) {
      var extra = '';
      try { extra = healthCheck(ctx && ctx.hcheck, lang); } catch (e) { extra = ''; }
      return inner(block, lang, node, ctx) + extra;
    };
  }

  /* ───────── Health: refactoring tasks (ORISO-Docs#222) ─────────
     Data: BoardAgg.refactoring(board, epics) of board-agg.js, handed over by map.js through setRefactoring(index, slugFn).
     index = {bySlug: {<capability id>: slot}, byBlock: {<block id>: slot}}, slot = {planned, running, done, total, items[]}.
     NO INVENTED DATA: without a board there is no marker and the panel says the state is unknown; a square without a task has
     no marker either. The marker always carries the state as a word (never colour only). Task links must be https links to an
     issue of OpenResilienceInitiative, anything else is shown as text. Own section function (refactorBox) and own wrapper
     (withRefactoring); the criteria box, the run panel and the steering section are not touched. */
  var RFX = null, RFSLUG = function () { return null; };
  var RF_URL = /^https:\/\/github\.com\/OpenResilienceInitiative\/[A-Za-z0-9_.-]+\/issues\/[1-9][0-9]*$/;
  var RF_SAFE = /^[A-Za-z0-9_.@\/-]+$/;
  var RF_STATES = ['running', 'planned', 'done'];
  var RFT = {
    de: {head: 'Refactoring', word: {planned: 'geplant', running: 'läuft', done: 'erledigt'}, marker: 'Refactoring',
      noBoard: 'Board noch nicht synchronisiert: Der Stand der Refactoring-Aufgaben ist unbekannt.', none: 'Noch keine Refactoring-Aufgabe für diese Fähigkeit.',
      cmd: 'Refactoring für diesen Bereich vorschlagen (ohne --apply ist es ein Probelauf, es wird nichts angelegt):', epic: 'Epic', status: 'Status'},
    en: {head: 'Refactoring', word: {planned: 'planned', running: 'running', done: 'done'}, marker: 'Refactoring',
      noBoard: 'Board not synced yet: the state of the refactoring tasks is unknown.', none: 'No refactoring task yet for this capability.',
      cmd: 'Propose a refactoring for this area (a dry run unless --apply, nothing is created):', epic: 'Epic', status: 'Status'}
  };
  function setRefactoring(index, slugFn) {
    RFX = isObj(index) && (isObj(index.bySlug) || isObj(index.byBlock)) ? index : null;
    RFSLUG = typeof slugFn === 'function' ? slugFn : function () { return null; };
  }
  function rfItems(slot) {
    if (!isObj(slot) || !Array.isArray(slot.items)) return [];
    return slot.items.filter(function (i) { return isObj(i) && RF_STATES.indexOf(i.state) >= 0 && Number.isInteger(i.number) && i.number > 0; });
  }
  /* All tasks of a square: found by their scope (capability id) plus found by the epic mapping (block id). */
  function rfTasks(block) {
    if (!RFX || !block) return [];
    var cap = RFSLUG(block.id), out = [];
    if (cap && isObj(RFX.bySlug) && HAS.call(RFX.bySlug, cap)) out = out.concat(rfItems(RFX.bySlug[cap]));
    if (isObj(RFX.byBlock) && HAS.call(RFX.byBlock, block.id)) out = out.concat(rfItems(RFX.byBlock[block.id]));
    return out;
  }
  function rfCounts(tasks) {
    var c = {planned: 0, running: 0, done: 0};
    tasks.forEach(function (t) { c[t.state]++; });
    return c;
  }
  /* {state, word, text} for the small marker on the square, or null. The word is part of the text. */
  function refactorMarker(block, lang) {
    var tasks = rfTasks(block);
    if (!tasks.length) return null;
    var T = RFT[lang === 'en' ? 'en' : 'de'], c = rfCounts(tasks), state = null;
    RF_STATES.forEach(function (s) { if (!state && c[s] > 0) state = s; });
    return {state: state, word: T.word[state], text: T.marker + ': ' + T.word[state] + (tasks.length > 1 ? ' (' + tasks.length + ')' : '')};
  }
  function rfCommand(block, node) {
    var cap = RFSLUG(block.id) || (typeof node === 'string' && node.indexOf('capability:') === 0 ? node.slice(11) : null);
    if (!cap || !RF_SAFE.test(cap)) return '';
    var scope = cap, rec = '', r = recordOf(block);
    if (r && RF_SAFE.test(r.scope.repo) && (r.scope.path === null || RF_SAFE.test(r.scope.path))) {
      var stamp = r.startedAt.replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '');
      scope += ':' + r.scope.repo + (r.scope.path === null ? '' : ':' + r.scope.path);
      rec = ' --record health/runs/' + cap + '/' + r.scope.repo + '/' + (r.scope.path === null ? '' : 'at/' + r.scope.path + '/') + stamp + '.json';
    }
    return 'node tools/planning-map/plan.mjs propose-refactor --scope ' + scope + rec + ' --epic <Org/Repo#n> [--apply]';
  }
  function refactorBox(block, lang, node) {
    lang = lang === 'en' ? 'en' : 'de';
    var T = RFT[lang], out = '<section class="rfx" data-refactor aria-label="' + T.head + '"><h4 class="rfx-h">' + T.head + '</h4>';
    var tasks = rfTasks(block);
    if (!RFX) out += '<p class="rfx-none">' + T.noBoard + '</p>';
    else if (!tasks.length) out += '<p class="rfx-none">' + T.none + '</p>';
    else {
      var c = rfCounts(tasks);
      out += '<p class="rfx-sum">' + ['planned', 'running', 'done'].map(function (s) { return T.word[s] + ' <strong>' + c[s] + '</strong>'; }).join(' · ') + '</p><ul class="rfx-l">';
      tasks.forEach(function (t) {
        var label = (typeof t.repository === 'string' ? t.repository : '') + ' #' + t.number + (typeof t.title === 'string' && t.title ? ' ' + t.title : '');
        var href = typeof t.url === 'string' && RF_URL.test(t.url) ? t.url : null;
        out += '<li class="rfx-t" data-rf-task="' + t.number + '" data-rf-state="' + t.state + '"><span class="rfx-s" data-rf-word>' + esc(T.word[t.state]) + '</span> ' +
          (href ? '<a data-rf-link href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + ' ↗</a>' : '<span>' + esc(label) + '</span>') +
          (typeof t.status === 'string' && t.status ? ' <span class="rfx-st">' + T.status + ': ' + esc(t.status) + '</span>' : '') + '</li>';
      });
      out += '</ul>';
    }
    var cmd = rfCommand(block, node);
    if (cmd) out += '<p class="rfx-cmdh">' + T.cmd + '</p><pre class="rfx-cmd"><code data-rf-cmd>' + esc(cmd) + '</code></pre>';
    return out + '</section>';
  }
  function withRefactoring(view) {
    var inner = view.panel;
    view.panel = function (block, lang, node, ctx) {
      var extra = '';
      try { extra = refactorBox(block, lang, node); } catch (e) { extra = ''; }
      return inner(block, lang, node, ctx) + extra;
    };
    var legend = view.legend;
    view.legend = function (lang) {
      var base = legend(lang), any = false;
      try { any = !!RFX && (Object.keys(RFX.bySlug || {}).length > 0 || Object.keys(RFX.byBlock || {}).length > 0); } catch (e) { any = false; }
      if (!any) return base;
      return base + (lang === 'en' ? ' Refactoring: a marker in the square says planned, running or done, from the board status of the refactoring tasks.'
        : ' Refactoring: Eine Marke im Quadrat nennt geplant, läuft oder erledigt, nach dem Board-Status der Refactoring-Aufgaben.');
    };
    view.refactor = function (block, lang) { try { return refactorMarker(block, lang); } catch (e) { return null; } };
  }

  /* ───────── Ideas (ORISO-Docs#223) ───────── */
  var FLOW = ['idea', 'discussed', 'specified', 'epic'];
  var FLOW_L = {
    idea: {de: 'Idee', en: 'Idea'}, discussed: {de: 'Besprochen', en: 'Discussed'},
    specified: {de: 'Spezifiziert', en: 'Specified'}, epic: {de: 'Epic', en: 'Epic'}
  };
  var IDEAS = [], slugOf = function () { return null; }, selected = null, shown = false;

  function lg(lang) { return lang === 'en' ? 'en' : 'de'; }
  function str(v, max) { return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null; }
  function pair(o, max) { return o && typeof o === 'object' && str(o.de, max) && str(o.en, max) ? {de: o.de, en: o.en} : null; }
  /* Links come from a generated file, but the page still refuses anything but https links to the two places they may point to. */
  function docsLink(u) { return typeof u === 'string' && /^https:\/\/docs\.oriso\.org\/(?:de|en)\/[a-z0-9\/_-]+$/.test(u) ? u : null; }
  function epicLink(u) { return typeof u === 'string' && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[1-9][0-9]*$/.test(u) ? u : null; }

  function cleanIdea(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = typeof raw.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.id) && raw.id.length <= 64 ? raw.id : null;
    var title = pair(raw.title, 300);
    if (!id || !title || FLOW.indexOf(raw.status) < 0 || !Array.isArray(raw.capabilities)) return null;
    var summary = raw.summary && typeof raw.summary === 'object' ? {de: str(raw.summary.de, 2000) || '', en: str(raw.summary.en, 2000) || ''} : {de: '', en: ''};
    var epic = typeof raw.epic === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[1-9][0-9]*$/.test(raw.epic) ? raw.epic : null;
    return {
      id: id, status: raw.status, title: title, summary: summary,
      capabilities: raw.capabilities.filter(function (c) { return str(c, 64); }),
      pages: {de: docsLink(raw.pages && raw.pages.de), en: docsLink(raw.pages && raw.pages.en)},
      epic: epic, epicUrl: epic ? epicLink(raw.epicUrl) : null,
      draftItems: Number.isInteger(raw.draftItems) && raw.draftItems >= 0 ? raw.draftItems : null
    };
  }
  /* doc: map/data/ideas.json (schemaVersion 1); slugFn(blockId) -> capability id of that square, or null. */
  function setIdeas(doc, slugFn) {
    IDEAS = doc && doc.schemaVersion === 1 && Array.isArray(doc.ideas) ? doc.ideas.map(cleanIdea).filter(Boolean) : [];
    slugOf = typeof slugFn === 'function' ? slugFn : function () { return null; };
    if (selected && !byId(selected)) selected = null;
  }
  function byId(id) { for (var i = 0; i < IDEAS.length; i++) if (IDEAS[i].id === id) return IDEAS[i]; return null; }
  function touches(idea, block) { var s = block && slugOf(block.id); return !!s && idea.capabilities.indexOf(s) >= 0; }
  function touching(block) { return IDEAS.filter(function (i) { return touches(i, block); }); }
  function selectIdea(id) { selected = id && id !== selected && byId(id) ? id : null; }
  function toggleIdeas() { shown = !shown; }
  function markedSquares() { var n = {}; IDEAS.forEach(function (i) { i.capabilities.forEach(function (c) { n[c] = true; }); }); return Object.keys(n).length; }

  function count(n, lang) { return lang === 'en' ? n + (n === 1 ? ' idea' : ' ideas') : n + (n === 1 ? ' Idee' : ' Ideen'); }
  function status(st, lang) { return '<span class="ist ist-' + st + '">' + esc(FLOW_L[st][lg(lang)]) + '</span>'; }
  function link(href, text) { return href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>' : ''; }

  function flow(idea, lang) {
    var at = FLOW.indexOf(idea.status), de = lg(lang) === 'de';
    return '<ol class="iflow" aria-label="' + (de ? 'Fluss der Idee' : 'Flow of the idea') + '">' + FLOW.map(function (st, i) {
      var cls = i < at ? ' is-done' : i === at ? ' is-current' : '';
      var hint = i < at ? (de ? ' (erreicht)' : ' (reached)') : i === at ? (de ? ' (aktuell)' : ' (current)') : '';
      return '<li class="iflow-step' + cls + '"' + (i === at ? ' aria-current="step"' : '') + '><span class="ifn">' + esc(FLOW_L[st][lg(lang)]) + '</span><span class="sr">' + hint + '</span></li>';
    }).join('') + '</ol>';
  }
  function detail(idea, lang, labelOf) {
    var l = lg(lang), de = l === 'de';
    var caps = idea.capabilities.map(function (c) { return '<li class="icap">' + esc((labelOf && labelOf(c)) || c) + '</li>'; }).join('');
    var links = [link(idea.pages.de, de ? 'Seite auf Deutsch' : 'German page'), link(idea.pages.en, de ? 'Seite auf Englisch' : 'English page')];
    if (idea.epic) {
      var drafts = idea.draftItems === null ? '' : ' · ' + (de ? idea.draftItems + (idea.draftItems === 1 ? ' Entwurfs-Eintrag' : ' Entwurfs-Einträge') : idea.draftItems + (idea.draftItems === 1 ? ' draft item' : ' draft items'));
      links.push(idea.epicUrl ? link(idea.epicUrl, (de ? 'Epic ' : 'Epic ') + idea.epic) + esc(drafts) : '<span>' + esc('Epic ' + idea.epic + drafts) + '</span>');
    } else if (idea.draftItems !== null) {
      links.push('<span>' + esc(de ? idea.draftItems + ' Entwurfs-Einträge' : idea.draftItems + ' draft items') + '</span>');
    }
    return '<div class="idetail" id="ideadetail">' +
      '<h3 class="itit">' + esc(idea.title[l]) + ' ' + status(idea.status, l) + '</h3>' +
      (idea.summary[l] ? '<p class="isum">' + esc(idea.summary[l]) + '</p>' : '') + flow(idea, l) +
      '<p class="ilab">' + (de ? 'Berührt diese Fähigkeiten' : 'Touches these capabilities') + '</p><ul class="icaps">' + (caps || '<li class="icap">–</li>') + '</ul>' +
      '<p class="ilinks">' + links.filter(Boolean).join(' · ') + '</p></div>';
  }
  function planTools(lang, labelOf) {
    var l = lg(lang), de = l === 'de';
    if (!IDEAS.length) return '<p class="vnote">' + planLegend(l) + '</p>';
    var items = IDEAS.map(function (i) {
      return '<li><button type="button" class="idea" data-idea="' + esc(i.id) + '" aria-pressed="' + (i.id === selected ? 'true' : 'false') + '">' +
        '<span class="idt">' + esc(i.title[l]) + '</span>' + status(i.status, l) + '</button></li>';
    }).join('');
    var sel = selected && byId(selected);
    return '<div class="ideas"><h3 class="ihead">' + (de ? 'Ideen' : 'Ideas') + ' <span class="icount">' + count(IDEAS.length, l) + '</span></h3>' +
      '<ul class="idealist">' + items + '</ul>' +
      (sel ? detail(sel, l, labelOf) : '<p class="vnote">' + (de ? 'Eine Idee wählen: Die Quadrate, die sie berührt, sind auf der Karte hervorgehoben.' : 'Pick an idea: the squares it touches are highlighted on the map.') + '</p>') + '</div>';
  }
  function toggleTools(lang) {
    if (!IDEAS.length) return '';
    var l = lg(lang), de = l === 'de';
    return '<div class="ideas ideas-toggle"><button type="button" class="tog" data-ideatoggle aria-pressed="' + (shown ? 'true' : 'false') + '">' +
      '<span class="tl">' + (de ? 'Ideen anzeigen' : 'Show ideas') + '</span></button> ' +
      '<span class="vnote">' + (shown ? (de ? count(IDEAS.length, l) + ' auf der Karte markiert (gestrichelter Rahmen).' : count(IDEAS.length, l) + ' marked on the map (dashed frame).')
        : (de ? count(IDEAS.length, l) + ' ausgeblendet.' : count(IDEAS.length, l) + ' hidden.')) + '</span></div>';
  }
  function planLegend(l) {
    if (!IDEAS.length) return l === 'de' ? 'Noch keine Ideen: Eine Ideen-Seite unter product/ideas/ erscheint hier, sobald sie veröffentlicht ist.' : 'No ideas yet: an idea page under product/ideas/ shows up here once it is published.';
    return l === 'de' ? 'Plan: Eine Idee wählen, dann sind die Quadrate hervorgehoben, die sie berührt.' : 'Plan: pick an idea and the squares it touches are highlighted.';
  }
  function planPanel(block, lang) {
    var l = lg(lang), hit = touching(block);
    if (!hit.length) return '';
    return '<div class="vnote ipanel"><strong>' + (l === 'de' ? 'Ideen auf dieser Fähigkeit' : 'Ideas on this capability') + '</strong><ul>' + hit.map(function (i) {
      return '<li>' + esc(i.title[l]) + ' ' + status(i.status, l) + '</li>';
    }).join('') + '</ul></div>';
  }

  var VIEWS = {
    state: {
      title: {de: 'Zustand', en: 'State'},
      legend: function () { return ''; },
      colour: function () { return null; },
      panel: function () { return ''; },
      mark: function (block) { return shown && touching(block).length > 0; },
      tools: toggleTools
    },
    health: healthView(),
    plan: {
      title: {de: 'Plan', en: 'Plan'},
      legend: function (lang) { return planLegend(lg(lang)); },
      colour: function (block) { return selected && touches(byId(selected), block) ? 'brand-wash' : 'neutral'; },
      panel: planPanel,
      mark: function (block) { return !!selected && touches(byId(selected), block); },
      tools: planTools
    }
  };
  VIEWS.health.mark = VIEWS.state.mark;
  VIEWS.health.tools = toggleTools;
  /* Health panel order: run record (#218), criteria box (#217), health check (#220), refactoring (#222), history (#219), steering (#221, last). */
  withHealthCheck(VIEWS.health);
  withRefactoring(VIEWS.health);
  withHistory(VIEWS.health);
  withSteering(VIEWS.health);

  function decode(s) { try { return decodeURIComponent(s); } catch (e) { return null; } }
  function validNode(id) { return id !== null && id.length > 0 && id.length <= NODE_MAX && !/[\u0000-\u001f\u007f]/.test(id); }

  /* "&" only separates when a known key follows, so a legacy "#node=" id with a raw "&" survives. */
  function parseHash(hash) {
    var out = {view: DEFAULT_VIEW, node: null, hasView: false};
    var h = String(hash || '').replace(/^#/, '');
    if (!h) return out;
    h.split(/&(?=(?:view|node)=)/).forEach(function (part) {
      var i = part.indexOf('='); if (i < 0) return;
      var k = part.slice(0, i), v = part.slice(i + 1);
      if (k === 'view') { if (VIEW_IDS.indexOf(v) >= 0) { out.view = v; out.hasView = true; } }
      else if (k === 'node') { var d = decode(v); out.node = validNode(d) ? d : null; }
    });
    return out;
  }

  function buildHash(view, node) {
    var parts = [];
    if (VIEW_IDS.indexOf(view) > 0) parts.push('view=' + view);
    if (node) parts.push('node=' + encodeURIComponent(node));
    return parts.length ? '#' + parts.join('&') : '';
  }

  /* HTML of the tool row above the map for this view ('' for none). */
  function tools(view, lang, labelOf) { var v = VIEWS[view]; return v && v.tools ? v.tools(lang, labelOf) : ''; }

  return {
    DEFAULT_VIEW: DEFAULT_VIEW, VIEW_IDS: VIEW_IDS, VIEWS: VIEWS, setCriteria: setCriteria, setHealth: setHealth, healthBand: bandOf, parseHash: parseHash, buildHash: buildHash,
    setSteering: setSteering, healthCheck: healthCheck, healthCheckCommand: healthCheckCommand, setRefactoring: setRefactoring,
    compareRuns: compareRuns, setNodeLink: setNodeLink, setIdeas: setIdeas, ideaCount: function () { return IDEAS.length; }, selectIdea: selectIdea, selectedIdea: function () { return selected; },
    toggleIdeas: toggleIdeas, showIdeas: function () { return shown; }, markedCapabilities: markedSquares, tools: tools
  };
});
