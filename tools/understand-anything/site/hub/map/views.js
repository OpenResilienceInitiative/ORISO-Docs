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
     panel(block, lang) string  HTML (escaped by the view) added on top of the block detail; '' for none
     mark(block) boolean       true: the square gets the idea mark (class vmark, set by map.js); ideas of the Plan canvas (#223)
   Idea layer (#223): setIdeas(doc, slugOf) takes map/data/ideas.json, tools(view, lang, labelOf) returns the HTML of the
   tool row above the map (idea list in Plan, "Show ideas" toggle in State and Health), selectIdea/toggleIdeas change it.
   #217/#218 fill VIEWS.health. Details: hub README, "Views". */
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


  /* ───────── Ideas (ORISO-Docs#223) ───────── */
  var FLOW = ['idea', 'discussed', 'specified', 'epic'];
  var FLOW_L = {
    idea: {de: 'Idee', en: 'Idea'}, discussed: {de: 'Besprochen', en: 'Discussed'},
    specified: {de: 'Spezifiziert', en: 'Specified'}, epic: {de: 'Epic', en: 'Epic'}
  };
  var IDEAS = [], slugOf = function () { return null; }, selected = null, shown = false;

  function lg(lang) { return lang === 'en' ? 'en' : 'de'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
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
    health: comingView({de: 'Gesundheit', en: 'Health'}, {
      de: 'Gesundheit folgt: Die Quadrate bleiben neutral, bis die Prüfläufe angebunden sind.',
      en: 'Health is coming: the squares stay neutral until the health runs are connected.'}),
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
    DEFAULT_VIEW: DEFAULT_VIEW, VIEW_IDS: VIEW_IDS, VIEWS: VIEWS, parseHash: parseHash, buildHash: buildHash,
    setIdeas: setIdeas, ideaCount: function () { return IDEAS.length; }, selectIdea: selectIdea, selectedIdea: function () { return selected; },
    toggleIdeas: toggleIdeas, showIdeas: function () { return shown; }, markedCapabilities: markedSquares, tools: tools
  };
});
