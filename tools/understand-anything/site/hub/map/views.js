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
     mark(block) boolean       true: the square gets the idea mark (class vmark, set by map.js); ideas of the Plan canvas (#223)
   Idea layer (#223): setIdeas(doc, slugOf) takes map/data/ideas.json, tools(view, lang, labelOf) returns the HTML of the
   tool row above the map (idea list in Plan, "Show ideas" toggle in State and Health), selectIdea/toggleIdeas change it.
   #217 fills VIEWS.health.panel (criteria box), #218 its colours. Details: hub README, "Views".
   setCriteria(doc): hands over map/data/criteria.json (optional asset, ORISO-Docs#217); map.js calls it once at start.
   setSteering(doc): hands over map/data/steering.json (optional asset, ORISO-Docs#221): the Health panel appends a Steering section. */
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
    view.panel = function (block, lang, node) {
      var extra = '';
      try { extra = steeringBox(lang, node); } catch (e) { extra = ''; }
      return inner(block, lang, node) + extra;
    };
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
    DEFAULT_VIEW: DEFAULT_VIEW, VIEW_IDS: VIEW_IDS, VIEWS: VIEWS, setCriteria: setCriteria, setSteering: setSteering, parseHash: parseHash, buildHash: buildHash,
    setIdeas: setIdeas, ideaCount: function () { return IDEAS.length; }, selectIdea: selectIdea, selectedIdea: function () { return selected; },
    toggleIdeas: toggleIdeas, showIdeas: function () { return shown; }, markedCapabilities: markedSquares, tools: tools
  };
});
