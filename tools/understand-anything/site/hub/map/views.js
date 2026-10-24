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
     panel(block, lang, node) string  HTML (escaped by the view) added on top of the block detail; '' for none.
                              node = the block's capability node id ("capability:<id>", #199), null if it has none
   #217 fills VIEWS.health.panel (criteria box), #218 its colours, #223 fills VIEWS.plan. Details: hub README, "Views".
   setCriteria(doc): hands over map/data/criteria.json (optional asset, ORISO-Docs#217); map.js calls it once at start. */
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
      edit: 'Bearbeiten', editFor: 'Datei auf GitHub bearbeiten (Pull Request): ', path: 'Pfad'},
    en: {head: 'Criteria', none: 'No criteria published: the criteria file is missing, the squares stay neutral.',
      unknown: 'No criteria for this area.', rules: 'Criteria file', metric: 'Metric', weight: 'Weight', off: 'off', from: 'from',
      tests: 'Tests', noTests: 'none defined', instr: 'Reviewer instruction', inside: 'Narrower rules inside this area', files: 'Files',
      edit: 'Edit', editFor: 'Edit file on GitHub (opens a pull request): ', path: 'Path'}
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
    var links = Object.keys(used).sort().map(function (id) {
      var url = editUrl(id);
      return '<li><code>' + esc(fileName(id)) + '</code>' + (url ? ' <a data-crit-edit="' + esc(id) + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
        esc(T.editFor + fileName(id)) + '">' + T.edit + '</a>' : '') + '</li>';
    });
    return out + '<div class="crit-k"><h5>' + T.files + '</h5><ul class="crit-f">' + links.join('') + '</ul></div></section>';
  }
  function healthView() {
    var base = comingView({de: 'Gesundheit', en: 'Health'}, {
      de: 'Gesundheit folgt: Die Quadrate bleiben neutral, bis die Prüfläufe angebunden sind.',
      en: 'Health is coming: the squares stay neutral until the health runs are connected.'});
    base.panel = function (block, lang, node) { try { return criteriaBox(block, lang, node); } catch (e) { return '<p class="vnote">' + CT[lang === 'en' ? 'en' : 'de'].unknown + '</p>'; } };
    return base;
  }

  var VIEWS = {
    state: {
      title: {de: 'Zustand', en: 'State'},
      legend: function () { return ''; },
      colour: function () { return null; },
      panel: function () { return ''; }
    },
    health: healthView(),
    plan: comingView({de: 'Plan', en: 'Plan'}, {
      de: 'Plan folgt: Die Quadrate bleiben neutral, bis die Ideen-Ebene angebunden ist.',
      en: 'Plan is coming: the squares stay neutral until the idea layer is connected.'})
  };

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

  return {DEFAULT_VIEW: DEFAULT_VIEW, VIEW_IDS: VIEW_IDS, VIEWS: VIEWS, setCriteria: setCriteria, parseHash: parseHash, buildHash: buildHash};
});
